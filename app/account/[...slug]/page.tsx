import { notFound } from "next/navigation";
import { getUserPages } from "@/hook/userPages";
import { resolveLazyComponent } from "@/hook/pluginHooks";

export const dynamic = "force-dynamic";

interface AccountPageProps {
    params: Promise<{ slug: string[] }>;
}

export default async function AccountDynamicPage({ params }: AccountPageProps) {
    const { slug } = await params;

    // Join segments → e.g. ["orders", "abc123"] → "orders/abc123"
    const slugPath = Array.isArray(slug) ? slug.join("/") : slug;

    const pages = getUserPages();

    // Prefer the most specific (longest) match — exact or prefix
    const pageDef = pages
        .filter((p) => p.key === slugPath || slugPath.startsWith(p.key))
        .sort((a, b) => b.key.length - a.key.length)[0];

    if (!pageDef || (!pageDef.path && !pageDef.lazyPath)) {
        notFound();
    }

    // Resolve the component — either directly from `path` (static import)
    // or lazily from `lazyPath` (dynamic import via pluginHooks registry).
    let DynamicComponent = pageDef.path;
    if (!DynamicComponent && pageDef.lazyPath) {
        const lazy = await resolveLazyComponent(pageDef.lazyPath);
        if (!lazy) notFound();
        DynamicComponent = lazy;
    }

    return <DynamicComponent />;
}
