import connectDB from "@/lib/mongodb";
import Builder from "@/components/Builder";
import { runBuilderWrapper } from "@/hook/builderDataHooks";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import CatInfo from "@/models/cat_info";
import Template from "@/models/template";
import Permalink from "@/models/permalink";
import User from "@/models/Users";
import UserInfo from "@/models/Users_info";
import { getActivePluginNames } from "@/hook/PluginListServer";
import { getRootPages } from "@/hook/rootPages";
import { getPostTypes } from "@/hook/PostType";
import { getCatTypes } from "@/hook/CategoryType";
import { withCache } from "@/lib/cache";
import { Settings } from "@/lib/settings";
import { runServerDataHook } from "@/hook/serverDataHooks";
import { resolveLazyComponent } from "@/hook/pluginHooks";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import mongoose from "mongoose";
import { cache } from "react";

// ISR & Static Generation: Pre-renders pages at build time into local cache.
// dynamicParams = true ensures un-built or new pages render on demand and then cache permanently.
// revalidate = 60 continuously updates content in the background so it stays live.
export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
    // In development mode (next dev / localhost), Next.js invokes generateStaticParams on every request.
    // Since dynamicParams = true is enabled, all routes are dynamically rendered on demand.
    // Returning [] immediately bypasses heavy DB queries (1200+ posts, 300+ categories) and cuts ~4.7s from every dev request.
    if (process.env.NODE_ENV === "development") {
        return [];
    }

    try {
        await connectDB();
        const postTypes = getPostTypes();
        const catTypes = getCatTypes();

        // Fetch permalink map, posts, and categories in parallel for production build
        const [permalinkMap, posts, cats] = await Promise.all([
            getPermalinkMap(postTypes, catTypes),
            Post.find({ status: "published" })
                .sort({ createdAt: -1 })
                .select("slug type")
                .limit(1200)
                .lean() as Promise<any[]>,
            Cat.find({ status: { $ne: "trash" } })
                .sort({ createdAt: -1 })
                .select("slug type")
                .limit(300)
                .lean() as Promise<any[]>,
        ]);

        const rootPages = getRootPages();
        const singlePages = rootPages.filter(
            (p) => (p.slug === "single" || p.type === "single") && p.key
        );

        const params: { slug: string[] }[] = [];

        // 1. Static single pages
        for (const sp of singlePages) {
            if (sp.key) {
                params.push({ slug: [sp.key] });
            }
        }

        // 2. Published posts
        for (const p of posts) {
            if (!p.slug) continue;
            const prefix = permalinkMap[p.type] !== undefined ? permalinkMap[p.type] : p.type;
            const segs = prefix ? prefix.split("/").filter(Boolean) : [];
            params.push({ slug: [...segs, p.slug] });
        }

        // 3. Categories
        for (const c of cats) {
            if (!c.slug) continue;
            const prefix = permalinkMap[c.type] ?? "";
            const segs = prefix ? prefix.split("/").filter(Boolean) : [];
            params.push({ slug: [...segs, c.slug] });
        }

        return params;
    } catch (err) {
        console.warn("[generateStaticParams] Could not pre-fetch static params at build time:", err);
        return [];
    }
}

interface RootPageProps {
    params: Promise<{ slug: string[] }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const CORE_NX = "com.system.core";

// ─── Cached DB helpers ────────────────────────────────────────────────────────

/** Active plugin list — cached 24 h */
const getActivePluginNamesCached = cache(() =>
    withCache("plugins:active", getActivePluginNames)());

/** Default template for a given content type — cached 24 h */
const getDefaultTemplate = cache(async (type: string) => {
    return withCache(`template:v2:default:${type}`, async () => {
        await connectDB();
        let tmpl = await Template.findOne({ type, isDefault: true }).lean() as any;
        if (!tmpl && type === "product-tag") {
            tmpl = await Template.findOne({ type: "product-category", isDefault: true }).lean() as any;
        }
        return tmpl;
    })();
});

/** Permalink map — cached 24 h */
const getPermalinkMap = cache(async (
    postTypes: ReturnType<typeof getPostTypes>,
    catTypes: ReturnType<typeof getCatTypes>
): Promise<Record<string, string>> => {
    return withCache("permalink:v3:map", async () => {
        await connectDB();

        // Seed missing defaults only if collection is empty
        const count = await Permalink.estimatedDocumentCount();
        if (count === 0) {
            const toInsert = [
                // User profile pages — driven by User.slug, default prefix "" (/{slug})
                { contentType: "user", prefix: "" },
                // Seller profile pages — driven by User.slug, not a Post type
                { contentType: "seller", prefix: "seller" },
                // Reporter profile pages — driven by User.slug
                { contentType: "reporter", prefix: "reporter" },
                ...postTypes.map((pt) => ({
                    contentType: pt.key,
                    prefix: pt.key,
                })),
                ...catTypes.map((ct) => ({
                    contentType: ct.key,
                    prefix: ct.key === "product-tag" ? "product/tag" : (ct.postType ? `${ct.postType}/category` : (ct.key === "location" ? "category/location" : `category/${ct.key}`)),
                })),
            ];
            if (toInsert.length > 0) {
                try {
                    await Permalink.insertMany(toInsert, { ordered: false });
                } catch {
                    // Duplicate key errors are expected and safe to ignore
                }
            }
        }

        const docs = await Permalink.find({}).lean();
        const map: Record<string, string> = {
            "product-tag": "product/tag",
            "product-category": "product/category",
            "brands": "brands",
            "seller": "seller",
            "reporter": "reporter",
            "user": "",
        };
        postTypes.forEach((pt) => { map[pt.key] = pt.key; });
        catTypes.forEach((ct) => {
            map[ct.key] = ct.key === "product-tag" ? "product/tag" : (ct.postType ? `${ct.postType}/category` : (ct.key === "location" ? "category/location" : `category/${ct.key}`));
        });
        (docs as any[]).forEach((d: any) => {
            if (d.prefix !== undefined && d.prefix !== null) {
                map[d.contentType] = d.prefix;
            }
        });
        if (!map["product-tag"]) {
            map["product-tag"] = "product/tag";
        }
        return map;
    })();
});

/** Individual post with its info map — cached 24 h per slug */
const getPost = cache(async (slug: string, type: string) => {
    return withCache(`post:${type}:${slug}`, async () => {
        await connectDB();
        const post = await Post.findOne({
            slug,
            type,
            status: "published",
        }).lean() as any;

        if (!post) {
            // Also check if there's a User with this slug
            const userDoc = await User.findOne({ slug, status: "active" }).select("-password").lean() as any;
            if (userDoc) {
                const userInfoDocs = await UserInfo.find({ userId: userDoc._id }).lean() as any[];
                const infoMap: Record<string, string> = {};
                userInfoDocs.forEach((d: any) => { infoMap[d.name] = String(d.value ?? ""); });
                return {
                    _id: String(userDoc._id),
                    title: String(userDoc.name ?? ""),
                    slug: String(userDoc.slug ?? ""),
                    type: type,
                    status: "published",
                    userId: String(userDoc._id),
                    createdAt: userDoc.createdAt instanceof Date ? userDoc.createdAt.toISOString() : String(userDoc.createdAt ?? ""),
                    updatedAt: userDoc.updatedAt instanceof Date ? userDoc.updatedAt.toISOString() : String(userDoc.updatedAt ?? ""),
                    info: infoMap,
                };
            }
            return null;
        }

        const infoRecords = await PostInfo.find({ postId: post._id }).lean() as any[];
        const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
            acc[r.name] = r.value;
            return acc;
        }, {});

        // Serialize to plain object — no ObjectId / Date / Buffer instances
        return {
            _id: String(post._id),
            title: String(post.title ?? ""),
            slug: String(post.slug ?? ""),
            type: String(post.type ?? ""),
            status: String(post.status ?? ""),
            category: post.category ? String(post.category) : null,
            userId: String(post.userId ?? ""),
            createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt ?? ""),
            updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : String(post.updatedAt ?? ""),
            info: infoMap,
        };
    })();
});

/**
 * Generic user profile page lookup — works for any user type (seller, reporter, etc.)
 * Returns the full user document + ALL UserInfo fields as a synthetic post-like object.
 * The server hook for each type then further enriches pageData.
 */
const getUserBySlug = cache(async (userSlug: string, userType: string) => {
    return withCache(`user:${userType}:${userSlug}`, async () => {
        await connectDB();
        const user = await User.findOne({
            slug: userSlug,
            type: userType,
            status: "active",
        } as any).lean() as any;

        if (!user) return null;

        const userInfoDocs = await UserInfo.find({ userId: user._id }).lean() as any[];
        const infoMap: Record<string, string> = {};
        userInfoDocs.forEach((d: any) => { infoMap[d.name] = String(d.value ?? ""); });

        // Return ALL user fields + ALL UserInfo fields in info.
        // info.userId is the key server hooks read to fetch enriched data.
        return {
            _id: String(user._id),
            title: String(user.name ?? ""),
            slug: String(user.slug ?? ""),
            type: userType,
            status: "published",
            createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt ?? ""),
            updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt ?? ""),
            // Expose full user record fields directly
            user: {
                _id: String(user._id),
                name: String(user.name ?? ""),
                slug: String(user.slug ?? ""),
                email: String(user.email ?? ""),
                phone: String(user.phone ?? ""),
                type: String(user.type ?? ""),
                image: String(user.image ?? ""),
                status: String(user.status ?? ""),
                address: String(user.address ?? ""),
                state: String(user.state ?? ""),
                city: String(user.city ?? ""),
                zipCode: String(user.zipCode ?? ""),
                createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt ?? ""),
            },
            info: {
                ...infoMap,
                userId: String(user._id),
            },
        };
    })();
});

/** Individual category with its info map — cached 24 h per slug */
const getCat = cache(async (slug: string, type: string) => {
    return withCache(`cat:${type}:${slug}`, async () => {
        await connectDB();
        let cat = await Cat.findOne({
            slug,
            type,
            status: { $ne: "trash" },
        }).lean() as any;

        if (!cat && type === "product-tag") {
            cat = await Cat.findOne({
                slug: { $regex: new RegExp(`^${slug.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i") },
                type: "product-tag",
                status: { $ne: "trash" },
            }).lean() as any;
        }

        if (!cat) return null;

        const infoRecords = await CatInfo.find({ catId: cat._id }).lean() as any[];
        const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
            acc[r.name] = r.value;
            return acc;
        }, {});

        // Serialize to plain object — no ObjectId / Date / Buffer instances
        return {
            _id: String(cat._id),
            title: String(cat.title ?? ""),
            slug: String(cat.slug ?? ""),
            type: String(cat.type ?? ""),
            status: String(cat.status ?? ""),
            parentId: cat.parentId ? String(cat.parentId) : null,
            createdAt: cat.createdAt instanceof Date ? cat.createdAt.toISOString() : String(cat.createdAt ?? ""),
            updatedAt: cat.updatedAt instanceof Date ? cat.updatedAt.toISOString() : String(cat.updatedAt ?? ""),
            info: infoMap,
        };
    })();
});

// ─── Template resolver ────────────────────────────────────────────────────────

async function resolveTemplate(type: string, activeNxSet: Set<string>) {
    const rootPages = getRootPages();
    const candidates = rootPages.filter(
        (p) => (p.type === type || p.key === type) &&
            (p.pluginNx === CORE_NX || activeNxSet.size === 0 || activeNxSet.has(p.pluginNx!))
    );
    if (candidates.length === 0) return null;

    const dbDefault = await getDefaultTemplate(type);
    if (dbDefault) {
        const match = candidates.find(
            (p) => (p.key && dbDefault.key && p.key === dbDefault.key) ||
                   (p.label === dbDefault.label && (dbDefault.pluginNx ? p.pluginNx === dbDefault.pluginNx : true))
        );
        if (match) return match;
    }

    const sorted = [...candidates].sort((a, b) => {
        const aIsTheme = a.pluginNx === "com.nx.gadgets" ? 1 : 0;
        const bIsTheme = b.pluginNx === "com.nx.gadgets" ? 1 : 0;
        if (aIsTheme !== bIsTheme) return bIsTheme - aIsTheme;
        return (b.position ?? 0) - (a.position ?? 0);
    });

    return sorted.find((p) => p.active === true) ?? sorted[0];
}

// ─── Permalink helpers ────────────────────────────────────────────────────────

function prefixSegments(prefix: string): string[] {
    return prefix.trim().replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

function matchPrefix(slugParts: string[], prefix: string, allowSubPath = false): string | null {
    const segs = prefixSegments(prefix);
    if (!allowSubPath) {
        if (slugParts.length !== segs.length + 1) return null;
    } else {
        if (slugParts.length < segs.length + 1) return null;
    }
    for (let i = 0; i < segs.length; i++) {
        if (slugParts[i] !== segs[i]) return null;
    }
    return slugParts[segs.length];
}

// ─── generateMetadata — SEO ───────────────────────────────────────────────────

export async function generateMetadata({ params }: RootPageProps): Promise<Metadata> {
    const { slug } = await params;

    await connectDB();

    const postTypes = getPostTypes();
    const catTypes = getCatTypes();
    const [activeNxList, permalinkMap] = await Promise.all([
        getActivePluginNamesCached(),
        getPermalinkMap(postTypes, catTypes),
    ]);

    const settings = await Settings();
    const siteName = String(settings.siteName ?? settings.site_title ?? "");
    const defTitle = String(settings.site_title ?? settings.siteName ?? "");
    const defDesc = String(settings.seo_description ?? settings.siteDescription ?? "");
    const defImg = String(settings.seo_meta_image ?? "");
    const baseUrl = String(process.env.NEXTAUTH_URL ?? "");
    const pageUrl = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/${slug.join("/")}` : "";

    const buildMeta = (info: Record<string, string>, contentTitle: string = "", publisher: string = ""): Metadata => {
        // Read from seo_data JSON (new plugin format) with fallback to individual keys
        let seoTitle = "";
        let seoDesc = "";
        let seoKw = "";
        let seoImg = "";
        if (info.seo_data) {
            try {
                const parsed = JSON.parse(info.seo_data);
                seoTitle = parsed.seo_title || "";
                seoDesc = parsed.seo_description || "";
                seoKw = parsed.seo_keywords || "";
                seoImg = parsed.seo_image || "";
            } catch { /* not JSON — ignore */ }
        }
        seoTitle = seoTitle || info.seo_title || "";
        seoDesc = seoDesc || info.seo_description || "";
        seoKw = seoKw || info.seo_keywords || "";

        const title = seoTitle || contentTitle || defTitle;
        const description = seoDesc || defDesc;
        const keywords = seoKw || "";
        const image = seoImg || info.seo_image || defImg;

        const hasSeoTitle = Boolean(seoTitle);

        return {
            title: hasSeoTitle ? { absolute: title } : title,
            description,
            keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
            authors: publisher ? [{ name: publisher }] : (siteName ? [{ name: siteName }] : undefined),
            robots: {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    "max-video-preview": -1,
                    "max-image-preview": "large" as "large",
                    "max-snippet": -1,
                },
            },
            alternates: {
                canonical: pageUrl || undefined,
            },
            openGraph: {
                title,
                description,
                siteName: siteName || undefined,
                ...(image ? { images: [{ url: image }] } : {}),
            },
            twitter: {
                card: "summary_large_image" as const,
                title,
                description,
                ...(image ? { images: [image] } : {}),
            },
        };
    };

    // ── Try static single pages ──
    if (slug.length === 1) {
        const rootPages = getRootPages();
        const staticPage = rootPages.find(
            (p) => p.slug === "single" && p.key === slug[0]
        );
        if (staticPage) return buildMeta({}, "");
    }

    // ── Try post types ──
    for (const postType of postTypes) {
        const prefix = permalinkMap[postType.key] !== undefined ? permalinkMap[postType.key] : postType.key;
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;
        const postData = await getPost(contentSlug, postType.key);
        if (!postData) continue;
        let publisher = "";
        if (postData.userId) {
            const author = await withCache(`user:id:${postData.userId}`, async () => {
                await connectDB();
                if (mongoose.Types.ObjectId.isValid(postData.userId)) {
                    return User.findOne({ _id: postData.userId }).lean() as Promise<any>;
                }
                return User.findOne({
                    $or: [{ slug: postData.userId }, { email: postData.userId }],
                }).lean() as Promise<any>;
            })();
            publisher = author?.name ?? "";
        }
        return buildMeta(postData.info, postData.title, publisher);
    }

    // ── Try seller profile ──
    {
        const sellerPrefix = permalinkMap["seller"] ?? "seller";
        const sSlug = matchPrefix(slug, sellerPrefix);
        if (sSlug !== null) {
            const sd = await getUserBySlug(sSlug, "seller");
            if (sd) return buildMeta(sd.info, sd.title, sd.title);
        }
    }

    // ── Try reporter profile ──
    {
        const reporterPrefix = permalinkMap["reporter"] ?? "reporter";
        const rSlug = matchPrefix(slug, reporterPrefix);
        if (rSlug !== null) {
            const rd = await getUserBySlug(rSlug, "reporter");
            if (rd) return buildMeta(rd.info, rd.title, rd.title);
        }
    }

    // ─── User Profile metadata — dynamically resolved from User.slug via permalinkMap["user"] ─────
    {
        const userPrefix = permalinkMap["user"] ?? "";
        let userSlug = matchPrefix(slug, userPrefix, true);
        if (userSlug === null && slug.length >= 1) {
            userSlug = slug[0];
        }
        if (userSlug !== null) {
            const userDoc = await User.findOne({ slug: userSlug }).select('name slug image').lean() as any;
            if (userDoc) {
                return {
                    title: userDoc.name,
                    description: `${userDoc.name}'s profile on ${siteName || 'Community'}`,
                    openGraph: {
                        title: userDoc.name,
                        images: userDoc.image ? [{ url: userDoc.image }] : undefined,
                    },
                };
            }
        }
    }

    // ── Try category types ──
    for (const catType of catTypes) {
        const prefix = permalinkMap[catType.key] ?? "";
        const isBrand = catType.key === "brands";
        const contentSlug = matchPrefix(slug, prefix, isBrand);
        if (contentSlug === null) continue;
        const catData = await getCat(contentSlug, catType.key);
        if (!catData) continue;
        return buildMeta(catData.info, catData.title);
    }

    return {
        title: defTitle || siteName || "Site",
        description: defDesc,
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DynamicRootPage({ params, searchParams: searchParamsPromise }: RootPageProps) {
    const { slug } = await params;
    const searchParams = await searchParamsPromise;

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
                ((p.slug === "single" && p.key === slug[0]) ||
                    (p.type === "single" && (p.key === slug[0] || p.slug === slug[0])) ||
                    (p.slug === slug[0] && p.type !== "builder" && p.type !== "header" && p.type !== "footer")) &&
                (p.pluginNx === CORE_NX || activeNxSet.size === 0 || activeNxSet.has(p.pluginNx!))
        );
        if (staticPage) {
            // Resolve component: static import or lazy dynamic import
            let Component = staticPage.component as any;
            if (!Component && staticPage.lazyPath) {
                Component = await resolveLazyComponent(staticPage.lazyPath);
            }
            if (Component) {
                const pageData = await runServerDataHook(slug[0], "", slug[0]);
                return <Component settings={settings} permalinkMap={permalinkMap} pageData={pageData} />;
            }
        }
    }

    // ─── Prefix pages (slug: "prefix") ───────────────────────────────────────
    // Matches root.pages entries where the first URL segment equals the key.
    // Extra segments are available to the component via usePathname/useParams.
    // e.g. key="order-confirmation" matches /order-confirmation/ORD-123
    {
        const prefixPage = rootPages.find(
            (p) =>
                p.slug === "prefix" &&
                p.key === slug[0] &&
                (p.pluginNx === CORE_NX || activeNxSet.size === 0 || activeNxSet.has(p.pluginNx!))
        );
        if (prefixPage) {
            let Component = prefixPage.component as any;
            if (!Component && prefixPage.lazyPath) {
                Component = await resolveLazyComponent(prefixPage.lazyPath);
            }
            if (Component) {
                return <Component settings={settings} permalinkMap={permalinkMap} slug={slug} params={{ slug }} />;
            }
        }
    }

    // ─── Post types ───────────────────────────────────────────────────────────
    for (const postType of postTypes) {
        const prefix = permalinkMap[postType.key] !== undefined ? permalinkMap[postType.key] : postType.key;
        const contentSlug = matchPrefix(slug, prefix);
        if (contentSlug === null) continue;

        const postData = await getPost(contentSlug, postType.key);
        if (!postData) continue;

        const builder = postData.info?.builderId ? <Builder id={postData.info.builderId} data={postData} /> : null;

        const pageData = await runServerDataHook(
            postType.key,
            String(postData._id),
            postData.slug,
            postData
        );

        const dbDefault = (await getDefaultTemplate(postType.key)) || (await getDefaultTemplate("post"));
        if (dbDefault?.builderId) {
            return runBuilderWrapper(
                <Builder id={dbDefault.builderId} data={postData} />,
                postData,
                pageData,
                settings,
                permalinkMap
            );
        }

        const template = await resolveTemplate(postType.key, activeNxSet);
        if (!template?.component) {
            const fallback = await resolveTemplate("post", activeNxSet);
            if (!fallback?.component) continue;
            const C = fallback.component as any;
            return <C data={postData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} builder={builder} />;
        }

        const PostComponent = template.component as any;
        return <PostComponent data={postData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} builder={builder} />;
    }

    // ─── Seller pages — resolved from User.slug, no Post document needed ─────
    {
        const sellerPrefix = permalinkMap["seller"] ?? "seller";
        const sellerSlug = matchPrefix(slug, sellerPrefix);

        if (sellerSlug !== null) {
            const sellerData = await getUserBySlug(sellerSlug, "seller");

            if (sellerData) {
                const pageData = await runServerDataHook(
                    "seller",
                    sellerData._id,
                    sellerData.slug,
                    sellerData
                );

                const template = await resolveTemplate("seller", activeNxSet);
                if (template?.component) {
                    const SellerComponent = template.component as any;
                    return <SellerComponent data={sellerData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} />;
                }
            }
        }
    }

    // ─── Reporter pages — resolved from User.slug, no Post document needed ───
    {
        const reporterPrefix = permalinkMap["reporter"] ?? "reporter";
        const reporterSlug = matchPrefix(slug, reporterPrefix);

        if (reporterSlug !== null) {
            const reporterData = await getUserBySlug(reporterSlug, "reporter");

            if (reporterData) {
                const pageData = await runServerDataHook(
                    "reporter",
                    reporterData._id,
                    reporterData.slug,
                    reporterData
                );

                const template = await resolveTemplate("reporter", activeNxSet);
                if (template?.component) {
                    const ReporterComponent = template.component as any;
                    return <ReporterComponent data={reporterData} settings={settings} permalinkMap={permalinkMap} pageData={pageData} />;
                }
            }
        }
    }

    // ─── User Profile pages — generic & dynamic via permalinkMap["user"] ─────
    {
        const userPrefix = permalinkMap["user"] ?? "";
        let userSlug = matchPrefix(slug, userPrefix, true);
        if (userSlug === null && slug.length >= 1) {
            userSlug = slug[0];
        }

        if (userSlug !== null) {
            const userDoc = await User.findOne({ slug: userSlug }).select("-password").lean() as any;
            if (userDoc) {
                const rawPageData = await runServerDataHook(
                    "user",
                    String(userDoc._id),
                    userDoc.slug,
                    userDoc
                );

                const template = await resolveTemplate("user", activeNxSet);
                if (template?.component) {
                    const UserComponent = template.component as any;
                    const plainUserDoc = JSON.parse(JSON.stringify(userDoc));
                    const plainPageData = rawPageData ? JSON.parse(JSON.stringify(rawPageData)) : undefined;
                    return <UserComponent data={plainUserDoc} settings={settings} permalinkMap={permalinkMap} pageData={plainPageData} />;
                }
            }
        }
    }

    // ─── Category types ───────────────────────────────────────────────────────
    for (const catType of catTypes) {
        const prefix = permalinkMap[catType.key] ?? "";
        const isBrand = catType.key === "brands";
        const contentSlug = matchPrefix(slug, prefix, isBrand);
        if (contentSlug === null) continue;

        const catData = await getCat(contentSlug, catType.key);
        if (!catData) continue;

        // If this is a brand route and has sub-path (e.g. /brands/xiaomi/phone), extract subCategorySlug
        const segs = prefixSegments(prefix);
        const subCategorySlug = isBrand && slug.length > segs.length + 1
            ? slug.slice(segs.length + 1).join("/")
            : null;

        const effectiveSearchParams = {
            ...searchParams,
            ...(subCategorySlug ? { category: subCategorySlug } : {}),
        };

        // Run any server-side data hook registered for this category type.
        // Plugins register via registerServerDataHook() in their lib/serverHooks.ts
        // which is imported at the top of this file. Fully generic — no plugin
        // names or postType strings here.
        const pageData = await runServerDataHook(
            catType.key,
            String(catData._id),
            catData.slug,
            { ...catData, subCategorySlug }
        );

        const dbDefault = (await getDefaultTemplate(catType.key)) || (await getDefaultTemplate("cat"));
        if (dbDefault?.builderId) {
            return <Builder id={dbDefault.builderId} data={catData} />;
        }

        // Resolve template by catType.key (e.g. "product-tag", "product-category" or "brands"),
        // then fall back to "product-category" for tags, then generic "cat" template.
        let template = await resolveTemplate(catType.key, activeNxSet);
        if (!template?.component && catType.key === "product-tag") {
            template = await resolveTemplate("product-category", activeNxSet);
        }
        if (!template?.component) {
            template = await resolveTemplate("cat", activeNxSet);
        }
        if (!template?.component) continue;

        const CatComponent = template.component as any;

        const builderTopId = catData.info?.builder_top;
        const builderBottomId = catData.info?.builder_bottom;

        const builderTop = builderTopId ? <Builder id={builderTopId} data={catData} /> : null;
        const builderBottom = builderBottomId ? <Builder id={builderBottomId} data={catData} /> : null;

        return (
            <CatComponent
                data={catData}
                settings={settings}
                permalinkMap={permalinkMap}
                pageData={pageData}
                searchParams={effectiveSearchParams}
                builderTop={builderTop}
                builderBottom={builderBottom}
            />
        );
    }

    notFound();
}
