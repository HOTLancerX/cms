import connectDB from "@/lib/mongodb";
import Template from "@/models/template";
import { getActivePluginNames } from "@/hook/PluginListServer";
import { getRootPages } from "@/hook/rootPages";
import { Settings } from "@/lib/settings";
import { withCache } from "@/lib/cache";

// Remove force-dynamic so Next.js Data Cache can take effect in production.
// In development (NEXT_PUBLIC_CACHE !== "production") withCache is a no-op
// and every request hits MongoDB directly — same as before.
export const dynamic = "force-dynamic";

const CORE_NX = "com.system.core";

/**
 * Resolve the active layout component for "header" or "footer".
 * The DB lookup (Template.findOne) is wrapped in a 24-hour cache in production.
 */
async function resolveLayout(
    type: "header" | "footer",
    activeNxSet: Set<string>
) {
    const rootPages = getRootPages();

    const candidates = rootPages.filter(
        (p) =>
            p.type === type &&
            p.slug === "layout" &&
            (p.pluginNx === CORE_NX || activeNxSet.has(p.pluginNx!))
    );

    if (candidates.length === 0) return null;

    // Cache the DB look-up for the default template
    const dbDefault = await withCache(`template:default:${type}`, async () => {
        await connectDB();
        return Template.findOne({ type, isDefault: true }).lean() as Promise<any>;
    })();

    if (dbDefault) {
        const match = candidates.find(
            (p) => p.label === dbDefault.label && p.pluginNx === dbDefault.pluginNx
        );
        if (match) return match;
    }

    return candidates.find((p) => p.active === true) ?? candidates[0];
}

// Cache the active plugin list for 24 hours
const getActivePluginNamesCached = () =>
    withCache("plugins:active", getActivePluginNames)();

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await connectDB();

    const [activeNxList, settings] = await Promise.all([
        getActivePluginNamesCached(),
        Settings(),
    ]);
    const activeNxSet = new Set(activeNxList);

    const [headerLayout, footerLayout] = await Promise.all([
        resolveLayout("header", activeNxSet),
        resolveLayout("footer", activeNxSet),
    ]);

    const HeaderComponent = headerLayout?.component as React.ComponentType<any> | null ?? null;
    const FooterComponent = footerLayout?.component as React.ComponentType<any> | null ?? null;

    return (
        <>
            {HeaderComponent && <HeaderComponent settings={settings} />}
            {children}
            {FooterComponent && <FooterComponent settings={settings} />}
        </>
    );
}
