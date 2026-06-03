import connectDB from "@/lib/mongodb";
import Builder from "@/models/builder";
import type { NextRequest } from "next/server";

// ─── GET /api/builder ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");

        if (id) {
            const doc = await Builder.findById(id).lean();
            if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
            return Response.json(doc);
        }

        // List all
        const docs = await Builder.find()
            .select("title status createdAt updatedAt")
            .sort({ updatedAt: -1 })
            .lean();
        return Response.json(docs);
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

// ─── POST /api/builder ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { title, content, status } = body;

        if (!title) return Response.json({ error: "Title is required" }, { status: 400 });

        const doc = await Builder.create({
            title,
            content: content || [],
            status: status || "active",
        });

        return Response.json(doc, { status: 201 });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

// ─── PUT /api/builder ─────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { id, title, content, status } = body;

        if (!id) return Response.json({ error: "ID is required" }, { status: 400 });

        const update: Record<string, any> = {};
        if (title !== undefined) update.title = title;
        if (content !== undefined) update.content = content;
        if (status !== undefined) update.status = status;

        const doc = await Builder.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
        if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

        return Response.json(doc);
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

// ─── DELETE /api/builder ──────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");

        if (!id) return Response.json({ error: "ID is required" }, { status: 400 });

        await Builder.findByIdAndDelete(id);
        return Response.json({ success: true });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
