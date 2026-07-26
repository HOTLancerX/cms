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

export async function GET(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const total = Math.min(Math.max(parseInt(searchParams.get('total') || '15', 10), 1), 30);

        // Fetch post permalink prefix
        const postPermalink = (await Permalink.findOne({ contentType: 'blog' }).lean()) as any;
        const postPrefix =
            (postPermalink?.prefix ?? 'blog').trim().replace(/^\/+|\/+$/g, '') || 'blog';

        const buildPostUrl = (slug: string) => {
            const p = postPrefix.trim().replace(/^\/+|\/+$/g, '');
            return p ? `/${p}/${slug}` : `/${slug}`;
        };

        // 1. Fetch Latest Posts
        const latestDocs = await Post.find({ status: 'published' })
            .sort({ createdAt: -1 })
            .limit(total)
            .lean();

        const latest = latestDocs.map((post) => ({
            _id: String(post._id),
            title: post.title,
            slug: post.slug,
            postUrl: buildPostUrl(post.slug),
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
        }));

        // 2. Fetch Popular Posts in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Check if there are posts published in the last 7 days
        let popularDocs = await Post.find({
            status: 'published',
            createdAt: { $gte: sevenDaysAgo },
        })
            .sort({ createdAt: -1 })
            .limit(total)
            .lean();

        // Check if views exist in PostInfo for popular sorting
        const popularPostIds = popularDocs.map((p) => p._id);
        if (popularPostIds.length > 0) {
            const viewInfos = await PostInfo.find({
                postId: { $in: popularPostIds },
                name: 'views',
            }).lean();

            if (viewInfos.length > 0) {
                const viewMap = new Map(viewInfos.map((v) => [String(v.postId), parseInt(v.value || '0', 10)]));
                popularDocs.sort((a, b) => (viewMap.get(String(b._id)) || 0) - (viewMap.get(String(a._id)) || 0));
            }
        }

        // If no posts in last 7 days or less than requested total, fetch random published posts as fallback
        if (!popularDocs || popularDocs.length === 0) {
            const randomDocs = await Post.aggregate([
                { $match: { status: 'published' } },
                { $sample: { size: total } },
            ]);
            popularDocs = randomDocs;
        }

        const popularMapped = popularDocs.map((post: any) => ({
            _id: String(post._id),
            title: post.title,
            slug: post.slug,
            postUrl: buildPostUrl(post.slug),
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
        }));

        // Randomize position of popular posts
        const popular = shuffleArray(popularMapped);

        return NextResponse.json({
            success: true,
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
