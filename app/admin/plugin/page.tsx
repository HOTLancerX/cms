import connectDB from "@/lib/mongodb";
import Plugin from "@/models/plugin";
import { getInstalledPluginMetas } from "@/hook/PluginListServer";
import PluginList from "./Plugin";

export const dynamic = "force-dynamic";

/**
 * Admin › Installed Plugins
 *
 * 1. Auto-discovers every plugin in plugin/ via getInstalledPluginMetas().
 * 2. Auto-registers any newly discovered plugin in the DB with status "inactive".
 * 3. Passes the merged list (DB record + file metadata) to the client component.
 *
 * All DB lookups use `nx` as the canonical unique identifier — name casing
 * and spacing are irrelevant.
 */
export default async function PluginPage() {
    await connectDB();

    // ── 1. Discover all plugins from the plugin/ folder ───────────────────────
    const fileMetas = await getInstalledPluginMetas();
    const pluginNxIds = fileMetas.map((m) => m.nx);

    // ── 2. Fetch current DB records keyed by nx ────────────────────────────────
    const dbDocs = await Plugin.find({ nx: { $in: pluginNxIds } }).lean();
    const dbMap = new Map(dbDocs.map((d: any) => [d.nx, d]));

    // ── 3. Auto-register plugins not yet in DB (status: inactive) ─────────────
    const upsertOps = fileMetas
        .filter((meta) => !dbMap.has(meta.nx))
        .map((meta) =>
            Plugin.create({
                nx: meta.nx,
                name: meta.name,
                version: meta.version,
                icon: meta.icon,
                color: meta.color,
                status: "inactive",
            }).catch(() => null) // ignore duplicate-key races
        );
    await Promise.all(upsertOps);

    // ── 4. Re-fetch after potential inserts ────────────────────────────────────
    const freshDocs = await Plugin.find({ nx: { $in: pluginNxIds } }).lean();
    const freshMap = new Map(freshDocs.map((d: any) => [d.nx, d]));

    // ── 5. Merge: file metadata wins for display fields ────────────────────────
    const plugins = fileMetas.map((meta) => {
        const dbRecord = freshMap.get(meta.nx) as any;
        return {
            _id: dbRecord?._id?.toString() ?? null,
            nx: meta.nx,
            name: meta.name,
            version: meta.version,
            description: meta.description,
            author: meta.author,
            icon: meta.icon,
            color: meta.color,
            status: dbRecord?.status ?? "inactive",
        };
    });

    return <PluginList initialPlugins={JSON.parse(JSON.stringify(plugins))} />;
}
