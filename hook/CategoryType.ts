/**
 * Server-side category type registry.
 *
 * Calls register() on every plugin module so their addCatType(...)
 * calls populate the permanent _catTypes store in hook/index.ts.
 *
 * That store is never cleared by clearHooks() so it is always available
 * for server components regardless of client-side state.
 *
 * Import this file once in any server component that needs category types:
 *   import { getCatTypes } from "@/hook/CategoryType";
 */

import { getAllCatTypes } from "@/hook";
import type { CatTypeField } from "@/hook";
import { register as coreRegister } from "@/components/admin";

interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
    (id: string): any;
};

const pluginContext = require.context(
    "../plugin",
    true,
    /^\.\/[^/]+\/index\.(ts|tsx|js|jsx)$/
);

// Always register core category types first (blog-category, page-category, etc.)
coreRegister();

// Call register() on every plugin — addCatType() deduplicates, so repeated
// calls (e.g. hot-reload) are safe.
pluginContext.keys().forEach((key: string) => {
    const mod = pluginContext(key);
    if (typeof mod.register === "function") {
        mod.register();
    }
});

/**
 * Returns all registered category types across all plugins + core.
 */
export function getCatTypes(): CatTypeField[] {
    return getAllCatTypes();
}
