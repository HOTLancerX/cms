/**
 * cms/hook/headCss.ts
 *
 * Server-side dynamic Head CSS registry and evaluator.
 * Allows plugins to register styles via addHook("head.css", ...) that are:
 * 1. Automatically collected from active plugins.
 * 2. Evaluated on the server with current site settings.
 * 3. Cached in production memory to prevent redundant re-computation on every request.
 */

import { getAllHeadCss } from "@/hook";
import type { CssHookField } from "@/hook";

interface RequireContext {
    keys(): string[];
    (id: string): any;
}

declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
    (id: string): any;
};

// Scan and load all plugin index modules to populate hooks
const pluginContext = require.context(
    "../plugin",
    true,
    /^\.\/[^/]+\/index\.(ts|tsx|js|jsx)$/
);

function ensurePluginsRegistered() {
    pluginContext.keys().forEach((key: string) => {
        try {
            const mod = pluginContext(key);
            if (mod && typeof mod.register === "function") {
                mod.register();
            }
        } catch {
            // Silently tolerate during dev HMR
        }
    });
}

// Ensure initial registration
ensurePluginsRegistered();

export interface EvaluatedHeadCss {
    key: string;
    id: string;
    css: string;
    media?: string;
    position?: number;
}

// In-memory cache for production mode
interface CacheEntry {
    cacheKey: string;
    data: EvaluatedHeadCss[];
}

let _productionCssCache: CacheEntry | null = null;

/**
 * Returns all evaluated <style> items from active plugins registered for "head.css".
 * In production mode, caches the compiled CSS in memory to avoid repeated evaluation.
 *
 * @param settings - Global site settings passed from RootLayout
 * @param activeNxSet - Set of currently active plugin nx identifiers
 */
export async function getHeadCssCached(
    settings?: any,
    activeNxSet?: Set<string>
): Promise<EvaluatedHeadCss[]> {
    ensurePluginsRegistered();

    const isProd = process.env.NODE_ENV === "production";

    // Generate cache key based on settings state and active plugin list
    const activePluginsKey = activeNxSet ? Array.from(activeNxSet).sort().join(",") : "all";
    const settingsFingerprint = settings
        ? `${settings._id || ""}_${settings.updatedAt || ""}_${settings.visual_description_css?.length || 0}`
        : "no-settings";
    const cacheKey = `${activePluginsKey}::${settingsFingerprint}`;

    if (isProd && _productionCssCache && _productionCssCache.cacheKey === cacheKey) {
        return _productionCssCache.data;
    }

    const rawHooks: CssHookField[] = getAllHeadCss(activeNxSet);
    const results: EvaluatedHeadCss[] = [];

    for (const hook of rawHooks) {
        try {
            let compiledCss = "";
            if (typeof hook.getCss === "function") {
                const res = hook.getCss(settings);
                compiledCss = res instanceof Promise ? await res : res;
            } else if (typeof hook.css === "string") {
                compiledCss = hook.css;
            }

            if (compiledCss && compiledCss.trim().length > 0) {
                results.push({
                    key: hook.key,
                    id: hook.id || `plugin-css-${hook.key}`,
                    css: compiledCss,
                    media: hook.media,
                    position: hook.position ?? 100,
                });
            }
        } catch (err) {
            console.error(`[headCss] Error evaluating CSS hook "${hook.key}":`, err);
        }
    }

    results.sort((a, b) => (a.position ?? 100) - (b.position ?? 100));

    if (isProd) {
        _productionCssCache = {
            cacheKey,
            data: results,
        };
    }

    return results;
}

/**
 * Manually invalidate the production CSS cache (e.g. when settings are updated).
 */
export function invalidateHeadCssCache(): void {
    _productionCssCache = null;
}
