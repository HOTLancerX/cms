import { notFound } from "next/navigation";
import { getAdminPages } from "@/hook/adminPages";

export const dynamic = "force-dynamic";

interface AdminPageProps {
    params: Promise<{ slug: string }>;
}

export default async function AdminDynamicPage({ params }: AdminPageProps) {
    const { slug } = await params;

    // Retrieve all registered pages (bypasses gate, never cleared)
    const pages = getAdminPages();

    // Find matching page by key
    // Supports nested slugs: "hello" matches "hello" and "hello/khan"
    const pageDef = pages.find(
        (p) => p.key === slug || slug.startsWith(p.key + "/")
    );

    if (!pageDef || !pageDef.path) {
        notFound();
    }

    const DynamicComponent = pageDef.path;

    return (
        <main className="cms-page">
            <h1 className="cms-page-title">{pageDef.label}</h1>
            <div className="bg-[#1a1d2e] border border-[#2e3450] rounded-xl p-6 shadow-2xl">
                <DynamicComponent />
            </div>
        </main>
    );
}
