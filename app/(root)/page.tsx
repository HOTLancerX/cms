import connectDB from "@/lib/mongodb";
import Builder from "@/components/Builder";
import Template from "@/models/template";
import { Settings } from "@/lib/settings";
import { getAuthSession } from "@/lib/session";
import { getRootPages } from "@/hook/rootPages";
import { resolveLazyComponent } from "@/hook/pluginHooks";
import { withCache } from "@/lib/cache";
import mongoose from "mongoose";

// ISR: Caches homepage statically in local/CDN cache and revalidates every 60s
export const revalidate = 60;

/**
 * Homepage — Server Side Rendered (SSR)
 * Supports:
 *  1. type=both: Universal homepage builder / template for all visitors
 *  2. type=login: Distinct homepage builder / template for Logged-In vs Guest users
 *  3. Dynamically resolves DB templates, plugin hook templates, or visual builder documents.
 */
export default async function Home() {
    const settings = await Settings();

    const loggedInSetting = typeof settings.homepage_logged_in === "string" ? settings.homepage_logged_in.trim() : "";
    const guestSetting = typeof settings.homepage_guest === "string" ? settings.homepage_guest.trim() : "";
    const defaultSetting = typeof settings.homepage === "string" ? settings.homepage.trim() : "";

    // Only inspect auth session if a distinct logged-in homepage is explicitly configured
    const hasDistinctLoginHome = Boolean(
        loggedInSetting &&
        loggedInSetting !== guestSetting &&
        loggedInSetting !== defaultSetting
    );

    let user: any = null;
    if (hasDistinctLoginHome) {
        user = await getAuthSession();
    }

    const isLoggedIn = Boolean(user?._id);

    const target = isLoggedIn
        ? loggedInSetting || guestSetting || defaultSetting
        : guestSetting || defaultSetting || loggedInSetting;

    const trimmed = target?.trim();
    if (!trimmed) return null;

    // 1. Explicit builder ID format (builder:<id>)
    if (trimmed.startsWith("builder:")) {
        const builderId = trimmed.replace("builder:", "");
        return <Builder id={builderId} />;
    }

    // 2. Check if target matches a DB Template record by _id, key, or label (cached)
    let targetKey = trimmed;
    try {
        const tplDoc = await withCache(`template:homepage:${trimmed}`, async () => {
            await connectDB();
            let doc: any = null;
            if (mongoose.Types.ObjectId.isValid(trimmed)) {
                doc = await Template.findById(trimmed).lean();
            }
            if (!doc) {
                doc = await Template.findOne({
                    $or: [{ key: trimmed }, { label: trimmed }],
                }).lean();
            }
            return doc;
        })();

        if (tplDoc) {
            // If template points to a visual builder document
            if (tplDoc.builderId) {
                return <Builder id={tplDoc.builderId} />;
            }
            if (tplDoc.key) {
                targetKey = tplDoc.key;
            }
        }
    } catch {
        // Fall through to hook search
    }

    // 3. Dynamically match registered root.pages template or plugin page
    const rootPages = getRootPages();
    const matchedPage = rootPages.find(
        (p) =>
            p.key === targetKey ||
            p.key === trimmed ||
            p.label === targetKey ||
            p.label === trimmed ||
            p.slug === targetKey ||
            `slug:${p.slug}` === targetKey ||
            `template:${p.type}:${p.label}` === targetKey ||
            `hook:${p.type}:${p.label}` === targetKey ||
            p.label?.toLowerCase() === targetKey.toLowerCase() ||
            p.key?.toLowerCase() === targetKey.toLowerCase()
    );

    if (matchedPage) {
        let Component = matchedPage.component as any;
        if (!Component && matchedPage.lazyPath) {
            Component = await resolveLazyComponent(matchedPage.lazyPath);
        }
        if (Component) {
            return <Component settings={settings} user={user} />;
        }
    }

    // 4. Fallback: Treat trimmed ID as Builder Page ID
    return <Builder id={trimmed} />;
}
