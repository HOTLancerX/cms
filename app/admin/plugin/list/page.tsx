import PluginStoreList from "./List";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
const headers = { "x-license-key": LICENSE_KEY };

/**
 * Admin › Plugin Store
 *
 * Catalog (available plugins) comes from the root DB via Express.
 * Installed state (per-domain) also comes from Express.
 * Cross-references by `nx` to show Install / Update / Activate states.
 */
export default async function PluginListPage() {
    const [availableRes, installedRes] = await Promise.all([
        fetch(`${EXPRESS_API}/plugin/available`, { headers, cache: "no-store" }),
        fetch(`${EXPRESS_API}/plugin/installed`, { headers, cache: "no-store" }),
    ]);

    const { plugins: available = [] } = availableRes.ok ? await availableRes.json() : { plugins: [] };
    const { plugins: installed = [] } = installedRes.ok ? await installedRes.json() : { plugins: [] };

    return <PluginStoreList available={available} installed={installed} />;
}
