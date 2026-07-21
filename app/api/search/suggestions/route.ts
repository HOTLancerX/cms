import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import Permalink from "@/models/permalink";

export const dynamic = "force-dynamic";

function getUrl(slug: string, contentType: string, permalinkMap: Record<string, string>): string {
    const prefix = permalinkMap[contentType] ?? contentType;
    const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
    return trimmed ? `/${trimmed}/${slug}` : `/${slug}`;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q");
        const type = searchParams.get("type") || "all";

        if (!q || q.trim().length < 2) {
            return NextResponse.json({
                keywords: [],
                products: [],
                categories: [],
                brands: []
            });
        }

        await connectDB();

        // Load permalinks
        const permalinkDocs = await Permalink.find({}).lean();
        const permalinkMap: Record<string, string> = {};
        permalinkDocs.forEach((d: any) => {
            permalinkMap[d.contentType] = d.prefix ?? "";
        });

        const cleanQ = q.trim().toLowerCase();
        const queryWords = cleanQ.split(/\s+/).filter(Boolean);
        const regexList = queryWords.map(w => new RegExp(w, 'i'));
        const orFilter = regexList.map(r => ({ title: r }));

        // Map request types (e.g. products -> product, posts -> blog)
        const mappedType = type === "products" ? "product" : type === "posts" ? "blog" : type;

        // 1. Fetch matching products (post type "product")
        let products: any[] = [];
        let productSuggestions: any[] = [];

        if (mappedType === "all" || mappedType === "product") {
            products = await Post.find({
                type: "product",
                status: "published",
                $or: orFilter
            }).limit(5).lean();

            if (products.length > 0) {
                const productIds = products.map(p => p._id);
                const infoDocs = await PostInfo.find({ postId: { $in: productIds } }).lean();
                
                const infoByPost = infoDocs.reduce((acc, r) => {
                    const k = String(r.postId);
                    if (!acc[k]) acc[k] = {};
                    acc[k][r.name] = r.value;
                    return acc;
                }, {} as Record<string, Record<string, string>>);

                // Fetch categories
                const catIds = products.map(p => p.category).filter(Boolean);
                const cats = await Cat.find({ _id: { $in: catIds } }).lean();
                const catsMap = cats.reduce((acc, c) => {
                    acc[String(c._id)] = { title: c.title, slug: c.slug };
                    return acc;
                }, {} as Record<string, { title: string; slug: string }>);

                // Fetch brands
                const brandIds: string[] = [];
                products.forEach(p => {
                    const info = infoByPost[String(p._id)] ?? {};
                    const brandVal = p.brands || info.brands || info.brand;
                    if (brandVal && typeof brandVal === 'string' && brandVal.length === 24) {
                        brandIds.push(brandVal);
                    }
                });

                const brandCats = brandIds.length > 0 ? await Cat.find({ _id: { $in: brandIds } }).lean() : [];
                const brandsMap = brandCats.reduce((acc, c) => {
                    acc[String(c._id)] = { title: c.title, slug: c.slug };
                    return acc;
                }, {} as Record<string, { title: string; slug: string }>);

                productSuggestions = products.map(p => {
                    const info = infoByPost[String(p._id)] ?? {};
                    const variate = (() => {
                        try { return JSON.parse(info._variate || '{}'); } catch { return {}; }
                    })();
                    const sellingPrice = parseFloat(variate.sellingprice) || parseFloat(variate.regularprice) || null;
                    const regularPrice = parseFloat(variate.regularprice) || null;
                    
                    const rawImage = info.images || info.image || '';
                    let image = null;
                    if (rawImage) {
                        try {
                            const parsed = JSON.parse(rawImage);
                            image = Array.isArray(parsed) ? (parsed[0] || null) : String(parsed);
                        } catch {
                            image = String(rawImage);
                        }
                    }

                    const catInfo = p.category ? catsMap[String(p.category)] : null;
                    const brandVal = p.brands || info.brands || info.brand;
                    const brandInfo = brandVal ? brandsMap[String(brandVal)] : null;

                    return {
                        title: p.title,
                        slug: p.slug,
                        image,
                        sellingPrice,
                        regularPrice,
                        categoryInfo: catInfo || null,
                        brandInfo: brandInfo || null,
                        url: getUrl(p.slug, "product", permalinkMap)
                    };
                });
            }
        }

        // 2. Fetch categories ("product-category")
        const categories = await Cat.find({
            type: "product-category",
            status: "published",
            $or: orFilter
        }).limit(5).lean();

        // 3. Fetch brands ("brands")
        const brands = await Cat.find({
            type: "brands",
            status: "published",
            $or: orFilter
        }).limit(5).lean();

        // 4. Keywords
        const keywordsSet = new Set<string>();
        products.forEach(p => keywordsSet.add(p.title));
        
        const blogs = await Post.find({
            type: "blog",
            status: "published",
            $or: orFilter
        }).limit(5).lean();
        blogs.forEach(b => keywordsSet.add(b.title));

        const keywords = Array.from(keywordsSet).slice(0, 6);

        return NextResponse.json({
            keywords,
            products: productSuggestions,
            categories: categories.map(c => ({
                title: c.title,
                slug: c.slug,
                url: getUrl(c.slug, c.type, permalinkMap)
            })),
            brands: brands.map(b => ({
                title: b.title,
                slug: b.slug,
                url: getUrl(b.slug, b.type, permalinkMap)
            }))
        });

    } catch (error) {
        console.error("Suggestions API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
