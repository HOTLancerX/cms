import { AVAILABLE_PLUGINS } from "@/data/plugin";
import connectDB from "@/lib/mongodb";
import Plugin from "@/models/plugin";
import PluginStoreList from "./List";

export const dynamic = "force-dynamic";

/**
 * Admin › Plugin Store
 *
 * Shows ALL plugins from data/plugin.ts (the "store catalog").
 * Cross-references with the DB by `nx` (the canonical unique identifier)
 * to determine per-plugin state:
 *
 *   • Not in DB at all          → "Install"
 *   • In DB, store version >    → "Update"  (store has newer version)
 *   • In DB, versions match     → Activate / Deactivate toggle
 */
export default async function PluginListPage() {
    await connectDB();

    // Match by nx — the true unique key, immune to name casing/spacing drift
    const catalogNxIds = AVAILABLE_PLUGINS.map((p) => p.nx);
    const dbDocs = await Plugin.find({ nx: { $in: catalogNxIds } }).lean();
    const installed = JSON.parse(JSON.stringify(dbDocs));

    return <PluginStoreList available={AVAILABLE_PLUGINS} installed={installed} />;
}
