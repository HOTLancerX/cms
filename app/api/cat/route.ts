import connectDB from "@/lib/mongodb";
import Cat, { type ICat } from "@/models/cat";
import CatInfo from "@/models/cat_info";
import type { NextRequest } from "next/server";

// ─── GET  /api/cat ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");
        const type = searchParams.get("type");
        const slug = searchParams.get("slug");
        const excludeId = searchParams.get("excludeId"); // current doc id to exclude (edit mode)

        // ── Slug availability check: GET /api/cat?slug=xxx&excludeId=yyy ──
        if (slug) {
            const query: Record<string, any> = { slug };
            if (excludeId) query._id = { $ne: excludeId };
            const exists = await Cat.exists(query);
            return Response.json({ available: !exists });
        }

        if (id) {
            const cat = await Cat.findById(id).lean();
            if (!cat) {
                return Response.json({ error: "Category not found" }, { status: 404 });
            }
            const info = await CatInfo.find({ catId: id }).lean();
            return Response.json({ cat, info });
        }

        const query: Record<string, string> = {};
        if (type) query.type = type;

        const cats = await Cat.find(query).sort({ createdAt: -1 }).lean();
        return Response.json({ cats });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── POST  /api/cat ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { title, slug, status, type, info } = body as {
            title: string;
            slug: string;
            status?: string;
            type?: string;
            info?: Record<string, string>;
        };

        if (!title || !slug) {
            return Response.json({ error: "title and slug are required" }, { status: 400 });
        }

        const cat = await Cat.create({ title, slug, type, ...(status && { status: status as ICat["status"] }) });

        if (info && typeof info === "object") {
            const ops = Object.entries(info).map(([name, value]) => ({
                updateOne: {
                    filter: { catId: cat._id, name },
                    update: { $set: { value } },
                    upsert: true,
                },
            }));
            if (ops.length) await CatInfo.bulkWrite(ops);
        }

        return Response.json({ cat }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── PUT  /api/cat ────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { _id, title, slug, status, type, info } = body as {
            _id: string;
            title: string;
            slug: string;
            status?: string;
            type?: string;
            info?: Record<string, string>;
        };

        if (!_id) {
            return Response.json({ error: "_id is required for update" }, { status: 400 });
        }
        if (!title || !slug) {
            return Response.json({ error: "title and slug are required" }, { status: 400 });
        }

        const cat = await Cat.findByIdAndUpdate(
            _id,
            { title, slug, type, ...(status && { status: status as ICat["status"] }) },
            { new: true }
        );

        if (!cat) {
            return Response.json({ error: "Category not found" }, { status: 404 });
        }

        if (info && typeof info === "object") {
            const ops = Object.entries(info).map(([name, value]) => ({
                updateOne: {
                    filter: { catId: cat._id, name },
                    update: { $set: { value } },
                    upsert: true,
                },
            }));
            if (ops.length) await CatInfo.bulkWrite(ops);
        }

        return Response.json({ cat });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}

// ─── DELETE  /api/cat ─────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = request.nextUrl;
        const id = searchParams.get("id");

        if (!id) {
            return Response.json({ error: "id is required" }, { status: 400 });
        }

        const cat = await Cat.findByIdAndDelete(id);
        if (!cat) {
            return Response.json({ error: "Category not found" }, { status: 404 });
        }

        // Clean up info records
        await CatInfo.deleteMany({ catId: id });

        return Response.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ error: message }, { status: 500 });
    }
}
