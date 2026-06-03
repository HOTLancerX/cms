/**
 * Server-only plugin helpers.
 *
 * All lookups use `nx` as the canonical unique identifier.
 * Does NOT import PluginList.ts — that file uses require.context which
 * pulls in plugin modules with JSX/components, causing server bundle errors.
 *
 * Only import from Server Components or API routes.
 */

import connectDB from "@/lib/mongodb";
import Plugin from "@/models/plugin";
import type { PluginMeta } from "@/hook";

/**
 * Query the DB and return the `nx` identifiers of every active plugin.
 */
export async function getActivePluginNames(): Promise<string[]> {
    await connectDB();
    const docs = await Plugin.find({ status: "active" }, { nx: 1, _id: 0 }).lean();
    return docs.map((d: any) => d.nx);
}

/**
 * Returns metadata for every plugin discovered — reads from DB.
 * The DB is populated automatically by the admin plugin page on first load.
 */
export async function getInstalledPluginMetas(): Promise<PluginMeta[]> {
    await connectDB();
    const docs = await Plugin.find({}).lean();
    return docs.map((d: any) => ({
        nx: d.nx,
        name: d.name,
        version: d.version,
        description: d.description ?? "",
        author: d.author ?? "",
        path: "",
        icon: d.icon ?? "solar:plugin-bold",
        color: d.color ?? "from-violet-500 to-purple-600",
    }));
}
