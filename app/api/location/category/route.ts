import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Cat from "@/models/cat";

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

        const categories = await Cat.find(filter).sort({ title: 1 }).lean();

        return NextResponse.json({ categories });
    } catch (err) {
        console.error("Location category API error:", err);
        return NextResponse.json({ categories: [] }, { status: 500 });
    }
}
