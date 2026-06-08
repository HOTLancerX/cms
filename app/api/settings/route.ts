import { NextResponse } from "next/server";
import { Settings, getSetting } from "@/lib/settings";

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
