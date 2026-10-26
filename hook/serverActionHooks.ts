/**
 * hook/serverActionHooks.ts — Discovers and loads plugin actionHooks.ts.
 * Kept in a dedicated file so its require.context does not conflict with
 * serverDataHooks in webpack's compilation context.
 */

interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
    (id: string): any;
};

try {
    const actionHookContext = require.context(
        "../plugin",
        true,
        /actionHooks\.(ts|js)$/
    );
    actionHookContext.keys().forEach((key: string) => {
        try {
            actionHookContext(key);
        } catch {
            // Silently tolerate uninstantiated or stale HMR modules during dev
        }
    });
} catch {
    // Context unavailable
}
