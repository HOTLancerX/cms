import connectDB from "@/lib/mongodb";
import BuilderModel from "@/models/builder";
import MenuModel from "@/models/Menu";
import BuilderClient from "./BuilderClient";
import {
    hasBuilderElement,
    renderBuilderElement,
} from "@/hook/builderDataHooks";
import { fetchEnrichedBuilderData } from "@/lib/builderDataEngine";
import { withCache } from "@/lib/cache";
import mongoose from "mongoose";

interface Props {
    id: string;
    data?: any;
}

function collectRegisteredElements(content: any[]): { id: string; type: string; schema: any }[] {
    const results: { id: string; type: string; schema: any }[] = [];
    function walkElements(elements: any[]) {
        for (const el of elements ?? []) {
            if (el && hasBuilderElement(el.type)) {
                results.push({ id: el.id, type: el.type, schema: el.schema });
            }
            if (el && el.type === "carousel" && el.schema?.content?.slides) {
                for (const slide of el.schema.content.slides) {
                    walkElements(slide.elements ?? []);
                }
            }
        }
    }
    function walkCols(cols: any[]) {
        for (const col of cols) {
            if (col) {
                walkElements(col.elements ?? []);
                walkCols(col.columns ?? []);
            }
        }
    }
    for (const row of content) {
        if (row) {
            walkCols(row.columns ?? []);
        }
    }
    return results;
}

export default async function Builder({ id, data }: Props) {
    await connectDB();
    let doc: any = await withCache(`builder:doc:${id}`, () => BuilderModel.findById(id).lean(), 300 * 1000)();

    if (!doc) {
        if (mongoose.Types.ObjectId.isValid(id)) {
            doc = await BuilderModel.findById(id).lean();
        } else if (id) {
            doc = await BuilderModel.findOne({
                $or: [{ _id: id }, { key: id }, { title: id }],
            }).lean();
        } else {
            doc = await BuilderModel.findOne({
                title: { $regex: /^home$/i },
            }).lean();
        }
    }
    if (!doc || !doc.content) return null;

    const content = doc.content as any[];

    // Fetch active menus to serialize and pass to client cache
    const serializedMenus = await withCache("builder:active_menus", async () => {
        const menus = await MenuModel.find({ status: "active" }).lean();
        return JSON.parse(JSON.stringify(menus));
    }, 300 * 1000)();

    // Find all elements that have a registered server component
    const registered = collectRegisteredElements(content);

    // Pre-fetch centralized dynamic model dataset only if an element explicitly requires postType
    let enrichedModelContext: any = null;
    const firstEl = registered[0]?.schema?.content;
    const explicitlyRequestedType = firstEl?.postType || (firstEl?.type && firstEl.type !== "carousel" ? firstEl.type : null);
    if (registered.length > 0 && explicitlyRequestedType) {
        try {
            const postType = explicitlyRequestedType;
            const categoryType = firstEl?.categoryType || `${postType}-category`;
            const categoryIds = firstEl?.categoryIds ?? (firstEl?.categoryId ? [firstEl.categoryId] : []);
            const limit = firstEl?.limit ?? 6;

            const cacheKey = `builder:enriched:${postType}:${categoryType}:${categoryIds.join(",")}:${limit}`;
            enrichedModelContext = await withCache(cacheKey, () => fetchEnrichedBuilderData({
                postType,
                categoryType,
                categoryIds,
                limit,
            }), 300 * 1000)();
        } catch {
            enrichedModelContext = null;
        }
    }

    const mergedDataContext = {
        ...data,
        builderContext: enrichedModelContext,
    };

    // Render elements in parallel with dynamic type context
    const rendered: Record<string, React.ReactNode> = {};
    if (registered.length > 0) {
        await Promise.all(
            registered.map(async ({ id: elId, type, schema }) => {
                rendered[elId] = await renderBuilderElement(type, schema, mergedDataContext);
            })
        );
    }

    return <BuilderClient content={content} serverElements={rendered} initialMenus={serializedMenus} />;
}
