import connectDB from "@/lib/mongodb";
import Template from "@/models/template";
import BuilderModel from "@/models/builder";
import { getActivePluginNames } from "@/hook/PluginListServer";
import { getRootPages } from "@/hook/rootPages";
import { Settings } from "@/lib/settings";
import { getMenuByLocation } from "@/lib/menu";
import { withCache } from "@/lib/cache";
import type { MenuItem } from "@/models/Menu";

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

    // Fetch all four header menu slots here — the only place in the tree
    // where it is safe to import mongoose (pure server route, never bundled
    // client-side via the hook registration system).
    const topSlot    = settings.header_top_menu    as string | undefined;
    const mainSlot   = settings.header_main_menu   as string | undefined;
    const rightSlot  = settings.header_right_menu  as string | undefined;
    const mobileSlot = settings.header_mobile_menu as string | undefined;

    const [topItems, mainItems, rightItems, mobileItems] = await Promise.all([
        topSlot    ? getMenuByLocation(topSlot).catch(() => [])    : Promise.resolve([]),
        mainSlot   ? getMenuByLocation(mainSlot).catch(() => [])   : Promise.resolve([]),
        rightSlot  ? getMenuByLocation(rightSlot).catch(() => [])  : Promise.resolve([]),
        mobileSlot ? getMenuByLocation(mobileSlot).catch(() => []) : Promise.resolve([]),
    ]);

    // Pre-fetch builder content for any builder-type items across all slots
    // so headers can pass it down to MenuClients without doing DB work themselves.
    function collectBuilderIds(items: MenuItem[]): string[] {
        const ids: string[] = [];
        for (const item of items) {
            if ((item.type === 'builder' || item.displayStyle === 'builder') && item.builderId) {
                ids.push(item.builderId);
            }
            if (item.children?.length) ids.push(...collectBuilderIds(item.children));
        }
        return ids;
    }

    const allBuilderIds = [...new Set([
        ...collectBuilderIds(topItems),
        ...collectBuilderIds(mainItems),
        ...collectBuilderIds(rightItems),
        ...collectBuilderIds(mobileItems),
    ])];

    const builderContent: Record<string, any[]> = {};
    if (allBuilderIds.length > 0) {
        await Promise.all(
            allBuilderIds.map(async (id) => {
                try {
                    const doc = await BuilderModel.findById(id).lean();
                    if (doc?.content && Array.isArray(doc.content)) {
                        builderContent[id] = doc.content as any[];
                    }
                } catch { /* silent */ }
            })
        );
    }

    // ── root.root widgets (floating / global — rendered after footer) ──────────
    // Plugins register components with addHook("root.root", [...], nx).
    // Only entries with slug "root" and an active plugin are included.
    const rootWidgets = getRootPages().filter(
        (p) =>
            p.slug === "root" &&
            p.type !== "header" &&
            p.type !== "footer" &&
            (p.pluginNx === CORE_NX || activeNxSet.has(p.pluginNx!)) &&
            p.component
    );

    return (
        <>
            {HeaderComponent && (
                <HeaderComponent
                    settings={settings}
                    topItems={topItems}
                    mainItems={mainItems}
                    rightItems={rightItems}
                    mobileItems={mobileItems}
                    builderContent={builderContent}
                />
            )}
            {children}
            {FooterComponent && <FooterComponent settings={settings} />}
            {rootWidgets.map((widget) => {
                const WidgetComponent = widget.component as React.ComponentType<any>;
                return (
                    <WidgetComponent
                        key={`${widget.pluginNx}-${widget.key}`}
                        settings={settings}
                    />
                );
            })}
        </>
    );
}
