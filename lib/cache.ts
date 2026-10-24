/**
 * cache.ts — High-performance multi-tier cache for server-side DB queries.
 *
 * Tier 1: In-flight promise deduplication (prevent multiple simultaneous queries for the same key).
 * Tier 2: In-memory RAM cache with TTL (instant 0ms response across page navigations).
 * Tier 3: Next.js unstable_cache (Data Cache) when NEXT_PUBLIC_CACHE=production.
 *
 * All cached functions share the "cms-root" tag so a single
 * POST /api/cache/revalidate or admin action invalidates everything at once.
 */

import { unstable_cache } from "next/cache";

export const CACHE_TAG = "cms-root";
export const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

const isProd = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_CACHE === "production";
const isCacheEnabled = isProd;

// In development, keep a 300-second (5 min) TTL in memory so link clicks are instant (0ms),
// while admin edits still reflect automatically after 5 minutes (or immediately via cache invalidation).
// In production, keep 24 hours (invalidated on demand).
const MEMORY_TTL_MS = isProd ? 1000 * 60 * 60 * 24 : 1000 * 300;

interface MemoryCacheEntry {
    data: any;
    expiresAt: number;
}

declare global {
    // eslint-disable-next-line no-var
    var __cmsMemoryCache: Map<string, MemoryCacheEntry> | undefined;
    // eslint-disable-next-line no-var
    var __cmsInflightPromises: Map<string, Promise<any>> | undefined;
}

const memoryCache = globalThis.__cmsMemoryCache ?? (globalThis.__cmsMemoryCache = new Map<string, MemoryCacheEntry>());
const inflightPromises = globalThis.__cmsInflightPromises ?? (globalThis.__cmsInflightPromises = new Map<string, Promise<any>>());

/**
 * Invalidate memory cache for all keys or matching key prefix.
 */
export function invalidateMemoryCache(keyPrefix?: string): void {
    if (!keyPrefix) {
        memoryCache.clear();
        inflightPromises.clear();
        return;
    }
    for (const key of Array.from(memoryCache.keys())) {
        if (key === keyPrefix || key.startsWith(keyPrefix)) {
            memoryCache.delete(key);
        }
    }
    for (const key of Array.from(inflightPromises.keys())) {
        if (key === keyPrefix || key.startsWith(keyPrefix)) {
            inflightPromises.delete(key);
        }
    }
}

export const invalidateCache = invalidateMemoryCache;

/**
 * Wrap an async factory with multi-tier caching:
 * - Checks in-memory cache first (0ms instant lookup)
 * - Deduplicates concurrent requests for the same key
 * - Integrates with Next.js unstable_cache in production
 *
 * @param key   Unique string key for this cached value.
 * @param fn    The async factory to cache.
 * @param customTtlMs Optional custom in-memory TTL in milliseconds.
 */
export function withCache<T>(
    key: string,
    fn: () => Promise<T>,
    customTtlMs?: number
): () => Promise<T> {
    const rawTtl = customTtlMs ?? MEMORY_TTL_MS;
    // If caller passed seconds (e.g. 300, 60), normalize to milliseconds safely
    const ttl = (customTtlMs && customTtlMs > 0 && customTtlMs < 1000)
        ? customTtlMs * 1000
        : rawTtl;

    const executeWithMemoryCache = async (): Promise<T> => {
        const now = Date.now();
        const cached = memoryCache.get(key);
        if (cached && cached.expiresAt > now) {
            return cached.data as T;
        }

        // Deduplicate in-flight promises
        const inflight = inflightPromises.get(key);
        if (inflight) {
            return inflight as Promise<T>;
        }

        const promise = (async () => {
            try {
                const result = await fn();
                memoryCache.set(key, {
                    data: result,
                    expiresAt: Date.now() + ttl,
                });
                return result;
            } finally {
                inflightPromises.delete(key);
            }
        })();

        inflightPromises.set(key, promise);
        return promise;
    };

    const wrapThenable = (f: () => Promise<T>): (() => Promise<T>) & PromiseLike<T> => {
        const thenableFn = f as any;
        thenableFn.then = (onFulfilled?: any, onRejected?: any) => f().then(onFulfilled, onRejected);
        thenableFn.catch = (onRejected?: any) => f().catch(onRejected);
        thenableFn.finally = (onFinally?: any) => f().finally(onFinally);
        return thenableFn;
    };

    if (!isCacheEnabled) {
        return wrapThenable(executeWithMemoryCache) as any;
    }

    const nextCached = unstable_cache(
        async () => {
            return executeWithMemoryCache();
        },
        [key],
        {
            tags: [CACHE_TAG],
            revalidate: CACHE_TTL,
        }
    );

    const executeWithNextCache = async () => {
        const now = Date.now();
        const cached = memoryCache.get(key);
        if (cached && cached.expiresAt > now) {
            return cached.data as T;
        }
        const data = await nextCached();
        memoryCache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
        });
        return data as T;
    };

    return wrapThenable(executeWithNextCache) as any;
}

