import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ── GET: Search products/posts for category or brand linking ─────────────────
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim() || "";
        const postType = searchParams.get("type") || searchParams.get("postType") || "";
        const excludeCatId = searchParams.get("excludeCatId") || "";
        const sourceCatId = searchParams.get("sourceCatId") || "";
        const sourceCategoryFilter = searchParams.get("sourceCategoryFilter") || "";
        const catType = searchParams.get("catType") || "";
        const isBrand = searchParams.get("isBrand") === "true" || catType === "brands";
        const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "100", 10)));
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const matchCase = searchParams.get("matchCase") === "true";
        const exactMatch = searchParams.get("exactMatch") === "true";

        const conditions: any[] = [
            { status: { $ne: "trash" } },
        ];

        // Default postType for brand is always "product"
        const effectivePostType = postType || (isBrand ? "product" : "");
        if (effectivePostType && effectivePostType !== "all") {
            conditions.push({ type: effectivePostType });
        }

        if (isBrand) {
            // ── BRAND MODE ───────────────────────────────────────────────────
            // 1. Exclude products already assigned to the target brand
            if (excludeCatId && excludeCatId !== "all" && mongoose.Types.ObjectId.isValid(excludeCatId)) {
                const targetBrandObjId = new mongoose.Types.ObjectId(excludeCatId);
                const brandTaggedDocs = await PostInfo.find({
                    name: { $in: ["brand", "brands", "brandId"] },
                    value: { $regex: new RegExp(excludeCatId, "i") },
                }).select("postId").lean() as any[];

                const excludedPostIds = brandTaggedDocs.map((d) => d.postId);
                conditions.push({
                    _id: { $nin: excludedPostIds },
                    brands: { $ne: targetBrandObjId },
                });
            }

            // 2. Filter by source brand status
            if (sourceCatId === "unbranded" || sourceCatId === "uncategorized") {
                // Find all products that DO have a brand assigned
                const brandedDocs = await PostInfo.find({
                    name: { $in: ["brand", "brands", "brandId"] },
                    value: { $ne: "" },
                }).select("postId").lean() as any[];

                const brandedPostIds = brandedDocs.map((d) => d.postId);
                conditions.push({
                    _id: { $nin: brandedPostIds },
                    $or: [
                        { brands: null },
                        { brands: { $exists: false } },
                    ],
                });
            } else if (sourceCatId && sourceCatId !== "all" && mongoose.Types.ObjectId.isValid(sourceCatId)) {
                // Filter by a specific current brand
                const sourceBrandObjId = new mongoose.Types.ObjectId(sourceCatId);
                const specificBrandDocs = await PostInfo.find({
                    name: { $in: ["brand", "brands", "brandId"] },
                    value: { $regex: new RegExp(sourceCatId, "i") },
                }).select("postId").lean() as any[];

                const specificPostIds = specificBrandDocs.map((d) => d.postId);
                conditions.push({
                    $or: [
                        ...(specificPostIds.length > 0 ? [{ _id: { $in: specificPostIds } }] : []),
                        { brands: sourceBrandObjId },
                    ],
                });
            }

            // 3. Optional filter by product category
            if (sourceCategoryFilter && sourceCategoryFilter !== "all" && mongoose.Types.ObjectId.isValid(sourceCategoryFilter)) {
                conditions.push({ category: new mongoose.Types.ObjectId(sourceCategoryFilter) });
            }
        } else {
            // ── CATEGORY MODE ────────────────────────────────────────────────
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
        }

        // Search text by title or slug
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = exactMatch ? `^${escaped}$` : escaped;
            const regexQuery: Record<string, string> = { $regex: pattern };
            if (!matchCase) {
                regexQuery.$options = "i";
            }
            conditions.push({
                $or: [
                    { title: regexQuery },
                    { slug: regexQuery },
                ],
            });
        }

        const query = conditions.length === 1 ? conditions[0] : { $and: conditions };
        const skip = (page - 1) * limit;

        const [totalMatching, posts] = await Promise.all([
            Post.countDocuments(query),
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("_id title slug type category brands status createdAt")
                .lean() as any,
        ]);

        const postIds = posts.map((p: any) => p._id);

        // Fetch postinfos (images, brand)
        const infos = postIds.length > 0
            ? await PostInfo.find({
                postId: { $in: postIds },
                name: { $in: ["image", "images", "_variate", "brand", "brands"] },
            }).lean() as any
            : [];

        // Build image and brand maps
        const imageMap = new Map<string, string>();
        const productBrandIdMap = new Map<string, string>();

        infos.forEach((info: any) => {
            const pid = String(info.postId);

            // Images
            if (!imageMap.has(pid)) {
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
            }

            // Brand
            if ((info.name === "brand" || info.name === "brands") && info.value) {
                try {
                    const parsed = JSON.parse(info.value);
                    if (parsed && typeof parsed === "object" && parsed.id) {
                        productBrandIdMap.set(pid, String(parsed.id));
                    } else if (typeof parsed === "string") {
                        productBrandIdMap.set(pid, parsed);
                    }
                } catch {
                    productBrandIdMap.set(pid, String(info.value));
                }
            }
        });

        // Also check post.brands field
        posts.forEach((p: any) => {
            const pid = String(p._id);
            if (!productBrandIdMap.has(pid) && p.brands) {
                productBrandIdMap.set(pid, String(p.brands));
            }
        });

        // Fetch category names
        const catIds = posts
            .map((p: any) => p.category)
            .filter((c: any) => c && mongoose.Types.ObjectId.isValid(c));

        // Fetch brand names
        const brandIdsToFetch = Array.from(productBrandIdMap.values()).filter(
            (id) => mongoose.Types.ObjectId.isValid(id)
        );

        const allLookupIds = Array.from(new Set([...catIds.map(String), ...brandIdsToFetch]));

        const catDocs = allLookupIds.length > 0
            ? await Cat.find({ _id: { $in: allLookupIds } }, "_id title type").lean() as any
            : [];

        const catMap = new Map<string, string>();
        catDocs.forEach((c: any) => catMap.set(String(c._id), c.title));

        const results = posts.map((p: any) => {
            const pid = String(p._id);
            const rawBrandId = productBrandIdMap.get(pid) || null;
            const brandTitle = rawBrandId ? (catMap.get(rawBrandId) || rawBrandId) : null;

            return {
                _id: pid,
                title: p.title || "",
                slug: p.slug || "",
                type: p.type || "post",
                status: p.status || "draft",
                categoryId: p.category ? String(p.category) : null,
                categoryTitle: p.category ? catMap.get(String(p.category)) || "Unknown" : null,
                brandId: rawBrandId,
                brandTitle: brandTitle,
                image: imageMap.get(pid) || null,
                createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
            };
        });

        // Calculate uncategorized / unbranded counts
        let uncategorizedCount = 0;
        let unbrandedCount = 0;

        if (isBrand) {
            // Count unbranded products
            const brandedDocs = await PostInfo.find({
                name: { $in: ["brand", "brands", "brandId"] },
                value: { $ne: "" },
            }).select("postId").lean() as any[];

            const brandedPostIds = brandedDocs.map((d) => d.postId);
            const unbrandedFilter: Record<string, any> = {
                status: { $ne: "trash" },
                type: effectivePostType || "product",
                _id: { $nin: brandedPostIds },
                $or: [{ brands: null }, { brands: { $exists: false } }],
            };
            unbrandedCount = await Post.countDocuments(unbrandedFilter);
        } else {
            // Count uncategorized products
            const uncategorizedFilter: Record<string, any> = {
                status: { $ne: "trash" },
                $or: [{ category: null }, { category: { $exists: false } }],
            };
            if (effectivePostType && effectivePostType !== "all") {
                uncategorizedFilter.type = effectivePostType;
            }
            uncategorizedCount = await Post.countDocuments(uncategorizedFilter);
        }

        const totalPages = Math.max(1, Math.ceil(totalMatching / limit));

        return NextResponse.json({
            products: results,
            total: totalMatching,
            page,
            totalPages,
            limit,
            uncategorizedCount,
            unbrandedCount,
        });
    } catch (error: any) {
        console.error("Search products for link error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to search products" },
            { status: 500 }
        );
    }
}

// ── POST: Link selected products to category or brand ────────────────────────
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const categoryId = String(body.categoryId || body.brandId || "").trim();
        const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
        const isBrand = body.isBrand === true || body.catType === "brands";

        if (!categoryId) {
            return NextResponse.json({ error: isBrand ? "Brand ID is required" : "Category ID is required" }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return NextResponse.json({ error: isBrand ? "Invalid brand ID format" : "Invalid category ID format" }, { status: 400 });
        }

        if (productIds.length === 0) {
            return NextResponse.json({ error: "No product IDs provided to link" }, { status: 400 });
        }

        // Validate target category/brand exists
        const targetCategory = await Cat.findById(categoryId).select("_id title type").lean() as any;
        if (!targetCategory) {
            return NextResponse.json({ error: isBrand ? "Selected brand was not found" : "Selected category was not found" }, { status: 404 });
        }

        const validObjectIds = productIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        if (validObjectIds.length === 0) {
            return NextResponse.json({ error: "No valid product ObjectIds provided" }, { status: 400 });
        }

        if (isBrand) {
            // ── BRAND LINKING: Update brand in PostInfo and Post.brands without touching category ──
            const brandPayloadValue = JSON.stringify({
                id: String(targetCategory._id),
                path: [String(targetCategory._id)],
            });

            // Upsert "brand" PostInfo for each product
            await PostInfo.bulkWrite(
                validObjectIds.map((pid) => ({
                    updateOne: {
                        filter: { postId: pid, name: "brand" },
                        update: { $set: { value: brandPayloadValue } },
                        upsert: true,
                    },
                }))
            );

            // Also set brands on Post model
            const result = await Post.updateMany(
                { _id: { $in: validObjectIds } },
                { $set: { brands: new mongoose.Types.ObjectId(categoryId) } }
            );

            return NextResponse.json({
                success: true,
                isBrand: true,
                updatedCount: result.modifiedCount || validObjectIds.length,
                brandId: String(targetCategory._id),
                brandTitle: targetCategory.title,
                message: `Successfully linked ${validObjectIds.length} product(s) to brand "${targetCategory.title}"`,
            });
        }

        // ── CATEGORY LINKING: Bulk update products with the new categoryId ──
        const result = await Post.updateMany(
            { _id: { $in: validObjectIds } },
            { $set: { category: new mongoose.Types.ObjectId(categoryId) } }
        );

        return NextResponse.json({
            success: true,
            isBrand: false,
            updatedCount: result.modifiedCount || validObjectIds.length,
            categoryId: String(targetCategory._id),
            categoryTitle: targetCategory.title,
            message: `Successfully linked ${validObjectIds.length} product(s) to category "${targetCategory.title}"`,
        });
    } catch (error: any) {
        console.error("Link products error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to link products" },
            { status: 500 }
        );
    }
}
