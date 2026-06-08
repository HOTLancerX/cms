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
            return <Component />;
        }
    }

    // ─── Post types ───────────────────────────────────────────────────────────
    for (const postType of postTypes) {
        const prefix = permalinkMap[postType.key] ?? "";
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;

        const postData = await getPost(contentSlug, postType.key);
        if (!postData) continue;

        const template = await resolveTemplate(postType.key, activeNxSet);
        if (!template?.component) {
            const fallback = await resolveTemplate("post", activeNxSet);
            if (!fallback?.component) continue;
            const C = fallback.component as any;
            return <C data={postData} />;
        }

        const PostComponent = template.component as any;
        return <PostComponent data={postData} />;
    }

    // ─── Category types ───────────────────────────────────────────────────────
    for (const catType of catTypes) {
        const prefix = permalinkMap[catType.key] ?? "";
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;

        const catData = await getCat(contentSlug, catType.key);
        if (!catData) continue;

        const template = await resolveTemplate(catType.postType, activeNxSet);
        if (!template?.component) {
            const fallback = await resolveTemplate("cat", activeNxSet);
            if (!fallback?.component) continue;
            const C = fallback.component as any;
            return <C data={catData} />;
        }

        const CatComponent = template.component as any;
        return <CatComponent data={catData} />;
    }

    notFound();
}
