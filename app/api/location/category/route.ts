import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Cat from "@/models/cat";
import CatInfo from "@/models/cat_info";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const type = req.nextUrl.searchParams.get("type") || "";
        const status = req.nextUrl.searchParams.get("status") || "";
        const parentId = req.nextUrl.searchParams.get("parentId") || null;

        const filter: Record<string, any> = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (parentId) {
            const pid = parentId === "null" ? null : parentId;
            if (pid === null) {
                filter.parentId = null;
            } else {
                filter.parentId = pid;
            }
        }

        const rawCats = await Cat.find(filter).sort({ title: 1 }).lean();
        const catIds = rawCats.map((c) => c._id);
        const catInfos = catIds.length > 0 ? await CatInfo.find({ catId: { $in: catIds } }).lean() : [];
        const infoMap: Record<string, Record<string, string>> = {};
        for (const inf of catInfos) {
            const idKey = String(inf.catId);
            if (!infoMap[idKey]) infoMap[idKey] = {};
            infoMap[idKey][inf.name] = String(inf.value ?? "");
        }

        const categories = rawCats.map((c) => {
            const idStr = String(c._id);
            const inf = infoMap[idStr] || {};
            return {
                ...c,
                _id: idStr,
                parentId: c.parentId ? String(c.parentId) : null,
                icon: inf.icon || "",
                info: inf,
            };
        });

        return NextResponse.json({ categories, cats: categories, success: true });
    } catch (err) {
        console.error("Location category API error:", err);
        return NextResponse.json({ categories: [], cats: [], success: false }, { status: 500 });
    }
}
