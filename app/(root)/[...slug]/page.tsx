import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import CatInfo from "@/models/cat_info";
import Template from "@/models/template";
import Plugin from "@/models/plugin";
import Permalink from "@/models/permalink";
import { getRootPages } from "@/hook/rootPages";
import { getPostTypes } from "@/hook/PostType";
import { getCatTypes } from "@/hook/CategoryType";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface RootPageProps {
    params: Promise<{ slug: string[] }>;
}

// ─── Template resolver ────────────────────────────────────────────────────────

const CORE_NX = "com.system.core";

async function resolveTemplate(type: string, activeNxSet: Set<string>) {
    const rootPages = getRootPages();
    const candidates = rootPages.filter(
        // CORE_NX templates are always available — they bypass the plugin gate
        (p) => p.type === type && p.slug === "dynamic" &&
            (p.pluginNx === CORE_NX || activeNxSet.has(p.pluginNx!))
    );
    if (candidates.length === 0) return null;

    const dbDefault = await Template.findOne({ type, isDefault: true }).lean() as any;
    if (dbDefault) {
        const match = candidates.find(
            (p) => p.label === dbDefault.label && p.pluginNx === dbDefault.pluginNx
        );
        if (match) return match;
    }

    const activeHint = candidates.find((p) => p.active === true);
    if (activeHint) return activeHint;

    return candidates[0];
}

// ─── Permalink map loader ─────────────────────────────────────────────────────

async function loadPermalinkMap(
    postTypes: ReturnType<typeof getPostTypes>,
    catTypes: ReturnType<typeof getCatTypes>
): Promise<Record<string, string>> {
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
}

/**
 * Normalise a prefix string into an array of path segments.
 * "" → []   "hello" → ["hello"]   "news/blog" → ["news", "blog"]
 */
function prefixSegments(prefix: string): string[] {
    return prefix.trim().replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

/**
 * Check whether the incoming slug array matches a configured prefix + slug.
 *
 * Returns the content slug if matched, null otherwise.
 *
 * Examples:
 *   prefix=""      slugParts=["my-post"]          → "my-post"
 *   prefix="hello" slugParts=["hello","my-post"]  → "my-post"
 *   prefix="news/blog" slugParts=["news","blog","my-post"] → "my-post"
 */
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

    // Load active plugins, permalink config, and registered types in parallel
    const [activeDocs, permalinkMap] = await Promise.all([
        Plugin.find({ status: "active" }, { nx: 1, _id: 0 }).lean(),
        loadPermalinkMap(postTypes, catTypes),
    ]);

    const activeNxSet = new Set((activeDocs as any[]).map((d) => d.nx));
    const rootPages = getRootPages();

    // ─── Static single pages (e.g. /hello registered via root.pages) ─────────
    if (slug.length === 1) {
        const staticPage = rootPages.find(
            (p) =>
                p.slug === "single" &&
                p.key === slug[0] &&
                activeNxSet.has(p.pluginNx!)
        );
        if (staticPage?.component) {
            const Component = staticPage.component;
            return <Component />;
        }
    }

    // ─── Post types ───────────────────────────────────────────────────────────
    for (const postType of postTypes) {
        const prefix = permalinkMap[postType.key] ?? "";
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;

        const post = await Post.findOne({
            slug: contentSlug,
            type: postType.key,
            status: "published",
        }).lean() as any;

        if (!post) continue;

        const template = await resolveTemplate(postType.key, activeNxSet);
        if (!template?.component) {
            // Fall back to generic "post" template if no type-specific one
            const fallback = await resolveTemplate("post", activeNxSet);
            if (!fallback?.component) continue;
            const infoRecords = await PostInfo.find({ postId: post._id }).lean() as any[];
            const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
                acc[r.name] = r.value; return acc;
            }, {});
            const C = fallback.component as any;
            return <C data={{ ...post, info: infoMap }} />;
        }

        const infoRecords = await PostInfo.find({ postId: post._id }).lean() as any[];
        const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
            acc[r.name] = r.value; return acc;
        }, {});
        const PostComponent = template.component as any;
        return <PostComponent data={{ ...post, info: infoMap }} />;
    }

    // ─── Category types ───────────────────────────────────────────────────────
    for (const catType of catTypes) {
        const prefix = permalinkMap[catType.key] ?? "";
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;

        const cat = await Cat.findOne({
            slug: contentSlug,
            type: catType.key,
            status: "published",
        }).lean() as any;

        if (!cat) continue;

        const template = await resolveTemplate(catType.postType, activeNxSet);
        if (!template?.component) {
            const fallback = await resolveTemplate("cat", activeNxSet);
            if (!fallback?.component) continue;
            const infoRecords = await CatInfo.find({ catId: cat._id }).lean() as any[];
            const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
                acc[r.name] = r.value; return acc;
            }, {});
            const C = fallback.component as any;
            return <C data={{ ...cat, info: infoMap }} />;
        }

        const infoRecords = await CatInfo.find({ catId: cat._id }).lean() as any[];
        const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
            acc[r.name] = r.value; return acc;
        }, {});
        const CatComponent = template.component as any;
        return <CatComponent data={{ ...cat, info: infoMap }} />;
    }

    notFound();
}
