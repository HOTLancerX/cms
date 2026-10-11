import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ── GET: Search products/posts for category linking ───────────────────────────
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim() || "";
        const postType = searchParams.get("type") || searchParams.get("postType") || "";
        const excludeCatId = searchParams.get("excludeCatId") || "";
        const sourceCatId = searchParams.get("sourceCatId") || "";
        const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "100", 10)));

        const conditions: any[] = [
            { status: { $ne: "trash" } },
        ];

        if (postType && postType !== "all") {
            conditions.push({ type: postType });
        }

        // Exclude products that are already assigned to the selected category
        if (excludeCatId && excludeCatId !== "all" && mongoose.Types.ObjectId.isValid(excludeCatId)) {
            conditions.push({
                category: { $ne: new mongoose.Types.ObjectId(excludeCatId) },
            });
        }

        // Filter products by their currently added category
        if (sourceCatId) {
            if (sourceCatId === "uncategorized") {
                conditions.push({
                    $or: [
                        { category: null },
                        { category: { $exists: false } },
                    ],
                });
            } else if (sourceCatId !== "all" && mongoose.Types.ObjectId.isValid(sourceCatId)) {
                conditions.push({ category: new mongoose.Types.ObjectId(sourceCatId) });
            }
        }

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            conditions.push({
                $or: [
                    { title: { $regex: escaped, $options: "i" } },
                    { slug: { $regex: escaped, $options: "i" } },
                ],
            });
        }

        const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("_id title slug type category status createdAt")
            .lean();

        const postIds = posts.map((p) => p._id);

        // Fetch image info
        const infos = postIds.length > 0
            ? await PostInfo.find({
                postId: { $in: postIds },
                name: { $in: ["image", "images", "_variate"] },
            }).lean()
            : [];

        // Build image map
        const imageMap = new Map<string, string>();
        infos.forEach((info: any) => {
            const pid = String(info.postId);
            if (imageMap.has(pid)) return;

            if (info.name === "image" || info.name === "images") {
                try {
                    const parsed = JSON.parse(info.value);
                    if (Array.isArray(parsed) && parsed[0]) imageMap.set(pid, parsed[0]);
                    else if (typeof parsed === "string" && parsed) imageMap.set(pid, parsed);
                } catch {
                    if (info.value) imageMap.set(pid, info.value);
                }
            } else if (info.name === "_variate") {
                try {
                    const parsed = JSON.parse(info.value);
                    if (Array.isArray(parsed?.variants)) {
                        for (const v of parsed.variants) {
                            if (v?.image) {
                                imageMap.set(pid, v.image);
                                break;
                            }
                        }
                    }
                } catch {}
            }
        });

        // Fetch category names for current categories
        const catIds = posts
            .map((p: any) => p.category)
            .filter((c: any) => c && mongoose.Types.ObjectId.isValid(c));

        const cats = catIds.length > 0
            ? await Cat.find({ _id: { $in: catIds } }, "_id title").lean()
            : [];

        const catMap = new Map<string, string>();
        cats.forEach((c: any) => catMap.set(String(c._id), c.title));

        const results = posts.map((p: any) => ({
            _id: String(p._id),
            title: p.title || "",
            slug: p.slug || "",
            type: p.type || "post",
            status: p.status || "draft",
            categoryId: p.category ? String(p.category) : null,
            categoryTitle: p.category ? catMap.get(String(p.category)) || "Unknown" : null,
            image: imageMap.get(String(p._id)) || null,
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
        }));

        // Count total uncategorized products
        const uncategorizedFilter: Record<string, any> = {
            status: { $ne: "trash" },
            $or: [{ category: null }, { category: { $exists: false } }],
        };
        if (postType && postType !== "all") {
            uncategorizedFilter.type = postType;
        }
        const uncategorizedCount = await Post.countDocuments(uncategorizedFilter);

        return NextResponse.json({
            products: results,
            total: results.length,
            uncategorizedCount,
        });
    } catch (error: any) {
        console.error("Search products for link error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to search products" },
            { status: 500 }
        );
    }
}

// ── POST: Link selected products to category ─────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const categoryId = String(body.categoryId || "").trim();
        const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];

        if (!categoryId) {
            return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return NextResponse.json({ error: "Invalid category ID format" }, { status: 400 });
        }

        if (productIds.length === 0) {
            return NextResponse.json({ error: "No product IDs provided to link" }, { status: 400 });
        }

        // Validate target category exists
        const targetCategory = await Cat.findById(categoryId).select("_id title type").lean();
        if (!targetCategory) {
            return NextResponse.json({ error: "Selected category was not found" }, { status: 404 });
        }

        const validObjectIds = productIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        if (validObjectIds.length === 0) {
            return NextResponse.json({ error: "No valid product ObjectIds provided" }, { status: 400 });
        }

        // Bulk update products with the new categoryId
        const result = await Post.updateMany(
            { _id: { $in: validObjectIds } },
            { $set: { category: new mongoose.Types.ObjectId(categoryId) } }
        );

        return NextResponse.json({
            success: true,
            updatedCount: result.modifiedCount || validObjectIds.length,
            categoryId: String(targetCategory._id),
            categoryTitle: targetCategory.title,
        });
    } catch (error: any) {
        console.error("Link products error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to link products to category" },
            { status: 500 }
        );
    }
}
