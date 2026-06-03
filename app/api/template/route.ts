import connectDB from "@/lib/mongodb";
import Template from "@/models/template";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// GET /api/template — return all template records
export async function GET() {
    await connectDB();
    const docs = await Template.find({}).lean();
    return NextResponse.json(docs);
}

/**
 * POST /api/template — upsert a template record.
 *
 * `active` (boolean, optional) is the plugin-declared fallback default.
 * It is only applied as isDefault when NO default exists yet for that type
 * in the DB — i.e. it is a first-boot hint, not an override.
 */
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { type, key, label, position, pluginNx, active } = await req.json();

        // Upsert the template record (never touch isDefault here)
        await Template.findOneAndUpdate(
            { type, label, pluginNx },
            { $set: { type, key, label, position, pluginNx } },
            { upsert: true, new: true }
        );

        // Apply plugin-declared default only when the DB has no default yet for this type
        if (active === true) {
            const existingDefault = await Template.findOne({ type, isDefault: true });
            if (!existingDefault) {
                await Template.findOneAndUpdate(
                    { type, label, pluginNx },
                    { $set: { isDefault: true } }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to upsert template" }, { status: 500 });
    }
}

// PUT /api/template — set a template as default for its type (admin override)
export async function PUT(req: NextRequest) {
    try {
        await connectDB();
        const { id, type } = await req.json();

        // Clear existing default for this type, then set the new one
        await Template.updateMany({ type }, { isDefault: false });
        await Template.findByIdAndUpdate(id, { isDefault: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to set default" }, { status: 500 });
    }
}
