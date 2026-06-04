import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { getCatTypes } from "@/hook/CategoryType";

export const dynamic = "force-dynamic";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
const xHeaders = { "x-license-key": LICENSE_KEY };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    published: { label: "Published", cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    draft: { label: "Draft", cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-300" },
    trash: { label: "Trash", cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{catType.label}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{cats.length} total</p>
                </div>
                <Link
                    href={`/admin/category/${type}/new`}
                    className="inline-flex items-center gap-2 bg-linear-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition text-sm shadow"
                >
                    <Icon icon="solar:add-circle-bold" width={18} />
                    Add {catType.label}
                </Link>
            </div>

            {cats.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon={catType.icon ?? "solar:folder-bold"} width={48} className="mx-auto mb-3 opacity-40" />
                    <p>No {catType.label.toLowerCase()} entries yet.</p>
                    <Link
                        href={`/admin/category/${type}/new`}
                        className="mt-4 inline-flex items-center gap-1.5 text-indigo-500 hover:underline text-sm"
                    >
                        <Icon icon="solar:add-circle-bold" width={14} />
                        Create the first one
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Title</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Slug</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Created</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {cats.map((cat: any) => {
                                const badge = STATUS_BADGE[cat.status] ?? STATUS_BADGE.draft;
                                return (
                                    <tr key={cat._id} className="hover:bg-gray-50 transition">
                                        <td className="px-5 py-3 font-medium text-gray-800">{cat.title}</td>
                                        <td className="px-5 py-3 text-gray-400 font-mono text-xs">{cat.slug}</td>
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 text-xs">
                                            {new Date(cat.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`${viewBase}${cat.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${cat.status === "published"
                                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    <Icon icon="solar:eye-bold" width={13} /> View
                                                </Link>
                                                <Link
                                                    href={`/admin/category/${type}/${cat._id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                                >
                                                    <Icon icon="solar:pen-bold" width={13} /> Edit
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
