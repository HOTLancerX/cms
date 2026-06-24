/**
 * Server-only plugin helpers.
 *
 * All plugin state is now stored in Express (tenant-scoped).
 * Only import from Server Components or API routes.
 */

import type { PluginMeta } from "@/hook";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
const headers = { "x-license-key": LICENSE_KEY };

/**
 * Returns the nx identifiers of every active plugin for this tenant.
 * Status is the DB value — only "active" passes. The isExpired / isNotStarted
 * flags on each plugin are informational only and do not affect this list.
 */
export async function getActivePluginNames(): Promise<string[]> {
    try {
        const res = await fetch(`${EXPRESS_API}/plugin/installed`, {
            headers,
            cache: "no-store",
        });
        if (!res.ok) return [];
        const { plugins = [] } = await res.json() as { plugins: any[] };
        return plugins
            .filter((p: any) => p.status === "active")
            .map((p: any) => p.nx as string);
    } catch {
        return [];
    }
}

/**
 * Returns metadata for every installed plugin for this tenant.
 * Used by the admin plugin page to merge with filesystem metas.
 */
export async function getInstalledPluginMetas(): Promise<PluginMeta[]> {
    try {
        const res = await fetch(`${EXPRESS_API}/plugin/installed`, {
            headers,
            cache: "no-store",
        });
        if (!res.ok) return [];
        const { plugins = [] } = await res.json() as { plugins: any[] };
        return plugins.map((d: any) => ({
            nx: d.nx,
            name: d.name,
            version: d.version,
            description: d.description ?? "",
            author: d.author ?? "",
            path: d.path ?? "",
            icon: d.icon ?? "solar:plugin-bold",
            color: d.color ?? "from-violet-500 to-purple-600",
        }));
    } catch {
        return [];
    }
}
