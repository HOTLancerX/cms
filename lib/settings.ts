import connectDB from "./mongodb";
import Setting, { type ISetting } from "@/models/settings";
import { withCache } from "./cache";

/**
 * Fetch ALL settings — returns a flat map: { [title]: content }
 * Server Components only.
 * In production (NEXT_PUBLIC_CACHE=production) results are cached for 24 hours
 * under the "cms-root" tag and revalidated via POST /api/cache/revalidate.
 */
export async function Settings(): Promise<Record<string, any>> {
    return withCache("settings:all", async () => {
        try {
            await connectDB();
            const docs = await Setting.find({}).lean<ISetting[]>();
            const map: Record<string, any> = {};
            docs.forEach((s) => { map[s.title] = s.content; });
            return map;
        } catch (error) {
            console.error("Error fetching settings:", error);
            return { siteName: "Site", header: 1, footer: 1, homepage: "" };
        }
    })();
}

/**
 * Fetch a single setting by title.
 * Returns null if not found or on error.
 * In production results are cached for 24 hours under the "cms-root" tag.
 */
export async function getSetting(title: string): Promise<any> {
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
}
