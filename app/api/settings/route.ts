import { NextRequest, NextResponse } from "next/server";
import { Settings } from "@/lib/settings";
import connectDB from "@/lib/mongodb";
import Setting from "@/models/settings";
import { invalidateMemoryCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 * Returns all settings as a flat map: { [title]: content }
 * Reads directly from MongoDB — no Express involved.
 */
export async function GET() {
    try {
        const data = await Settings();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Settings GET error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

/**
 * PUT /api/settings
 * Bulk updates settings in MongoDB directly and invalidates cache.
 */
export async function PUT(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const entries = Object.entries(body);
        if (entries.length > 0) {
            const bulkOps = entries.map(([title, content]) => ({
                updateOne: {
                    filter: { title },
                    update: { $set: { title, content } },
                    upsert: true,
                },
            }));
            await Setting.bulkWrite(bulkOps);
        }

        // Invalidate in-memory settings cache
        invalidateMemoryCache("settings");

        return NextResponse.json({ success: true, count: entries.length });
    } catch (error) {
        console.error("Settings PUT error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
