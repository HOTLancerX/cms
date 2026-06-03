import connectDB from "@/lib/mongodb";
import BuilderSection from "@/models/buildersection";
import type { NextRequest } from "next/server";

// ─── GET /api/buildersection ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");
        const type = searchParams.get("type");

        if (id) {
            const doc = await BuilderSection.findById(id).lean();
            if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
            return Response.json(doc);
        }

        // Filter by type if provided
        const filter: Record<string, any> = {};
        if (type) filter.type = type;

        const docs = await BuilderSection.find(filter)
            .sort({ updatedAt: -1 })
            .lean();
        return Response.json(docs);
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

// ─── POST /api/buildersection ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { title, type, image, content, status } = body;

        if (!title) return Response.json({ error: "Title is required" }, { status: 400 });

        const doc = await BuilderSection.create({
            title,
            type: type || "general",
            image: image || "",
            content: content || [],
            status: status || "active",
        });

        return Response.json(doc, { status: 201 });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

// ─── PUT /api/buildersection ──────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { id, title, type, image, content, status } = body;

        if (!id) return Response.json({ error: "ID is required" }, { status: 400 });

        const update: Record<string, any> = {};
        if (title !== undefined) update.title = title;
        if (type !== undefined) update.type = type;
        if (image !== undefined) update.image = image;
        if (content !== undefined) update.content = content;
        if (status !== undefined) update.status = status;

        const doc = await BuilderSection.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
        if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

        return Response.json(doc);
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

// ─── DELETE /api/buildersection ───────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");

        if (!id) return Response.json({ error: "ID is required" }, { status: 400 });

        await BuilderSection.findByIdAndDelete(id);
        return Response.json({ success: true });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
