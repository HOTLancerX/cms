import { getInstalledPluginMetas } from "@/hook/PluginListServer";
import PluginList from "./Plugin";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

/**
 * Admin › Installed Plugins
 *
 * 1. Discovers every plugin folder in plugin/ via getInstalledPluginMetas()
 * 2. Fetches DB state from Express (tenant-scoped)
 * 3. Auto-registers newly discovered plugins into Express if not already there
 * 4. Merges and passes the list to the client component
 */
export default async function PluginPage() {
    const fileMetas = await getInstalledPluginMetas();

    const headers = { "x-license-key": LICENSE_KEY, "Content-Type": "application/json" };

    // Fetch current DB state
    const dbRes = await fetch(`${EXPRESS_API}/plugin/installed`, {
        headers, cache: "no-store",
    });
    const { plugins: dbDocs = [] } = dbRes.ok ? await dbRes.json() : { plugins: [] };

    const dbMap = new Map(dbDocs.map((d: any) => [d.nx, d]));

    // Auto-register any plugins found on disk but not yet in the tenant DB
    await Promise.all(
        fileMetas
            .filter((meta) => !dbMap.has(meta.nx))
            .map((meta) =>
                fetch(`${EXPRESS_API}/plugin/installed`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        nx: meta.nx,
                        name: meta.name,
                        version: meta.version,
                        icon: meta.icon,
                        color: meta.color,
                        status: "inactive",
                    }),
                }).catch(() => null)
            )
    );

    // Re-fetch after potential inserts
    const freshRes = await fetch(`${EXPRESS_API}/plugin/installed`, {
        headers, cache: "no-store",
    });
    const { plugins: freshDocs = [] } = freshRes.ok ? await freshRes.json() : { plugins: [] };
    const freshMap = new Map(freshDocs.map((d: any) => [d.nx, d]));

    // Merge: file metadata wins for display fields
    const plugins = fileMetas.map((meta) => {
        const dbRecord = freshMap.get(meta.nx) as any;
        return {
            _id: dbRecord?._id ?? null,
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

    return <PluginList initialPlugins={plugins} />;
}
