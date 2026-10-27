import { notFound } from "next/navigation";
import { getCatTypes } from "@/hook/CategoryType";
import CategoryListClient from "./CategoryListClient";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
const xHeaders = { "x-license-key": LICENSE_KEY };

interface CategoryListPageProps {
    params: Promise<{ type: string }>;
}

export default async function CategoryListPage({ params }: CategoryListPageProps) {
    const { type } = await params;

    const catTypes = getCatTypes();
    const catType = catTypes.find((t) => t.key === type);
    if (!catType) notFound();

    const [catsRes, permalinkRes] = await Promise.all([
        fetch(`${EXPRESS_API}/cat?type=${encodeURIComponent(type)}`, { headers: xHeaders, cache: "no-store" }),
        fetch(`${EXPRESS_API}/permalink`, { headers: xHeaders, cache: "no-store" }),
    ]);

    const { cats = [] } = catsRes.ok ? await catsRes.json() : { cats: [] };
    const permalinkMap: Record<string, string> = permalinkRes.ok ? await permalinkRes.json() : {};
    const defaultPrefix = type === "product-tag" ? "product/tag" : (catType.postType ? `${catType.postType}/category` : `category/${type}`);
    const prefix = (permalinkMap[type] ?? defaultPrefix).trim().replace(/^\/+|\/+$/g, "");
    const viewBase = prefix ? `/${prefix}/` : "/";

    // ── Compute product/item counts per category/tag ───────────────────────
    await connectDB();
    const countMap: Record<string, number> = {};

    try {
        if (type === "product-tag") {
            // Count products referencing each tag in PostInfo "tags"
            const tagInfos = await PostInfo.find({
                name: "tags",
                value: { $ne: "" },
            }).select("value").lean() as any[];

            for (const ti of tagInfos) {
                if (!ti.value) continue;
                let ids: string[] = [];
                try {
                    const parsed = JSON.parse(ti.value);
                    if (Array.isArray(parsed)) {
                        ids = parsed.map((item) => (typeof item === "object" && item ? item.id || item._id || item.slug : String(item)));
                    } else {
                        ids = [String(parsed)];
                    }
                } catch {
                    ids = String(ti.value).split(",").map((s) => s.trim()).filter(Boolean);
                }
                for (const tid of ids) {
                    if (tid) countMap[tid] = (countMap[tid] || 0) + 1;
                }
            }
        } else if (type === "brands") {
            // Count products referencing each brand in PostInfo "brand"/"brands" or Post.brands
            const [brandInfos, directBrandCounts] = (await Promise.all([
                PostInfo.find({
                    name: { $in: ["brand", "brands"] },
                    value: { $ne: "" },
                }).select("value").lean(),
                Post.aggregate([
                    { $match: { brands: { $ne: null } } },
                    { $group: { _id: "$brands", count: { $sum: 1 } } }
                ])
            ])) as [any[], any[]];

            for (const b of directBrandCounts) {
                if (b._id) countMap[String(b._id)] = b.count;
            }

            for (const bi of brandInfos) {
                let bId = "";
                try {
                    const p = JSON.parse(bi.value);
                    bId = p?.id || bi.value;
                } catch {
                    bId = bi.value;
                }
                if (bId) countMap[bId] = (countMap[bId] || 0) + 1;
            }
        } else {
            // Standard category: direct count of posts in this category
            const catCounts = await Post.aggregate([
                { $match: { category: { $ne: null }, status: { $ne: "trash" } } },
                { $group: { _id: "$category", count: { $sum: 1 } } }
            ]);

            for (const c of catCounts) {
                if (c._id) countMap[String(c._id)] = c.count;
            }
        }
    } catch (e) {
        console.error("Failed to compute category counts:", e);
    }

    const catsWithCounts = cats.map((cat: any) => ({
        ...cat,
        count: countMap[String(cat._id)] || (cat.slug ? countMap[cat.slug] : 0) || (cat.title ? countMap[cat.title] : 0) || 0,
    }));

    return (
        <CategoryListClient
            type={type}
            catType={catType}
            initialCats={catsWithCounts}
            viewBase={viewBase}
        />
    );
}
