import connectDB from "@/lib/mongodb";
import BuilderModel from "@/models/builder";
import BuilderClient from "./BuilderClient";
import {
    hasBuilderElement,
    renderBuilderElement,
} from "@/hook/builderDataHooks";

// Server Component.
// Renders the builder layout server-side.
// Elements registered in builderDataHooks (e.g. "blog-post") are rendered
// as async server components — MongoDB queries happen here, zero client fetches.
// Other elements fall through to BuilderClient as before.

interface Props {
    id: string;
}

interface RenderedElement {
    id: string;
    node: React.ReactNode;
}

function collectRegisteredElements(content: any[]): { id: string; type: string; schema: any }[] {
    const results: { id: string; type: string; schema: any }[] = [];
    function walkElements(elements: any[]) {
        for (const el of elements ?? []) {
            if (hasBuilderElement(el.type)) {
                results.push({ id: el.id, type: el.type, schema: el.schema });
            }
            if (el.type === "carousel" && el.schema?.content?.slides) {
                for (const slide of el.schema.content.slides) {
                    walkElements(slide.elements ?? []);
                }
            }
        }
    }
    function walkCols(cols: any[]) {
        for (const col of cols) {
            walkElements(col.elements ?? []);
            walkCols(col.columns ?? []);
        }
    }
    for (const row of content) {
        walkCols(row.columns ?? []);
    }
    return results;
}

export default async function Builder({ id }: Props) {
    await connectDB();
    const doc = await BuilderModel.findById(id).lean();
    if (!doc || !doc.content) return null;

    const content = doc.content as any[];

    // Find all elements that have a registered server component
    const registered = collectRegisteredElements(content);

    // Render them all in parallel — each is an async server component
    // that queries MongoDB directly (LatestPosts, etc.)
    const rendered: Record<string, React.ReactNode> = {};
    if (registered.length > 0) {
        await Promise.all(
            registered.map(async ({ id: elId, type, schema }) => {
                rendered[elId] = await renderBuilderElement(type, schema);
            })
        );
    }

    return <BuilderClient content={content} serverElements={rendered} />;
}
