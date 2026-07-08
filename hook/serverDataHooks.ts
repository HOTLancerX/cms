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
 * Adding a new plugin's category data provider requires ZERO changes here
 * or in page.tsx — just create plugin/myplugin/lib/serverHooks.ts and
 * call registerServerDataHook() inside it.
 */

type ServerDataFn = (id: string, slug: string, data?: any) => Promise<any>;

const _registry = new Map<string, ServerDataFn>();

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
    const fn = _registry.get(contentType);
    if (!fn) return undefined;
    return fn(id, slug, data);
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
    /^\.\/[^/]+\/lib\/serverHooks\.(ts|js)$/
);
serverHookContext.keys().forEach((key: string) => {
    serverHookContext(key);
});

// Plugin action hooks (server-only Mongoose action handlers)
// Each plugin/*/lib/actionHooks.ts registers addAction() handlers that
// touch the DB. Kept separate from index.ts so Mongoose never reaches
// the client bundle.
const actionHookContext = require.context(
    "../plugin",
    true,
    /^\.\/[^/]+\/lib\/actionHooks\.(ts|js)$/
);
actionHookContext.keys().forEach((key: string) => {
    actionHookContext(key);
});

// Core server hooks — always registered regardless of active plugins
// Use require() (not import) so this runs AFTER _registry is initialised.
// A static import would be hoisted above the `const _registry = new Map()`
// assignment, causing a TDZ ReferenceError on `_registry`.
require("./coreServerHooks");
