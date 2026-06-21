import { notFound } from "next/navigation";
import { getUserPages } from "@/hook/userPages";

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

    if (!pageDef || !pageDef.path) {
        notFound();
    }

    const DynamicComponent = pageDef.path;

    return <DynamicComponent />;
}
