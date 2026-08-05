import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Post from '@/models/post';
import PostInfo from '@/models/post_info';
import Permalink from '@/models/permalink';

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function parseImageUrl(val: any): string {
    if (!val) return "";
    if (typeof val !== "string") {
        if (typeof val === "object" && val !== null) {
            return val.url || val.src || val.path || "";
        }
        return "";
    }
    const trimmed = val.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
        return trimmed;
    }

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            if (typeof first === "string") return first;
            if (typeof first === "object" && first !== null) return first.url || first.src || first.path || "";
        }
        if (typeof parsed === "object" && parsed !== null) {
            return parsed.url || parsed.src || parsed.path || "";
        }
        if (typeof parsed === "string") return parsed;
    } catch {
        return trimmed;
    }

    return trimmed;
}

export async function GET(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const total = Math.min(Math.max(parseInt(searchParams.get('total') || '15', 10), 1), 50);
        const postType = searchParams.get('type') || 'blog';

        // Fetch post permalink prefix
        const postPermalink = (await Permalink.findOne({ contentType: postType }).lean()) as any;
        const postPrefix =
            (postPermalink?.prefix ?? postType).trim().replace(/^\/+|\/+$/g, '') || postType;

        const buildPostUrl = (slug: string) => {
            const p = postPrefix.trim().replace(/^\/+|\/+$/g, '');
            return p ? `/${p}/${slug}` : `/${slug}`;
        };

        // 1. Fetch Latest Posts from DB matching requested type (type="blog")
        let latestDocs = await Post.find({
            type: postType,
            status: 'published',
        })
            .sort({ createdAt: -1 })
            .limit(total)
            .lean();

        // Fallback A: search type=blog with non-trash status
        if (!latestDocs || latestDocs.length === 0) {
            latestDocs = await Post.find({
                type: postType,
                status: { $ne: 'trash' },
            })
                .sort({ createdAt: -1 })
                .limit(total)
                .lean();
        }

        // Fallback B: if type="blog" has 0 docs, search posts with type in ["blog", "post", ""] non-trash
        if (!latestDocs || latestDocs.length === 0) {
            latestDocs = await Post.find({
                type: { $in: [postType, 'post', 'blog', ''] },
                status: { $ne: 'trash' },
            })
                .sort({ createdAt: -1 })
                .limit(total)
                .lean();
        }

        const postIds = latestDocs.map((p) => p._id);
        const postInfos = await PostInfo.find({ postId: { $in: postIds } }).lean();

        const infoMap = new Map<string, Record<string, string>>();
        postInfos.forEach((info) => {
            const key = String(info.postId);
            if (!infoMap.has(key)) infoMap.set(key, {});
            infoMap.get(key)![info.name] = info.value;
        });

        const latest = latestDocs.map((post) => {
            const meta = infoMap.get(String(post._id)) || {};
            const rawImg = meta.image || meta.images || meta.thumbnail || meta.featured_image || meta._thumbnail_id || "";
            const image = parseImageUrl(rawImg);

            return {
                _id: String(post._id),
                title: post.title,
                slug: post.slug,
                type: post.type,
                postUrl: buildPostUrl(post.slug),
                image,
                excerpt: meta.excerpt || meta.description || meta.summary || "",
                author: meta.author || meta.user || "",
                category: meta.category || meta.category_name || "",
                createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            };
        });

        // 2. Fetch Popular Posts
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let popularDocs = await Post.find({
            type: { $in: [postType, 'post', 'blog', ''] },
            status: { $ne: 'trash' },
            createdAt: { $gte: sevenDaysAgo },
        })
            .sort({ createdAt: -1 })
            .limit(total)
            .lean();

        if (!popularDocs || popularDocs.length === 0) {
            popularDocs = latestDocs;
        }

        const popularMapped = popularDocs.map((post: any) => {
            const meta = infoMap.get(String(post._id)) || {};
            const rawImg = meta.image || meta.images || meta.thumbnail || meta.featured_image || meta._thumbnail_id || "";
            const image = parseImageUrl(rawImg);

            return {
                _id: String(post._id),
                title: post.title,
                slug: post.slug,
                type: post.type,
                postUrl: buildPostUrl(post.slug),
                image,
                excerpt: meta.excerpt || meta.description || meta.summary || "",
                author: meta.author || meta.user || "",
                category: meta.category || meta.category_name || "",
                createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
            };
        });

        const popular = shuffleArray(popularMapped);

        return NextResponse.json({
            success: true,
            type: postType,
            latest,
            popular,
        });
    } catch (error: any) {
        console.error('Error fetching latest/popular posts:', error);
        return NextResponse.json(
            {
                success: false,
                message: error.message || 'Failed to fetch posts',
                latest: [],
                popular: [],
            },
            { status: 500 }
        );
    }
}
