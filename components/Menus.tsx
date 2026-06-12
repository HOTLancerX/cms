import { getMenuByLocation } from '@/lib/menu';
import MenuClients from './MenuClients';
import type { MenuItem } from '@/models/Menu';
import connectDB from '@/lib/mongodb';
import BuilderModel from '@/models/builder';

interface MenusProps {
    location: string;
    settings?: Record<string, any>;
    style?: number;
    className?: string;
}

/**
 * Recursively collect all unique builderIds from the menu tree.
 * Matches items where type === 'builder' OR displayStyle === 'builder'.
 */
function collectBuilderIds(items: MenuItem[]): string[] {
    const ids: string[] = [];
    for (const item of items) {
        if ((item.type === 'builder' || item.displayStyle === 'builder') && item.builderId) {
            ids.push(item.builderId);
        }
        if (item.children?.length) {
            ids.push(...collectBuilderIds(item.children));
        }
    }
    return [...new Set(ids)];
}

/**
 * Server component — fetches menu items + any referenced builder content
 * server-side, then passes everything to MenuClients for interactive rendering.
 *
 * Builder panels are rendered from pre-fetched content (no client fetch needed).
 *
 * Usage:  <Menus location="header-1" settings={settings} />
 */
export default async function Menus({ location, settings = {}, style, className }: MenusProps) {
    const menuItems = await getMenuByLocation(location).catch(() => []);

    if (!menuItems || menuItems.length === 0) return null;

    // Pre-fetch builder content for all builder-type items in this menu
    const builderIds = collectBuilderIds(menuItems);
    const builderContent: Record<string, any[]> = {};

    if (builderIds.length > 0) {
        await connectDB();
        await Promise.all(
            builderIds.map(async (id) => {
                try {
                    const doc = await BuilderModel.findById(id).lean();
                    if (doc?.content && Array.isArray(doc.content)) {
                        builderContent[id] = doc.content as any[];
                    }
                } catch {
                    // leave empty — BuilderPanel will render nothing
                }
            })
        );
    }

    return (
        <MenuClients
            menuItems={menuItems}
            settings={settings}
            style={style}
            className={className}
            builderContent={builderContent}
        />
    );
}
