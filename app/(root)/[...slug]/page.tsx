import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import CatInfo from "@/models/cat_info";
import Template from "@/models/template";
import Permalink from "@/models/permalink";
import { getActivePluginNames } from "@/hook/PluginListServer";
import { getRootPages } from "@/hook/rootPages";
import { getPostTypes } from "@/hook/PostType";
import { getCatTypes } from "@/hook/CategoryType";
import { withCache } from "@/lib/cache";
import { Settings } from "@/lib/settings";
import { runServerDataHook } from "@/hook/serverDataHooks";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface RootPageProps {
    params: Promise<{ slug: string[] }>;
}

const CORE_NX = "com.system.core";

// ─── Cached DB helpers ────────────────────────────────────────────────────────

/** Active plugin list — cached 24 h */
const getActivePluginNamesCached = () =>
    withCache("plugins:active", getActivePluginNames)();

/** Default template for a given content type — cached 24 h */
async function getDefaultTemplate(type: string) {
    return withCache(`template:default:${type}`, async () => {
        await connectDB();
        return Template.findOne({ type, isDefault: true }).lean() as Promise<any>;
    })();
}

/** Permalink map — cached 24 h */
async function getPermalinkMap(
    postTypes: ReturnType<typeof getPostTypes>,
    catTypes: ReturnType<typeof getCatTypes>
): Promise<Record<string, string>> {
    return withCache("permalink:map", async () => {
        await connectDB();

        // Seed any missing defaults (idempotent)
        const toInsert = [
            ...postTypes.map((pt) => ({
                contentType: pt.key,
                prefix: pt.key,
            })),
            ...catTypes.map((ct) => ({
                contentType: ct.key,
                prefix: `${ct.postType}/category`,
            })),
        ];
        if (toInsert.length > 0) {
            try {
                await Permalink.insertMany(toInsert, { ordered: false });
            } catch {
                // Duplicate key errors are expected and safe to ignore
            }
        }

        const docs = await Permalink.find({}).lean();
        const map: Record<string, string> = {};
        (docs as any[]).forEach((d: any) => { map[d.contentType] = d.prefix ?? ""; });
        return map;
    })();
}

/** Individual post with its info map — cached 24 h per slug */
async function getPost(slug: string, type: string) {
    return withCache(`post:${type}:${slug}`, async () => {
        await connectDB();
        const post = await Post.findOne({
            slug,
            type,
            status: "published",
        }).lean() as any;

        if (!post) return null;

        const infoRecords = await PostInfo.find({ postId: post._id }).lean() as any[];
        const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
            acc[r.name] = r.value;
            return acc;
        }, {});

        return { ...post, info: infoMap };
    })();
}

/** Individual category with its info map — cached 24 h per slug */
async function getCat(slug: string, type: string) {
    return withCache(`cat:${type}:${slug}`, async () => {
        await connectDB();
        const cat = await Cat.findOne({
            slug,
            type,
            status: "published",
        }).lean() as any;

        if (!cat) return null;

        const infoRecords = await CatInfo.find({ catId: cat._id }).lean() as any[];
        const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
            acc[r.name] = r.value;
            return acc;
        }, {});

        return { ...cat, info: infoMap };
    })();
}

// ─── Template resolver ────────────────────────────────────────────────────────

async function resolveTemplate(type: string, activeNxSet: Set<string>) {
    const rootPages = getRootPages();
    const candidates = rootPages.filter(
        (p) => p.type === type && p.slug === "dynamic" &&
            (p.pluginNx === CORE_NX || activeNxSet.has(p.pluginNx!))
    );
    if (candidates.length === 0) return null;

    const dbDefault = await getDefaultTemplate(type);
    if (dbDefault) {
        const match = candidates.find(
            (p) => p.label === dbDefault.label && p.pluginNx === dbDefault.pluginNx
        );
        if (match) return match;
    }

    return candidates.find((p) => p.active === true) ?? candidates[0];
}

// ─── Permalink helpers ────────────────────────────────────────────────────────

function prefixSegments(prefix: string): string[] {
    return prefix.trim().replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

function matchPrefix(slugParts: string[], prefix: string): string | null {
    const segs = prefixSegments(prefix);
    if (slugParts.length !== segs.length + 1) return null;
    for (let i = 0; i < segs.length; i++) {
        if (slugParts[i] !== segs[i]) return null;
    }
    return slugParts[segs.length];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DynamicRootPage({ params }: RootPageProps) {
    const { slug } = await params;

    await connectDB();

    const postTypes = getPostTypes();
    const catTypes = getCatTypes();

    const [activeNxList, permalinkMap] = await Promise.all([
        getActivePluginNamesCached(),
        getPermalinkMap(postTypes, catTypes),
    ]);

    const activeNxSet = new Set(activeNxList);
    const rootPages = getRootPages();

    // Fetch settings once here — passed as a prop to every template component.
    // This keeps server-only Mongoose imports out of the plugin/component tree
    // and avoids the async_hooks bundling error.
    const settings = await Settings();

    // ─── Static single pages ──────────────────────────────────────────────────
    if (slug.length === 1) {
        const staticPage = rootPages.find(
            (p) =>
                p.slug === "single" &&
                p.key === slug[0] &&
                activeNxSet.has(p.pluginNx!)
        );
        if (staticPage?.component) {
            const Component = staticPage.component;
            return <Component settings={settings} permalinkMap={permalinkMap} />;
        }
    }

    // ─── Post types ───────────────────────────────────────────────────────────
    for (const postType of postTypes) {
        const prefix = permalinkMap[postType.key] ?? "";
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;

        const postData = await getPost(contentSlug, postType.key);
        if (!postData) continue;

        // Run any server-side data hook registered for this post type.
        // Plugins register via registerServerDataHook() in lib/serverHooks.ts
        // (auto-discovered by hook/serverDataHooks.ts — no manual imports).
        const pageData = await runServerDataHook(
            postType.key,
            String(postData._id),
            postData.slug,
            postData
        );

        const template = await resolveTemplate(postType.key, activeNxSet);
        if (!template?.component) {
            const fallback = await resolveTemplate("post", activeNxSet);
            if (!fallback?.component) continue;
            const C = fallback.component as any;
            return <C data={postData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} />;
        }

        const PostComponent = template.component as any;
        return <PostComponent data={postData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} />;
    }

    // ─── Category types ───────────────────────────────────────────────────────
    for (const catType of catTypes) {
        const prefix = permalinkMap[catType.key] ?? "";
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;

        const catData = await getCat(contentSlug, catType.key);
        if (!catData) continue;

        // Run any server-side data hook registered for this category type.
        // Plugins register via registerServerDataHook() in their lib/serverHooks.ts
        // which is imported at the top of this file. Fully generic — no plugin
        // names or postType strings here.
        const pageData = await runServerDataHook(
            catType.key,
            String(catData._id),
            catData.slug,
            catData
        );

        // Resolve template by catType.key (e.g. "product-category"),
        // then fall back to the generic "cat" template if none is registered.
        const template = await resolveTemplate(catType.key, activeNxSet);
        if (!template?.component) {
            const fallback = await resolveTemplate("cat", activeNxSet);
            if (!fallback?.component) continue;
            const C = fallback.component as any;
            return <C data={catData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} />;
        }

        const CatComponent = template.component as any;
        return <CatComponent data={catData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} />;
    }

    notFound();
}
