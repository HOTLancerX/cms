import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Cat from "@/models/cat";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

interface BulkCatInput {
    title: string;
    slug?: string;
    parentId?: string | null;
    status?: "published" | "draft" | "trash";
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/&/g, "-and-")
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
    try {
        await connectDB();

        const body = await req.json();
        const type = String(body.type || "").trim();
        const rawItems: BulkCatInput[] = Array.isArray(body.items) ? body.items : [];

        if (!type) {
            return NextResponse.json({ error: "Category type is required" }, { status: 400 });
        }

        if (rawItems.length === 0) {
            return NextResponse.json({ error: "No category items provided" }, { status: 400 });
        }

        // Clean and prepare inputs
        const validItems = rawItems
            .map((item) => {
                const title = String(item.title || "").trim();
                let slug = String(item.slug || "").trim();
                if (!slug && title) {
                    slug = slugify(title);
                }
                const parentId = item.parentId && mongoose.Types.ObjectId.isValid(item.parentId)
                    ? new mongoose.Types.ObjectId(item.parentId)
                    : null;
                const status = item.status === "draft" ? "draft" : "published";

                return {
                    title,
                    slug: slug || slugify(title) || `cat-${Date.now()}`,
                    parentId,
                    status,
                    type,
                };
            })
            .filter((item) => Boolean(item.title));

        if (validItems.length === 0) {
            return NextResponse.json({ error: "No valid category titles found" }, { status: 400 });
        }

        // Fetch existing slugs to ensure uniqueness
        const existingDocs = await Cat.find({}, "slug").lean();
        const existingSlugs = new Set(existingDocs.map((d: any) => String(d.slug).toLowerCase()));

        // Resolve slug collisions within the batch and database
        const createdDocs: any[] = [];
        const usedSlugsInBatch = new Set<string>();

        for (const item of validItems) {
            let baseSlug = item.slug;
            let finalSlug = baseSlug;
            let counter = 1;

            while (existingSlugs.has(finalSlug.toLowerCase()) || usedSlugsInBatch.has(finalSlug.toLowerCase())) {
                finalSlug = `${baseSlug}-${counter}`;
                counter++;
            }

            usedSlugsInBatch.add(finalSlug.toLowerCase());
            existingSlugs.add(finalSlug.toLowerCase());

            createdDocs.push({
                title: item.title,
                slug: finalSlug,
                type,
                parentId: item.parentId,
                status: item.status,
            });
        }

        // Bulk insert into MongoDB
        const result = await Cat.insertMany(createdDocs, { ordered: false });

        return NextResponse.json({
            success: true,
            createdCount: result.length,
            categories: result,
        });
    } catch (error: any) {
        console.error("Bulk category create error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to create categories in bulk" },
            { status: 500 }
        );
    }
}
