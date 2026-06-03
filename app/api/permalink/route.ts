import connectDB from "@/lib/mongodb";
import Permalink from "@/models/permalink";
import { getPostTypes } from "@/hook/PostType";
import { getCatTypes } from "@/hook/CategoryType";
import type { NextRequest } from "next/server";

// ─── Default prefix logic ─────────────────────────────────────────────────────
// Post type  "blog"             → prefix "blog"             → /blog/[slug]
// Post type  "page"             → prefix "page"             → /page/[slug]
// Cat type   "blog-category"    → prefix "blog/category"    → /blog/category/[slug]
// Cat type   "product-category" → prefix "product/category" → /product/category/[slug]

function defaultPostPrefix(key: string): string {
    return key; // e.g. "blog", "page", "product"
}

function defaultCatPrefix(key: string, postType: string): string {
    return `${postType}/category`; // e.g. "blog/category"
}

/**
 * Ensure every registered post type and category type has a permalink record.
 * Uses insertMany with ordered:false so existing docs (unique index) are skipped
 * without throwing. Idempotent — safe to call on every GET.
 */
async function ensureDefaults(): Promise<void> {
    const postTypes = getPostTypes();
    const catTypes = getCatTypes();

    const toInsert = [
        ...postTypes.map((pt) => ({
            contentType: pt.key,
            prefix: defaultPostPrefix(pt.key),
        })),
        ...catTypes.map((ct) => ({
            contentType: ct.key,
            prefix: defaultCatPrefix(ct.key, ct.postType),
        })),
    ];

    if (toInsert.length === 0) return;

    // ordered:false → skip duplicates (E11000) without aborting the batch
    try {
        await Permalink.insertMany(toInsert, { ordered: false });
    } catch {
        // Duplicate key errors are expected and safe to ignore
    }
}

// ─── GET  /api/permalink ──────────────────────────────────────────────────────
// Seeds defaults on first call, then returns all configs as { [contentType]: prefix }
export async function GET() {
    try {
        await connectDB();
        await ensureDefaults();
        const docs = await Permalink.find({}).lean();
        const map: Record<string, string> = {};
        (docs as any[]).forEach((d) => { map[d.contentType] = d.prefix; });
        return Response.json(map);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── PUT  /api/permalink ──────────────────────────────────────────────────────
// Body: { contentType: string, prefix: string }
// Upserts a single permalink config.
export async function PUT(request: NextRequest) {
    try {
        await connectDB();
        const { contentType, prefix } = await request.json() as {
            contentType: string;
            prefix: string;
        };

        if (!contentType) {
            return Response.json({ error: "contentType is required" }, { status: 400 });
        }

        const doc = await Permalink.findOneAndUpdate(
            { contentType },
            { prefix: prefix ?? "" },
            { upsert: true, new: true }
        );

        return Response.json({ permalink: doc });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}
