/**
 * cache.ts — 24-hour cache wrapper for server-side DB queries.
 *
 * Only activates when NEXT_PUBLIC_CACHE=production.
 * Uses Next.js unstable_cache (Data Cache) so it works on Vercel and
 * any Node.js host without a Redis dependency.
 *
 * All cached functions share the "cms-root" tag so a single
 * POST /api/cache/revalidate call invalidates everything at once.
 */

import { unstable_cache } from "next/cache";

export const CACHE_TAG = "cms-root";
export const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

const isCacheEnabled =
    process.env.NEXT_PUBLIC_CACHE === "production";

/**
 * Wrap an async factory with a 24-hour cache tagged "cms-root".
 * When caching is disabled (development) the factory is called directly
 * every time — no stale data.
 *
 * @param key   Unique string key for this cached value.
 * @param fn    The async factory to cache.
 */
export function withCache<T>(
    key: string,
    fn: () => Promise<T>
): () => Promise<T> {
    if (!isCacheEnabled) {
        // Dev mode: always fresh
        return fn;
    }

    return unstable_cache(fn, [key], {
        tags: [CACHE_TAG],
        revalidate: CACHE_TTL,
    });
}
