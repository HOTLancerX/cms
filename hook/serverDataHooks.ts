/**
 * hook/serverDataHooks.ts — Server-only auto-discovering data hook registry.
 *
 * Uses require.context to automatically discover and execute every plugin's
 * lib/serverHooks.ts file. Each such file calls registerServerDataHook() to
 * register its data providers.
 *
 * THIS FILE IS SERVER-ONLY. It must only be imported by:
 *   - app/(root)/[...slug]/page.tsx
 *   - Other pure server-side files (API routes, server actions)
 *
 * It must NEVER be imported by:
 *   - hook/index.ts
 *   - hook/PluginList.ts
 *   - Any client component
 *
 * Adding a new plugin's data provider requires ZERO changes here
 * or in page.tsx — just create plugin/myplugin/lib/serverHooks.ts and
 * call registerServerDataHook() or registerProductEnricher() inside it.
 */

type ServerDataFn = (id: string, slug: string, data?: any) => Promise<any>;

declare global {
    var __serverDataHooksRegistry: Map<string, ServerDataFn> | undefined;
    var __productEnrichers: ProductEnricherFn[] | undefined;
    var __categoryEnrichers: CategoryEnricherFn[] | undefined;
}

const _registry = globalThis.__serverDataHooksRegistry ?? (globalThis.__serverDataHooksRegistry = new Map<string, ServerDataFn>());

/**
 * Register a data provider for a content type.
 * Called by plugin lib/serverHooks.ts files.
 */
export function registerServerDataHook(contentType: string, fn: ServerDataFn): void {
    _registry.set(contentType, fn);
}

/**
 * Run the registered data provider for a content type.
 * Returns undefined if no provider is registered for that type.
 */
export async function runServerDataHook(
    contentType: string,
    id: string,
    slug: string,
    data?: any
): Promise<any | undefined> {
    let fn = _registry.get(contentType);
    if (!fn) {
        loadServerHooks();
        fn = _registry.get(contentType);
    }
    if (!fn) return undefined;
    try {
        const result = await fn(id, slug, data);
        return result;
    } catch (err) {
        console.error(`[runServerDataHook] Error running hook for "${contentType}":`, err);
        return undefined;
    }
}

// ─── Product enricher registry ────────────────────────────────────────────────
//
// WordPress-style: any plugin can register an async enricher that receives
// the base pageData and returns additional fields merged on top.
//
// Usage in plugin/compare/lib/serverHooks.ts:
//   registerProductEnricher(async (pageData, postData) => {
//       const compareProducts = await fetchCompare(postData.info._compare);
//       return { compareProducts };
//   });
//
// Usage in plugin/flash-sale/lib/serverHooks.ts:
//   registerProductEnricher(async (pageData, postData) => {
//       const campaign = await fetchCampaign(postData._id, postData.category);
//       return { flashSaleCampaign: campaign };
//   });
//
// product/lib/serverHooks.ts calls runProductEnrichers(baseData, postData)
// which merges all enricher results — zero manual imports needed.

type ProductEnricherFn = (
    pageData: Record<string, any>,
    postData: any
) => Promise<Record<string, any>>;

const _productEnrichers: ProductEnricherFn[] = globalThis.__productEnrichers ?? (globalThis.__productEnrichers = []);

/**
 * Register a product page data enricher.
 * Called by plugin lib/serverHooks.ts files (compare, flash-sale, etc.)
 * The returned object is shallow-merged into the product pageData.
 * Errors are caught per-enricher — one failing plugin never breaks the page.
 */
export function registerProductEnricher(fn: ProductEnricherFn): void {
    _productEnrichers.push(fn);
}

/**
 * Run all registered product enrichers and merge their results.
 * Called by product/lib/serverHooks.ts after building the base pageData.
 */
export async function runProductEnrichers(
    baseData: Record<string, any>,
    postData: any
): Promise<Record<string, any>> {
    let merged = { ...baseData };
    for (const fn of _productEnrichers) {
        try {
            const extra = await fn(merged, postData);
            merged = { ...merged, ...extra };
        } catch { /* enricher error — skip, keep existing data */ }
    }
    return merged;
}

// ─── Category enricher registry ───────────────────────────────────────────────
// Same pattern for category pages (product-category, brands, etc.)

type CategoryEnricherFn = (
    pageData: Record<string, any>,
    catData: any
) => Promise<Record<string, any>>;

const _categoryEnrichers: CategoryEnricherFn[] = globalThis.__categoryEnrichers ?? (globalThis.__categoryEnrichers = []);

/**
 * Register a category page data enricher.
 * Called by plugin lib/serverHooks.ts files (flash-sale for category pages, etc.)
 */
export function registerCategoryEnricher(fn: CategoryEnricherFn): void {
    _categoryEnrichers.push(fn);
}

/**
 * Run all registered category enrichers and merge their results.
 * Called by product/lib/serverHooks.ts for product-category pages.
 */
export async function runCategoryEnrichers(
    baseData: Record<string, any>,
    catData: any
): Promise<Record<string, any>> {
    let merged = { ...baseData };
    for (const fn of _categoryEnrichers) {
        try {
            const extra = await fn(merged, catData);
            merged = { ...merged, ...extra };
        } catch { /* enricher error — skip */ }
    }
    return merged;
}

// ── Auto-discover all plugin server hook files ────────────────────────────────
// require.context scans plugin/*/lib/serverHooks.ts at build time.
// Each discovered file is executed (side-effect: calls registerServerDataHook).
// This file is only ever imported server-side so the Mongoose imports inside
// those serverHooks files never reach the client bundle.

interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
    (id: string): any;
};

// Plugin server hooks
const serverHookContext = require.context(
    "../plugin",
    true,
    /serverHooks\.(ts|js)$/
);

function loadServerHooks() {
    try {
        const keys = serverHookContext.keys();
        keys.forEach((key: string) => {
            try {
                serverHookContext(key);
            } catch (err: any) {
                console.error(`[serverDataHooks] Failed to load ${key}:`, err);
            }
        });
    } catch (e: any) {
        console.error(`[loadServerHooks] error:`, e);
    }
}

loadServerHooks();

// Plugin action hooks (server-only Mongoose action handlers)
// Kept in a separate file (serverActionHooks.ts) so its require.context does not
// conflict with serverDataHooks in Webpack's module context cache.
require("./serverActionHooks");

// Core server hooks — always registered regardless of active plugins
// Use require() (not import) so this runs AFTER _registry is initialised.
// A static import would be hoisted above the `const _registry = new Map()`
// assignment, causing a TDZ ReferenceError on `_registry`.
require("./coreServerHooks");
