import { notFound } from "next/navigation";
import { getCatTypes } from "@/hook/CategoryType";
import CategoryListClient from "./CategoryListClient";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
const xHeaders = { "x-license-key": LICENSE_KEY };

interface CategoryListPageProps {
    params: Promise<{ type: string }>;
}

export default async function CategoryListPage({ params }: CategoryListPageProps) {
    const { type } = await params;

    const catTypes = getCatTypes();
    const catType = catTypes.find((t) => t.key === type);
    if (!catType) notFound();

    const [catsRes, permalinkRes] = await Promise.all([
        fetch(`${EXPRESS_API}/cat?type=${encodeURIComponent(type)}`, { headers: xHeaders, cache: "no-store" }),
        fetch(`${EXPRESS_API}/permalink`, { headers: xHeaders, cache: "no-store" }),
    ]);

    const { cats = [] } = catsRes.ok ? await catsRes.json() : { cats: [] };
    const permalinkMap: Record<string, string> = permalinkRes.ok ? await permalinkRes.json() : {};
    const prefix = (permalinkMap[type] ?? `${catType.postType}/category`).trim().replace(/^\/+|\/+$/g, "");
    const viewBase = prefix ? `/${prefix}/` : "/";

    return (
        <CategoryListClient
            type={type}
            catType={catType}
            initialCats={cats}
            viewBase={viewBase}
        />
    );
}
