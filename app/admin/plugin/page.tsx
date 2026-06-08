import { getInstalledPluginMetas } from "@/hook/PluginListServer";
import PluginList from "./Plugin";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

/**
 * Admin › Installed Plugins
 *
 * 1. Discovers every plugin folder in plugin/ via getInstalledPluginMetas()
 * 2. Fetches current DB state from Express (tenant-scoped)
 * 3. Merges: DB plugins take their persisted status; newly discovered plugins
 *    that are NOT in the DB are shown with status "new" — they are never
 *    auto-inserted. The admin must explicitly activate them.
 */
export default async function PluginPage() {
    const fileMetas = await getInstalledPluginMetas();

    const headers = { "x-license-key": LICENSE_KEY, "Content-Type": "application/json" };

    // Fetch current DB state — no writes here
    const dbRes = await fetch(`${EXPRESS_API}/plugin/installed`, {
        headers,
        cache: "no-store",
    });
    const { plugins: dbDocs = [] } = dbRes.ok ? await dbRes.json() : { plugins: [] };
    const dbMap = new Map(dbDocs.map((d: any) => [d.nx, d]));

    // Merge: file metadata wins for display fields; status comes from DB.
    // Plugins not yet in the DB get status "new" and a null _id.
    const plugins = fileMetas.map((meta) => {
        const dbRecord = dbMap.get(meta.nx) as any;
        return {
            _id: dbRecord?._id ?? null,
            nx: meta.nx,
            name: meta.name,
            version: meta.version,
            description: meta.description,
            author: meta.author,
            icon: meta.icon,
            color: meta.color,
            startDate: dbRecord?.startDate ?? null,
            endDate: dbRecord?.endDate ?? null,
            status: (dbRecord?.status ?? "new") as
                "active" | "inactive" | "new" | "install" | "update" | "delete" | "expired" | "not_started",
        };
    });

    return <PluginList initialPlugins={plugins} />;
}
