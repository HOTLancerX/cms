import connectDB from "@/lib/mongodb";
import BuilderModel from "@/models/builder";
import MenuModel from "@/models/Menu";
import BuilderClient from "./BuilderClient";
import {
    hasBuilderElement,
    renderBuilderElement,
} from "@/hook/builderDataHooks";
import { fetchEnrichedBuilderData } from "@/lib/builderDataEngine";

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
    const doc = await BuilderModel.findById(id).lean();
    if (!doc || !doc.content) return null;

    const content = doc.content as any[];

    // Fetch active menus to serialize and pass to client cache
    const menus = await MenuModel.find({ status: "active" }).lean();
    const serializedMenus = JSON.parse(JSON.stringify(menus));

    // Find all elements that have a registered server component
    const registered = collectRegisteredElements(content);

    // Pre-fetch centralized dynamic model dataset for elements
    let enrichedModelContext: any = null;
    if (registered.length > 0) {
        try {
            // Dynamically resolve postType and categoryType from element schema if present
            const firstEl = registered[0]?.schema?.content;
            const postType = firstEl?.postType || firstEl?.type || "blog";
            const categoryType = firstEl?.categoryType || `${postType}-category`;
            const categoryIds = firstEl?.categoryIds ?? [];
            const limit = firstEl?.limit ?? 6;

            enrichedModelContext = await fetchEnrichedBuilderData({
                postType,
                categoryType,
                categoryIds,
                limit,
            });
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
