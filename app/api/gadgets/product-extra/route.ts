import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSmartFrequentlyTogether, getSmartCategoryCompareProducts } from "@/plugin/gadgets/lib/recommendations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const title = searchParams.get("title") || "";
        const categoryId = searchParams.get("categoryId") || searchParams.get("category");
        const brandTitle = searchParams.get("brand") || undefined;
        const categoryTitle = searchParams.get("categoryTitle") || undefined;

        if (!id) {
            return NextResponse.json({ error: "Product ID required" }, { status: 400 });
        }

        await connectDB();

        const [frequentlyTogether, compareData] = await Promise.all([
            getSmartFrequentlyTogether({
                id,
                title,
                brandTitle,
                categoryTitle,
            }),
            getSmartCategoryCompareProducts(id, categoryId),
        ]);

        return NextResponse.json(
            {
                frequentlyTogether: frequentlyTogether || [],
                compareProducts: compareData.compareProducts || [],
                allCompareCandidates: compareData.allCompareCandidates || [],
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
                },
            }
        );
    } catch (err: any) {
        console.error("[api/gadgets/product-extra] Error:", err);
        return NextResponse.json(
            {
                frequentlyTogether: [],
                compareProducts: [],
                allCompareCandidates: [],
            },
            { status: 200 }
        );
    }
}
