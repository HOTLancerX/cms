import connectDB from "@/lib/mongodb";
import Template from "@/models/template";
import { getActivePluginNames } from "@/hook/PluginListServer";
import { getRootPages } from "@/hook/rootPages";
import { Settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const CORE_NX = "com.system.core";

/**
 * Resolve the active layout component for "header" or "footer".
 * Mirrors the resolveTemplate() logic in [...slug]/page.tsx but targets
 * entries with slug === "layout" instead of slug === "dynamic".
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

    // Check what the admin has set as default in the DB
    const dbDefault = await Template.findOne({ type, isDefault: true }).lean() as any;
    if (dbDefault) {
        const match = candidates.find(
            (p) => p.label === dbDefault.label && p.pluginNx === dbDefault.pluginNx
        );
        if (match) return match;
    }

    // Fall back to the first-boot active hint, then first candidate
    return candidates.find((p) => p.active === true) ?? candidates[0];
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await connectDB();

    const [activeNxList, settings] = await Promise.all([
        getActivePluginNames(),
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
