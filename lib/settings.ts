import connectDB from "./mongodb";
import Setting, { type ISetting } from "@/models/settings";

/**
 * Fetch ALL settings — returns a flat map: { [title]: content }
 * Server Components only. Reads directly from MongoDB.
 */
export async function Settings(): Promise<Record<string, any>> {
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
}

/**
 * Fetch a single setting by title.
 * Returns null if not found or on error.
 * Reads directly from MongoDB.
 */
export async function getSetting(title: string): Promise<any> {
    try {
        await connectDB();
        const doc = await Setting.findOne({ title }).lean<ISetting>();
        return doc ? doc.content : null;
    } catch (error) {
        console.error("Error fetching setting:", error);
        return null;
    }
}
