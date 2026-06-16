import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Permalink from "@/models/permalink";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/compare?ids=<id1,id2>&current=<currentId>
 *
 * Returns:
 *   current          — the product being viewed
 *   compareProducts  — the pre-selected compare products
 *   categoryProducts — all other published products in the same category
 *
 * Each product includes a `url` field built from the actual permalink
 * prefix stored in the DB (admin-configurable), so the Compare component
 * never needs to know the URL structure.
 *
 * All info records are fetched in a single batch query ($in) — no N+1.
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const idsParam     = searchParams.get("ids")     ?? "";
        const currentParam = searchParams.get("current") ?? "";

        if (!currentParam) {
            return NextResponse.json({ error: "Missing required param: current" }, { status: 400 });
        }

        const toOid = (id: string) =>
            mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;

        const currentOid = toOid(currentParam);
        if (!currentOid) {
            return NextResponse.json({ error: "Invalid current id" }, { status: 400 });
        }

        const compareOids = idsParam
            .split(",").map(s => s.trim()).filter(Boolean)
            .map(toOid).filter(Boolean) as mongoose.Types.ObjectId[];

        // ── Fetch permalink prefix for product ────────────────────────────────
        const permalinkDoc = await Permalink.findOne({ contentType: "product" }).lean() as any;
        const rawPrefix    = (permalinkDoc?.prefix ?? "product") as string;
        // Normalise: trim slashes, default to "product"
        const productPrefix = rawPrefix.trim().replace(/^\/+|\/+$/g, "") || "product";

        // ── Fetch current + compare posts ─────────────────────────────────────
        const allQueryIds = [currentOid, ...compareOids];
        const mainPosts   = await Post.find({
            _id:    { $in: allQueryIds },
            status: "published",
        }).lean() as any[];

        const currentPost = mainPosts.find(p => String(p._id) === currentParam);
        if (!currentPost) {
            return NextResponse.json({ error: "Current product not found" }, { status: 404 });
        }

        // ── Fetch category products ───────────────────────────────────────────
        let catPosts: any[] = [];
        if (currentPost.category) {
            catPosts = await Post.find({
                category: currentPost.category,
                status:   "published",
                _id:      { $ne: currentOid },
            }).select("_id title slug").lean() as any[];
        }

        // ── Batch-fetch all post infos in one query ───────────────────────────
        const allPostIds = [
            ...allQueryIds,
            ...catPosts.map((p: any) => p._id),
        ];

        const allInfoRecords = await PostInfo.find({
            postId: { $in: allPostIds },
        }).lean() as any[];

        const infoByPost: Record<string, Record<string, string>> = {};
        for (const r of allInfoRecords) {
            const key = String(r.postId);
            if (!infoByPost[key]) infoByPost[key] = {};
            infoByPost[key][r.name] = r.value;
        }

        const getInfo = (id: any) => infoByPost[String(id)] ?? {};

        // ── Serialise ─────────────────────────────────────────────────────────
        const current = toCompareProduct(currentPost, getInfo(currentPost._id), productPrefix);

        const compareProducts = compareOids
            .map(oid => {
                const post = mainPosts.find(p => String(p._id) === String(oid));
                return post ? toCompareProduct(post, getInfo(post._id), productPrefix) : null;
            })
            .filter(Boolean);

        const categoryProducts = catPosts
            .map((p: any) => toCompareProduct(p, getInfo(p._id), productPrefix));

        return NextResponse.json({ current, compareProducts, categoryProducts });
    } catch (err) {
        console.error("Compare API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string | undefined, fallback: T): T {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function toCompareProduct(post: any, info: Record<string, string>, productPrefix: string) {
    const variate       = parseJson<Record<string, any>>(info._variate, {});
    const priceType     = (variate.priceType ?? "single") as string;
    const sellingPrice  = parseFloat(variate.sellingprice ?? "0") || 0;
    const regularPrice  = parseFloat(variate.regularprice ?? "0") || 0;
    const variants      = (variate.variants           ?? []) as any[];
    const selectedAttrs = (variate.selectedAttributes ?? []) as any[];

    const imgs: string[] = [];
    for (const v of variants) {
        if (v.image)           imgs.push(v.image);
        if (v.gallery?.length) imgs.push(...v.gallery);
    }
    const defaultImages = parseJson<string[]>(info.images, []);
    const images = [...new Set([...defaultImages, ...imgs])].filter(Boolean);

    const specifications = parseJson<any[]>(info._specifications, []);

    // Build full URL using the actual permalink prefix from DB
    const url = `/${productPrefix}/${post.slug ?? ""}`;

    return {
        id:    String(post._id),
        slug:  post.slug  ?? "",
        title: post.title ?? "",
        url,                        // ← full path, e.g. /product/my-phone
        images,
        sellingPrice,
        regularPrice,
        priceType,
        specifications,
        variants: variants.map((v: any) => ({
            id:      v.id,
            handle:  v.handle,
            color:   v.color,
            options: v.options,
            image:   v.image,
            gallery: v.gallery,
        })),
        selectedAttributes: selectedAttrs.map((a: any) => ({
            label:        a.label,
            displayStyle: a.displayStyle,
            position:     a.position,
            values:       a.values,
        })),
    };
}
