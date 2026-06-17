import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";

export const dynamic = "force-dynamic";

/**
 * GET /api/epaper
 *
 * Returns all published "epaper" posts, newest-first, each with their
 * parsed pages/areas from the _epaper PostInfo field.
 *
 * Response shape:
 * {
 *   posts: Array<{
 *     _id:       string
 *     title:     string
 *     slug:      string
 *     createdAt: string   // ISO
 *     pages: Array<{
 *       id:     string
 *       image:  string
 *       title:  string
 *       areas:  Array<{
 *         number:     number
 *         x:          number
 *         y:          number
 *         width:      number
 *         height:     number
 *         actionType: "popup" | "link"
 *         linkUrl:    string
 *         customId:   string
 *       }>
 *     }>
 *   }>
 * }
 */
export async function GET() {
    try {
        await connectDB();

        // 1. All published epaper posts, newest first
        const rawPosts = await Post.find({ type: "epaper", status: "published" })
            .sort({ createdAt: -1 })
            .lean<any[]>();

        if (rawPosts.length === 0) {
            return NextResponse.json({ posts: [] });
        }

        // 2. Fetch _epaper info for every post in one query
        const postIds = rawPosts.map((p) => p._id);
        const infoRecords = await PostInfo.find({
            postId: { $in: postIds },
            name:   "_epaper",
        }).lean<any[]>();

        // postId (string) → raw JSON value
        const infoMap = new Map<string, string>();
        infoRecords.forEach((r) => {
            infoMap.set(String(r.postId), r.value ?? "");
        });

        // 3. Assemble response
        const posts = rawPosts.map((p) => {
            const raw = infoMap.get(String(p._id)) ?? "";
            let pages: any[] = [];
            try {
                const blob = JSON.parse(raw);
                if (Array.isArray(blob.pages)) pages = blob.pages;
            } catch { /* leave pages as [] */ }

            return {
                _id:       String(p._id),
                title:     p.title     ?? "",
                slug:      p.slug      ?? "",
                createdAt: p.createdAt instanceof Date
                    ? p.createdAt.toISOString()
                    : String(p.createdAt ?? ""),
                pages,
            };
        });

        return NextResponse.json({ posts });
    } catch (err) {
        console.error("ePaper API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
