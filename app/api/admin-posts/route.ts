import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        if (!type) {
            return NextResponse.json({ error: "Type is required" }, { status: 400 });
        }

        await connectDB();

        const postsData = await Post.find({ type }).sort({ createdAt: -1 }).lean();
        const postIds = postsData.map(p => p._id);
        const infosData = await PostInfo.find({ postId: { $in: postIds } }).lean();

        return NextResponse.json({
            posts: postsData.map(p => ({
                ...p,
                _id: p._id.toString(),
                category: p.category ? p.category.toString() : null,
                createdAt: p.createdAt ? (p.createdAt as Date).toISOString() : "",
                updatedAt: p.updatedAt ? (p.updatedAt as Date).toISOString() : ""
            })),
            infos: infosData.map(i => ({
                ...i,
                _id: i._id.toString(),
                postId: i.postId.toString()
            }))
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
