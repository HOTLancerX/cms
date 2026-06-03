import connectDB from "@/lib/mongodb";
import Post, { type IPost } from "@/models/post";
import PostInfo from "@/models/post_info";
import type { NextRequest } from "next/server";

// ─── GET  /api/post ───────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");
        const type = searchParams.get("type");
        const slug = searchParams.get("slug");
        const excludeId = searchParams.get("excludeId"); // current doc id to exclude (edit mode)

        // ── Slug availability check: GET /api/post?slug=xxx&excludeId=yyy ──
        if (slug) {
            const query: Record<string, any> = { slug };
            if (excludeId) query._id = { $ne: excludeId };
            const exists = await Post.exists(query);
            return Response.json({ available: !exists });
        }

        if (id) {
            const post = await Post.findById(id).lean();
            if (!post) {
                return Response.json({ error: "Post not found" }, { status: 404 });
            }
            const info = await PostInfo.find({ postId: id }).lean();
            return Response.json({ post, info });
        }

        const query: Record<string, string> = {};
        if (type) query.type = type;

        const posts = await Post.find(query).sort({ createdAt: -1 }).lean();
        return Response.json({ posts });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── POST  /api/post ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { title, slug, status, type, category, info } = body as {
            title: string;
            slug: string;
            status?: string;
            type?: string;
            category?: string;
            info?: Record<string, string>;
        };

        if (!title || !slug) {
            return Response.json({ error: "title and slug are required" }, { status: 400 });
        }

        const post = await Post.create({
            title, slug, type,
            category: category || null,
            ...(status && { status: status as IPost["status"] }),
        });

        if (info && typeof info === "object") {
            const ops = Object.entries(info).map(([name, value]) => ({
                updateOne: {
                    filter: { postId: post._id, name },
                    update: { $set: { value } },
                    upsert: true,
                },
            }));
            if (ops.length) await PostInfo.bulkWrite(ops);
        }

        return Response.json({ post }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── PUT  /api/post ───────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { _id, title, slug, status, type, category, info } = body as {
            _id: string;
            title: string;
            slug: string;
            status?: string;
            type?: string;
            category?: string;
            info?: Record<string, string>;
        };

        if (!_id) {
            return Response.json({ error: "_id is required for update" }, { status: 400 });
        }
        if (!title || !slug) {
            return Response.json({ error: "title and slug are required" }, { status: 400 });
        }

        const post = await Post.findByIdAndUpdate(
            _id,
            { title, slug, type, category: category || null, ...(status && { status: status as IPost["status"] }) },
            { new: true }
        );

        if (!post) {
            return Response.json({ error: "Post not found" }, { status: 404 });
        }

        if (info && typeof info === "object") {
            const ops = Object.entries(info).map(([name, value]) => ({
                updateOne: {
                    filter: { postId: post._id, name },
                    update: { $set: { value } },
                    upsert: true,
                },
            }));
            if (ops.length) await PostInfo.bulkWrite(ops);
        }

        return Response.json({ post });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── DELETE  /api/post ────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");

        if (!id) {
            return Response.json({ error: "id is required" }, { status: 400 });
        }

        const post = await Post.findByIdAndDelete(id);
        if (!post) {
            return Response.json({ error: "Post not found" }, { status: 404 });
        }

        // Clean up info records
        await PostInfo.deleteMany({ postId: id });

        return Response.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}
