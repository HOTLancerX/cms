import { getMenuByLocation } from '@/lib/menu';
import MenuClients from './MenuClients';
import MobileMenuClients from './MobileMenuClients';
import type { MenuItem } from '@/models/Menu';
import connectDB from '@/lib/mongodb';
import BuilderModel from '@/models/builder';
import PostModel from '@/models/post';
import PostInfoModel from '@/models/post_info';
import CatModel from '@/models/cat';
import PermalinkModel from '@/models/permalink';

interface MenusProps {
    location: string;
    settings?: Record<string, any>;
    style?: number;
    className?: string;
    menuType?: string;
}

export interface PostCardData {
    _id: string;
    title: string;
    slug: string;
    url: string;
    image?: string;
    excerpt?: string;
    category?: string;
    createdAt?: string | null;
}

/**
 * Recursively collect all unique builderIds from the menu tree.
 * Matches items where type === 'builder' OR displayStyle === 'builder'.
 */
export function collectBuilderIds(items: MenuItem[]): string[] {
    const ids: string[] = [];
    for (const item of items) {
        if ((item.type === 'builder' || item.displayStyle === 'builder') && item.builderId) {
            ids.push(item.builderId);
        }
        if (item.children?.length) {
            ids.push(...collectBuilderIds(item.children));
        }
    }
    return [...new Set(ids)];
}

/**
 * Recursively collect all items that request post display in category ratio.
 */
export function collectPostItems(items: MenuItem[]): MenuItem[] {
    const list: MenuItem[] = [];
    for (const item of items) {
        if (item.showPosts) {
            list.push(item);
        }
        if (item.children?.length) {
            list.push(...collectPostItems(item.children));
        }
    }
    return list;
}

function parseImageUrl(val: any): string {
    if (!val) return '';
    if (typeof val !== 'string') {
        if (typeof val === 'object' && val !== null) {
            return val.url || val.src || val.path || '';
        }
        return '';
    }
    const trimmed = val.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return trimmed;
    }

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            if (typeof first === 'string') return first;
            if (typeof first === 'object' && first !== null) return first.url || first.src || first.path || '';
        }
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed.url || parsed.src || parsed.path || '';
        }
        if (typeof parsed === 'string') return parsed;
    } catch {
        return trimmed;
    }

    return trimmed;
}

/**
 * Pre-fetches posts server-side for all menu items configured with showPosts.
 */
export async function fetchMenuPosts(postItems: MenuItem[]): Promise<Record<string, PostCardData[]>> {
    const postContent: Record<string, PostCardData[]> = {};
    if (postItems.length === 0) return postContent;

    try {
        await connectDB();

        // Load permalinks to create exact URLs
        const permalinks = await PermalinkModel.find({}).lean().catch(() => []);
        const prefixMap: Record<string, string> = {};
        permalinks.forEach((p: any) => {
            if (p.contentType && p.prefix) {
                prefixMap[p.contentType] = p.prefix.trim().replace(/^\/+|\/+$/g, '');
            }
        });

        await Promise.all(
            postItems.map(async (item) => {
                try {
                    const postType = item.postType || 'blog';
                    const categoryId = item.postCategory || item.referenceId;
                    const limit = Math.min(Math.max(item.postLimit || 6, 1), 30);
                    const prefix = prefixMap[postType] || postType;

                    const query: Record<string, any> = {
                        status: 'published',
                    };

                    if (postType && postType !== 'all') {
                        query.type = postType;
                    }

                    if (categoryId && categoryId.length === 24) {
                        query.category = categoryId;
                    }

                    let posts = await PostModel.find(query)
                        .sort({ createdAt: -1 })
                        .limit(limit)
                        .lean();

                    // Fallback if no published posts with exact category
                    if (posts.length === 0 && query.category) {
                        delete query.category;
                        posts = await PostModel.find(query)
                            .sort({ createdAt: -1 })
                            .limit(limit)
                            .lean();
                    }

                    // Fallback to any non-trash posts
                    if (posts.length === 0) {
                        posts = await PostModel.find({ status: { $ne: 'trash' } })
                            .sort({ createdAt: -1 })
                            .limit(limit)
                            .lean();
                    }

                    const postIds = posts.map((p) => p._id);
                    const catIds = [...new Set(posts.map((p) => p.category).filter(Boolean))];

                    const [postInfos, catDocs] = await Promise.all([
                        PostInfoModel.find({ postId: { $in: postIds } }).lean(),
                        catIds.length > 0
                            ? CatModel.find({ _id: { $in: catIds } }).select('title slug').lean()
                            : Promise.resolve([]),
                    ]);

                    const infoMap = new Map<string, Record<string, string>>();
                    postInfos.forEach((info: any) => {
                        const key = String(info.postId);
                        if (!infoMap.has(key)) infoMap.set(key, {});
                        infoMap.get(key)![info.name] = info.value;
                    });

                    const catMap = new Map<string, string>();
                    catDocs.forEach((c: any) => {
                        catMap.set(String(c._id), c.title);
                    });

                    postContent[item.id] = posts.map((post: any) => {
                        const meta = infoMap.get(String(post._id)) || {};
                        const rawImg =
                            meta.image ||
                            meta.images ||
                            meta.thumbnail ||
                            meta.featured_image ||
                            meta._thumbnail_id ||
                            '';
                        const image = parseImageUrl(rawImg);
                        const url = prefix ? `/${prefix}/${post.slug}` : `/${post.slug}`;

                        // Resolve real category name
                        let resolvedCategory = '';
                        if (post.category && catMap.has(String(post.category))) {
                            resolvedCategory = catMap.get(String(post.category))!;
                        } else if (meta.category && !meta.category.match(/^[0-9a-fA-F]{24}$/)) {
                            resolvedCategory = meta.category;
                        } else if (meta.category_name) {
                            resolvedCategory = meta.category_name;
                        } else {
                            resolvedCategory = item.label || '';
                        }

                        return {
                            _id: String(post._id),
                            title: post.title,
                            slug: post.slug,
                            url,
                            image,
                            excerpt: meta.excerpt || meta.description || meta.summary || '',
                            category: resolvedCategory,
                            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
                        };
                    });
                } catch (e) {
                    console.error(`[Menus] Error fetching posts for menu item ${item.id}:`, e);
                }
            })
        );
    } catch (err) {
        console.error('[Menus] Database error during post pre-fetch:', err);
    }

    return postContent;
}

/**
 * Server component — fetches menu items + any referenced builder content
 * and category posts server-side, then passes everything to MenuClients for interactive rendering.
 *
 * Builder panels & category post sliders/grids are rendered from pre-fetched content (no client fetch waterfalls).
 *
 * Usage:  <Menus location="header-1" settings={settings} />
 */
export default async function Menus({
    location,
    settings = {},
    style,
    className,
    menuType = 'desktop',
}: MenusProps) {
    const menuItems = await getMenuByLocation(location).catch(() => []);

    if (!menuItems || menuItems.length === 0) return null;

    // Pre-fetch builder content for all builder-type items in this menu
    const builderIds = collectBuilderIds(menuItems);
    const builderContent: Record<string, any[]> = {};

    if (builderIds.length > 0) {
        await connectDB();
        await Promise.all(
            builderIds.map(async (id) => {
                try {
                    const doc = await BuilderModel.findById(id).lean();
                    if (doc?.content && Array.isArray(doc.content)) {
                        builderContent[id] = doc.content as any[];
                    }
                } catch {
                    // leave empty — BuilderPanel will render nothing
                }
            })
        );
    }

    // Pre-fetch category posts for items configured with showPosts
    const postItems = collectPostItems(menuItems);
    const postContent = await fetchMenuPosts(postItems);

    if (menuType === 'mobile') {
        return (
            <MobileMenuClients
                menuItems={menuItems}
                settings={settings}
                builderContent={builderContent}
            />
        );
    }

    return (
        <MenuClients
            menuItems={menuItems}
            settings={settings}
            style={style}
            className={className}
            builderContent={builderContent}
            postContent={postContent}
        />
    );
}
