import { cache } from "react";
import connectDB from "./mongodb";
import Setting, { type ISetting } from "@/models/settings";
import { withCache } from "./cache";

/**
 * Fetch ALL settings — returns a flat map: { [title]: content }
 * Server Components only.
 * Excludes heavy binary/CSS blobs (e.g. visual_description_css 508KB)
 * to keep payload small and ultra-fast. Heavy settings are fetched on-demand via getSetting().
 * Results are cached in RAM (instant 0ms) and under "cms-root" tag.
 */
export const Settings: () => Promise<Record<string, any>> = cache(async (): Promise<Record<string, any>> => {
    try {
        const cached = await withCache("settings:all", async () => {
            await connectDB();
            // Exclude huge text/CSS settings from the main layout payload
            const docs = await Setting.find({
                title: { $ne: "visual_description_css" }
            }).lean<ISetting[]>();
            if (!docs || docs.length === 0) {
                throw new Error("No settings found in database");
            }
            const map: Record<string, any> = {};
            docs.forEach((s) => { map[s.title] = s.content; });
            return map;
        })();
        if (cached && Object.keys(cached).length > 0) {
            return cached;
        }
    } catch (error) {
        console.warn("[Settings] Error loading cached settings:", error);
    }

    // Direct live query fallback without caching failed state
    try {
        await connectDB();
        const docs = await Setting.find({
            title: { $ne: "visual_description_css" }
        }).lean<ISetting[]>();
        if (docs && docs.length > 0) {
            const map: Record<string, any> = {};
            docs.forEach((s) => { map[s.title] = s.content; });
            return map;
        }
    } catch {}

    return {
        siteName: "Baraka Phones",
        header: 1,
        footer: 1,
        homepage: "6ad605716a2fa163acdfc529",
    };
});

/**
 * Fetch a single setting by title.
 * Returns null if not found or on error.
 * Cached in RAM and Data Cache.
 */
export const getSetting: (title: string) => Promise<any> = cache(async (title: string): Promise<any> => {
    return withCache(`settings:${title}`, async () => {
        try {
            await connectDB();
            const doc = await Setting.findOne({ title }).lean<ISetting>();
            return doc ? doc.content : null;
        } catch (error) {
            console.error("Error fetching setting:", error);
            return null;
        }
    })();
});

