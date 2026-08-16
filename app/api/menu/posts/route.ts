import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PostModel from '@/models/post';
import PostInfoModel from '@/models/post_info';
import CatModel from '@/models/cat';
import PermalinkModel from '@/models/permalink';

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

export async function GET(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const postType = searchParams.get('type') || 'blog';
        const categoryId = searchParams.get('category');
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '6', 10), 1), 30);

        // Fetch permalinks to format URLs correctly
        const permalinks = await PermalinkModel.find({}).lean().catch(() => []);
        const prefixMap: Record<string, string> = {};
        permalinks.forEach((p: any) => {
            if (p.contentType && p.prefix) {
                prefixMap[p.contentType] = p.prefix.trim().replace(/^\/+|\/+$/g, '');
            }
        });
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

        const formattedPosts = posts.map((post: any) => {
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

            // Resolve human-readable category name
            let resolvedCategory = '';
            if (post.category && catMap.has(String(post.category))) {
                resolvedCategory = catMap.get(String(post.category))!;
            } else if (meta.category && !meta.category.match(/^[0-9a-fA-F]{24}$/)) {
                resolvedCategory = meta.category;
            } else if (meta.category_name) {
                resolvedCategory = meta.category_name;
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

        return NextResponse.json({
            success: true,
            posts: formattedPosts,
        });
    } catch (error: any) {
        console.error('[API menu/posts] Error fetching posts:', error);
        return NextResponse.json(
            { success: false, posts: [], message: error.message },
            { status: 500 }
        );
    }
}
