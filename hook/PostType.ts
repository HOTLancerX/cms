/**
 * Server-side post type registry.
 *
 * Calls register() on every plugin module so their addPostType(...)
 * calls populate the permanent _postTypes store in hook/index.ts.
 *
 * That store is never cleared by clearHooks() so it is always available
 * for server components regardless of client-side state.
 *
 * Import this file once in any server component that needs post types:
 *   import { getPostTypes } from "@/hook/PostType";
 */

import type { PostTypeField } from "@/hook";
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

// Always register core post types first (blog, page, etc.)
coreRegister();

// Call register() on every plugin — addPostType() deduplicates, so repeated
// calls (e.g. hot-reload) are safe.
pluginContext.keys().forEach((key: string) => {
    const mod = pluginContext(key);
    if (typeof mod.register === "function") {
        mod.register();
    }
});

/**
 * Returns all registered post types across all plugins + core.
 * Uses dynamic require to avoid circular import issues with Turbopack.
 */
export function getPostTypes(): PostTypeField[] {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hook = require("@/hook") as typeof import("@/hook");
    return hook.getAllPostTypes();
}
