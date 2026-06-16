import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Cat from "@/models/cat";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Template from "@/models/template";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/product-category?catId=<id>
 *   Returns the ancestor chain: [{ _id, title, slug }, ...] root → leaf
 *
 * GET /api/product-category?catSlug=<slug>
 *   Returns:
 *     products    — published products in this category + all sub-categories
 *     subCats     — direct child categories
 *     activeBox   — { label, pluginNx } of the active product-box template
 *                   (null if none set in DB)
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);

        // ── Ancestor chain ──────────────────────────────────────────────────
        const catId = searchParams.get("catId");
        if (catId) {
            if (!mongoose.Types.ObjectId.isValid(catId)) {
                return NextResponse.json({ path: [] });
            }
            const path = await buildAncestorPath(catId);
            return NextResponse.json({ path });
        }

        // ── Products + sub-cats ─────────────────────────────────────────────
        const catSlug = searchParams.get("catSlug");
        if (catSlug) {
            const cat = await Cat.findOne({
                slug: catSlug,
                type: "product-category",
            }).lean() as any;

            if (!cat) {
                return NextResponse.json({
                    products: [], subCats: [], activeBox: null,
                });
            }

            // All descendant category IDs (inclusive)
            const allCatIds = await getDescendantIds(String(cat._id));

            // Products in any of these categories
            const posts = await Post.find({
                category: { $in: allCatIds },
                type:     "product",
                status:   "published",
            }).lean() as any[];

            // Batch-fetch all post infos
            const infoRecords = await PostInfo.find({
                postId: { $in: posts.map((p: any) => p._id) },
            }).lean() as any[];

            const infoByPost: Record<string, Record<string, string>> = {};
            for (const r of infoRecords) {
                const key = String(r.postId);
                if (!infoByPost[key]) infoByPost[key] = {};
                infoByPost[key][r.name] = r.value;
            }

            const products = posts.map((p: any) => ({
                _id:   String(p._id),
                title: p.title ?? "",
                slug:  p.slug  ?? "",
                info:  infoByPost[String(p._id)] ?? {},
            }));

            // Direct child categories
            const subCats = (await Cat.find({
                parentId: cat._id,
                type:     "product-category",
                status:   "published",
            }).lean() as any[]).map((c: any) => ({
                _id:   String(c._id),
                title: c.title ?? "",
                slug:  c.slug  ?? "",
            }));

            // Active product-box template from DB
            const activeBoxDoc = await Template.findOne({
                type:      "product-box",
                isDefault: true,
            }).lean() as any;

            const activeBox = activeBoxDoc
                ? { label: activeBoxDoc.label, pluginNx: activeBoxDoc.pluginNx }
                : null;

            return NextResponse.json({ products, subCats, activeBox });
        }

        return NextResponse.json(
            { error: "Missing param: catId or catSlug" },
            { status: 400 }
        );
    } catch (err) {
        console.error("product-category API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildAncestorPath(
    catId: string
): Promise<{ _id: string; title: string; slug: string }[]> {
    const chain: { _id: string; title: string; slug: string }[] = [];
    let current: any = await Cat.findById(catId).lean();
    while (current) {
        chain.unshift({
            _id:   String(current._id),
            title: current.title ?? "",
            slug:  current.slug  ?? "",
        });
        if (!current.parentId) break;
        current = await Cat.findById(current.parentId).lean();
    }
    return chain;
}

async function getDescendantIds(
    catId: string
): Promise<mongoose.Types.ObjectId[]> {
    const result: mongoose.Types.ObjectId[] = [
        new mongoose.Types.ObjectId(catId),
    ];
    const queue = [catId];
    while (queue.length > 0) {
        const parentId = queue.shift()!;
        const children = await Cat
            .find({ parentId })
            .select("_id")
            .lean() as any[];
        for (const c of children) {
            result.push(c._id);
            queue.push(String(c._id));
        }
    }
    return result;
}
