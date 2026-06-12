/**
 * lib/menu.ts
 *
 * Server-side helper for fetching menu data.
 * Reads directly from MongoDB (same connection as the rest of the CMS)
 * and wraps the result in a 24-hour cache in production.
 *
 * Usage in a Server Component:
 *   import { getMenuByLocation } from "@/lib/menu";
 *   const items = await getMenuByLocation("header-1");
 */

import connectDB from "./mongodb";
import MenuModel, { type MenuItem } from "@/models/Menu";
import { withCache } from "./cache";

/**
 * Fetch the active menu assigned to a given location slot and return its
 * items array.  Returns an empty array when no matching active menu exists.
 *
 * @param location  The location key, e.g. "header-1", "footer-2", "mobile-1"
 */
export async function getMenuByLocation(location: string): Promise<MenuItem[]> {
    return withCache(`menu:location:${location}`, async () => {
        try {
            await connectDB();

            const menu = await MenuModel.findOne({
                location: location,
                status: "active",
            }).lean();

            if (!menu) return [];

            return (menu.items ?? []) as MenuItem[];
        } catch (error) {
            console.error(`[menu] getMenuByLocation("${location}") error:`, error);
            return [];
        }
    })();
}

/**
 * Fetch a menu by its MongoDB _id.
 * Returns null when not found.
 */
export async function getMenuById(id: string): Promise<{ title: string; items: MenuItem[] } | null> {
    return withCache(`menu:id:${id}`, async () => {
        try {
            await connectDB();

            const menu = await MenuModel.findById(id).lean();
            if (!menu) return null;

            return {
                title: menu.title,
                items: (menu.items ?? []) as MenuItem[],
            };
        } catch (error) {
            console.error(`[menu] getMenuById("${id}") error:`, error);
            return null;
        }
    })();
}
