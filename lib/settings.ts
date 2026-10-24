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
    return withCache("settings:all", async () => {
        try {
            await connectDB();
            // Exclude huge text/CSS settings from the main layout payload
            const docs = await Setting.find({
                title: { $ne: "visual_description_css" }
            }).lean<ISetting[]>();
            const map: Record<string, any> = {};
            docs.forEach((s) => { map[s.title] = s.content; });
            return map;
        } catch (error) {
            console.error("Error fetching settings:", error);
            return { siteName: "Site", header: 1, footer: 1, homepage: "" };
        }
    })();
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

