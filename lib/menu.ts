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

import { cache } from "react";
import connectDB from "./mongodb";
import MenuModel, { type MenuItem } from "@/models/Menu";
import { withCache } from "./cache";

/**
 * Fetch the active menu assigned to a given location slot and return its
 * items array. Returns an empty array when no matching active menu exists.
 * Cached in RAM and Data Cache.
 *
 * @param location  The location key, e.g. "header-1", "footer-2", "mobile-1"
 */
export const getMenuByLocation: (location: string) => Promise<MenuItem[]> = cache(
    async (location: string): Promise<MenuItem[]> => {
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
);

/**
 * Fetch a menu by its MongoDB _id.
 * Returns null when not found.
 */
export const getMenuById: (id: string) => Promise<{ title: string; items: MenuItem[] } | null> = cache(
    async (id: string): Promise<{ title: string; items: MenuItem[] } | null> => {
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
);

/**
 * Fetch a menu by either its MongoDB _id or its location slot.
 * Returns its items array (empty array if not found or inactive).
 */
export const getMenuBySlot: (slotOrId: string) => Promise<MenuItem[]> = cache(
    async (slotOrId: string): Promise<MenuItem[]> => {
        if (!slotOrId) return [];
        const trimmed = slotOrId.trim();

        // 1. If 24-hex ObjectId, look up by ID
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
            const byId = await getMenuById(trimmed);
            if (byId && Array.isArray(byId.items) && byId.items.length > 0) {
                return byId.items;
            }
        }

        // 2. Look up by location
        const byLoc = await getMenuByLocation(trimmed);
        if (byLoc && byLoc.length > 0) return byLoc;

        // 3. Fallback: try getMenuById in case it was not 24-hex
        const fallback = await getMenuById(trimmed);
        return fallback?.items ?? [];
    }
);

