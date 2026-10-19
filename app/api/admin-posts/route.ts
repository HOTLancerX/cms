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

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "100", 10)));
        const search = searchParams.get("search")?.trim() || "";
        const status = searchParams.get("status") || "all";
        const category = searchParams.get("category") || "all";
        const seller = searchParams.get("seller") || "all";
        const sortBy = searchParams.get("sortBy") || "newest";

        await connectDB();

        const query: any = { type };

        if (status && status !== "all") {
            query.status = status;
        }
        if (category && category !== "all") {
            query.category = category;
        }
        if (seller && seller !== "all") {
            query.userId = seller;
        }
        const idsParam = searchParams.get("ids");
        if (idsParam) {
            const idList = idsParam.split(",").map(id => id.trim()).filter(id => id.length === 24);
            if (idList.length > 0) {
                query._id = { $in: idList };
            }
        }
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.$or = [
                { title: { $regex: escapedSearch, $options: "i" } },
                { slug: { $regex: escapedSearch, $options: "i" } }
            ];
        }

        let sortOptions: any = { createdAt: -1 };
        if (sortBy === "oldest") {
            sortOptions = { createdAt: 1 };
        } else if (sortBy === "title") {
            sortOptions = { title: 1 };
        }

        const total = await Post.countDocuments(query);
        const skip = (page - 1) * limit;

        const postsData = await Post.find(query).sort(sortOptions).skip(skip).limit(limit).lean();
        const postIds = postsData.map(p => p._id);
        const infosData = postIds.length > 0
            ? await PostInfo.find({ postId: { $in: postIds } }).lean()
            : [];

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
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}