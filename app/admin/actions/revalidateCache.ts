"use server";

/**
 * Server Action: revalidateCache
 *
 * Calls revalidateTag("cms-root") directly on the server — no HTTP round-trip,
 * no secret exposed to the browser. Safe to call from any admin client component.
 *
 * Only has an effect when NEXT_PUBLIC_CACHE=production.
 */

import { revalidateTag } from "next/cache";
import { CACHE_TAG, invalidateMemoryCache } from "@/lib/cache";

export async function revalidateCache(): Promise<{ ok: boolean; clearedAt?: string; error?: string }> {
    invalidateMemoryCache();

    if (process.env.NEXT_PUBLIC_CACHE === "production") {
        revalidateTag(CACHE_TAG, "max");
    }

    return { ok: true, clearedAt: new Date().toISOString() };
}
