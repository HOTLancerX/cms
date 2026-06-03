/**
 * Dynamic Plugin Registry
 *
 * Automatically discovers and loads ALL plugins from plugin/x/index at
 * build time via require.context. Each plugin exports:
 *   - PLUGINS: PluginMeta  — metadata (nx, name, version, …)
 *   - register(): void     — calls addHook() for all of the plugin's hooks
 *
 * Hooks are NOT registered at module load time. Call reregisterHooks()
 * after arming the gate so only active plugins inject their hooks.
 */

import type { PluginMeta } from "@/hook";
import { setActivePlugins, clearHooks, registerCoreHooks } from "@/hook";
import { register as coreRegister } from "@/components/admin";

interface RequireContext {
    keys(): string[];
    (id: string): any;
}
declare var require: {
    context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
};

const pluginContext = require.context(
    "../plugin",
    true,
    /^\.\/[^/]+\/index\.(ts|tsx|js|jsx)$/
);

interface PluginModule {
    PLUGINS: PluginMeta;
    register: () => void;
}

const pluginModules: PluginModule[] = [];

pluginContext.keys().forEach((key: string) => {
    const mod = pluginContext(key);
    if (mod.PLUGINS && typeof mod.register === "function") {
        pluginModules.push(mod as PluginModule);
    }
});

/** Metadata for every plugin discovered in plugin/ */
export const pluginList: PluginMeta[] = pluginModules.map((m) => m.PLUGINS);

/**
 * Returns metadata for every plugin discovered in plugin/.
 * Used by the admin page to list all plugins regardless of status.
 */
export async function getInstalledPluginMetas(): Promise<PluginMeta[]> {
    return pluginList;
}

/**
 * Clear all registered hooks, arm the gate with the given active nx IDs,
 * then re-run every plugin's register() so only active plugins inject hooks.
 * Core hooks (components/admin/index.ts) are always registered regardless of
 * the active plugin set.
 *
 * Call this on the client whenever the active plugin set is known
 * (e.g. after fetching /api/plugin).
 *
 * @param activeNxIds - nx identifiers of plugins with status "active" in the DB
 */
export function reregisterHooks(activeNxIds: string[]): void {
    clearHooks();
    setActivePlugins(activeNxIds);
    // Always register core hooks first (gate is bypassed for CORE_NX)
    registerCoreHooks(coreRegister);
    // Then register active plugin hooks
    pluginModules.forEach((mod) => mod.register());
}
