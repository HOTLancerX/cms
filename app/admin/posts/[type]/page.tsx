import { notFound } from "next/navigation";
import { getPostTypes } from "@/hook/PostType";
import PostsListClient from "./PostsListClient";
import connectDB from "@/lib/mongodb";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import Cat from "@/models/cat";
import User from "@/models/Users";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
const xHeaders = { "x-license-key": LICENSE_KEY };

interface PostsListPageProps {
    params: Promise<{ type: string }>;
}

export default async function PostsListPage({ params }: PostsListPageProps) {
    const { type } = await params;

    const postTypes = getPostTypes();
    const postType = postTypes.find((t) => t.key === type);
    if (!postType) notFound();

    // Direct database connection for backend synchronization
    await connectDB();

    const postsData = await Post.find({ type }).sort({ createdAt: -1 }).lean();
    const postIds = postsData.map(p => p._id);
    const infosData = await PostInfo.find({ postId: { $in: postIds } }).lean();

    const [catsData, usersData] = await Promise.all([
        Cat.find().lean(),
        User.find().select("-password").lean()
    ]);

    const permalinkRes = await fetch(`${EXPRESS_API}/permalink`, { headers: xHeaders, cache: "no-store" });
    const permalinkMap: Record<string, string> = permalinkRes.ok ? await permalinkRes.json() : {};

    // Serialize database models for the frontend component
    const posts = postsData.map(p => ({
        ...p,
        _id: p._id.toString(),
        category: p.category ? p.category.toString() : null,
        createdAt: p.createdAt ? (p.createdAt as Date).toISOString() : "",
        updatedAt: p.updatedAt ? (p.updatedAt as Date).toISOString() : ""
    }));

    const infos = infosData.map(i => ({
        ...i,
        _id: i._id.toString(),
        postId: i.postId.toString()
    }));

    const cats = catsData.map(c => ({
        ...c,
        _id: c._id.toString(),
        parentId: c.parentId ? c.parentId.toString() : null
    }));

    const users = usersData.map(u => ({
        ...u,
        _id: u._id.toString()
    }));

    const prefix = (permalinkMap[type] ?? type).trim().replace(/^\/+|\/+$/g, "");
    const viewBase = prefix ? `/${prefix}/` : "/";

    return (
        <PostsListClient
            initialPosts={posts as any}
            initialInfos={infos as any}
            type={type}
            postType={postType}
            viewBase={viewBase}
            categories={cats as any}
            users={users as any}
            expressApi={EXPRESS_API}
            xHeaders={xHeaders}
        />
    );
}
