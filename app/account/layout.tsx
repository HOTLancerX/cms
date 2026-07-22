import connectDB from "@/lib/mongodb";
import Template from "@/models/template";
import BuilderModel from "@/models/builder";
import { getActivePluginNames } from "@/hook/PluginListServer";
import { getRootPages } from "@/hook/rootPages";
import { Settings } from "@/lib/settings";
import { getMenuByLocation } from "@/lib/menu";
import { withCache } from "@/lib/cache";
import type { MenuItem } from "@/models/Menu";
import { ActivePluginsProvider } from "@/context/ActivePluginsContext";
import Builder from "@/components/Builder";
import AccountClientLayout from "./AccountClientLayout";

export const dynamic = "force-dynamic";

const CORE_NX = "com.system.core";
const BUILDER_NX = "com.system.builder";

/**
 * Resolve the active layout component for "header" or "footer".
 */
async function resolveLayout(
    type: "header" | "footer",
    activeNxSet: Set<string>
): Promise<{ builderId: string } | import("@/hook").FormHookField | null> {
    const rootPages = getRootPages();

    const candidates = rootPages.filter(
        (p) =>
            p.type === type &&
            p.slug === "layout" &&
            (p.pluginNx === CORE_NX || activeNxSet.has(p.pluginNx!))
    );

    const dbDefault = await withCache(`template:default:${type}`, async () => {
        await connectDB();
        return Template.findOne({ type, isDefault: true }).lean() as Promise<any>;
    })();

    if (dbDefault) {
        if (dbDefault.builderId) {
            return { builderId: dbDefault.builderId as string };
        }

        const match = candidates.find(
            (p) => p.label === dbDefault.label && p.pluginNx === dbDefault.pluginNx
        );
        if (match) return match;
    }

    return candidates.find((p) => p.active === true) ?? candidates[0] ?? null;
}

const getActivePluginNamesCached = () =>
    withCache("plugins:active", getActivePluginNames)();

export default async function AccountLayout({
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

    const isBuilderLayout = (
        layout: { builderId: string } | import("@/hook").FormHookField | null
    ): layout is { builderId: string } =>
        !!layout && "builderId" in layout;

    const HeaderComponent =
        !headerLayout || isBuilderLayout(headerLayout)
            ? null
            : (headerLayout.component as React.ComponentType<any> | null ?? null);
    const headerBuilderId =
        headerLayout && isBuilderLayout(headerLayout) ? headerLayout.builderId : null;

    const FooterComponent =
        !footerLayout || isBuilderLayout(footerLayout)
            ? null
            : (footerLayout.component as React.ComponentType<any> | null ?? null);
    const footerBuilderId =
        footerLayout && isBuilderLayout(footerLayout) ? footerLayout.builderId : null;

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
            {headerBuilderId ? (
                <Builder id={headerBuilderId} />
            ) : HeaderComponent ? (
                <HeaderComponent
                    settings={settings}
                    topItems={topItems}
                    mainItems={mainItems}
                    rightItems={rightItems}
                    mobileItems={mobileItems}
                    builderContent={builderContent}
                />
            ) : null}
            <ActivePluginsProvider initialPlugins={activeNxList}>
                <AccountClientLayout>{children}</AccountClientLayout>
            </ActivePluginsProvider>
            {footerBuilderId ? (
                <Builder id={footerBuilderId} />
            ) : FooterComponent ? (
                <FooterComponent settings={settings} />
            ) : null}
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
