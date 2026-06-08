/**
 * POST /api/cache/revalidate
 *
 * Invalidates all "cms-root" tagged cache entries immediately.
 * The next request to any cached page will re-fetch from MongoDB
 * and start a fresh 24-hour window.
 *
 * Protected by CACHE_REVALIDATE_SECRET (server-only env var).
 * The admin layout calls this via a Server Action so the secret
 * never reaches the browser.
 */

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CACHE_TAG } from "@/lib/cache";

export async function POST(req: Request) {
    const secret = process.env.CACHE_REVALIDATE_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

    if (!secret) {
        return NextResponse.json({ error: "No secret configured" }, { status: 500 });
    }

    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    revalidateTag(CACHE_TAG, "max");

    return NextResponse.json({
        ok: true,
        message: "Cache cleared. Fresh data will be fetched on next request.",
        clearedAt: new Date().toISOString(),
    });
}
