import { NextRequest, NextResponse } from "next/server";
import { getMenuByLocation, getMenuById } from "@/lib/menu";
import { withCache } from "@/lib/cache";
import connectDB from "@/lib/mongodb";
import MenuModel from "@/models/Menu";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ location: string }> }
) {
    try {
        const { location } = await context.params;
        if (!location) {
            return NextResponse.json([]);
        }

        const decodedLocation = decodeURIComponent(location).trim();

        // 1. If it's a 24-character hexadecimal MongoDB ObjectId
        if (decodedLocation.match(/^[0-9a-fA-F]{24}$/)) {
            const menu = await getMenuById(decodedLocation);
            return NextResponse.json(menu?.items || []);
        }

        // 2. Fetch by location slot (e.g. "footer-1", "header-1", "mobile-1")
        const items = await getMenuByLocation(decodedLocation);
        if (items && items.length > 0) {
            return NextResponse.json(items);
        }

        // 3. Fallback: query MenuModel by slug or title if location slot not matched
        await connectDB();
        const menuBySlug = await MenuModel.findOne({
            $or: [
                { slug: decodedLocation },
                { title: { $regex: new RegExp(`^${decodedLocation}$`, 'i') } },
                { location: decodedLocation },
            ],
            status: "active",
        }).lean();

        if (menuBySlug?.items) {
            return NextResponse.json(menuBySlug.items);
        }

        return NextResponse.json([]);
    } catch (error) {
        console.error(`[GET /api/menu] Error fetching menu for location:`, error);
        return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
    }
}
