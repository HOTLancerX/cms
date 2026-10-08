/**
 * hook/userPages.ts — Server-side user account pages registry.
 *
 * Mirror of adminPages.ts for the account section.
 * Plugins register pages via addHook("user.page", ...) and nav items
 * via addHook("user.nav", ...) in their index.ts register() function.
 *
 * The permanent stores (_userPages, _userNavItems) in hook/index.ts are
 * never cleared, so they are always available for server components.
 */

import { getAllUserPages, getAllUserNavItems } from "@/hook";
import type { FormHookField, NavHookField } from "@/hook";

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

pluginContext.keys().forEach((key: string) => {
    try {
        const mod = pluginContext(key);
        if (mod && typeof mod.register === "function") {
            mod.register();
        }
    } catch (err) {
        // Silently tolerate uninstantiated or stale HMR modules during dev
    }
});

export function getUserPages(): FormHookField[] {
    return getAllUserPages();
}

export function getUserNavItems(): NavHookField[] {
    return getAllUserNavItems();
}
