import { notFound } from "next/navigation";
import { getAdminPages } from "@/hook/adminPages";

export const dynamic = "force-dynamic";

interface AdminPageProps {
    params: Promise<{ slug: string[] }>;
}

export default async function AdminDynamicPage({ params }: AdminPageProps) {
    const { slug } = await params;

    // Join segments back into a path string, e.g. ["product", "settings"] → "product/settings"
    const slugPath = Array.isArray(slug) ? slug.join("/") : slug;

    // Retrieve all registered pages (bypasses gate, never cleared)
    const pages = getAdminPages();

    // Find matching page by key — prefer the most specific (longest) match.
    // Rules:
    //   Exact match  : key === slugPath
    //   Prefix match : slugPath starts with key (key should end with "/")
    const pageDef = pages
        .filter((p) => p.key === slugPath || slugPath.startsWith(p.key))
        .sort((a, b) => b.key.length - a.key.length)[0];

    if (!pageDef || !pageDef.path) {
        notFound();
    }

    const DynamicComponent = pageDef.path;

    return (
        <main className="cms-page">
            <h1 className="mb-4 block font-bold">{pageDef.label}</h1>
            <>
                <DynamicComponent params={{ slug }} />
            </>
        </main>
    );
}
