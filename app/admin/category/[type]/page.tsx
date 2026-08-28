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

interface CatItem {
    _id: string;
    title: string;
    slug: string;
    parentId: string | null;
    status: string;
    createdAt: string;
    [key: string]: any;
}

interface TreeCatItem extends CatItem {
    depth: number;
    parentTitle?: string;
    hasChildren?: boolean;
}

function buildCategoryTree(flatCats: CatItem[]): TreeCatItem[] {
    const byParent = new Map<string, CatItem[]>();
    const byId = new Map<string, CatItem>();

    flatCats.forEach((c) => {
        const id = String(c._id);
        byId.set(id, c);
        const pid = c.parentId ? String(c.parentId) : "root";
        if (!byParent.has(pid)) {
            byParent.set(pid, []);
        }
        byParent.get(pid)!.push(c);
    });

    const result: TreeCatItem[] = [];

    function traverse(parentId: string, depth: number) {
        const children = byParent.get(parentId) || [];
        children.forEach((child) => {
            const childId = String(child._id);
            const parent = child.parentId ? byId.get(String(child.parentId)) : undefined;
            const subChildren = byParent.get(childId) || [];

            result.push({
                ...child,
                depth,
                parentTitle: parent?.title,
                hasChildren: subChildren.length > 0,
            });

            traverse(childId, depth + 1);
        });
    }

    // Traverse root nodes
    traverse("root", 0);

    // Any orphaned categories whose parentId isn't found
    flatCats.forEach((c) => {
        const id = String(c._id);
        if (!result.some((r) => String(r._id) === id)) {
            result.push({
                ...c,
                depth: 0,
            });
        }
    });

    return result;
}

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

    const treeCats = buildCategoryTree(cats);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{catType.label}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{cats.length} total entries</p>
                </div>
                <Link
                    href={`/admin/category/${type}/new`}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-main to-violet-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition text-sm shadow"
                >
                    <Icon icon="solar:add-circle-bold" width={18} />
                    Add {catType.label}
                </Link>
            </div>

            {treeCats.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
                    <Icon icon={catType.icon ?? "solar:folder-bold"} width={48} className="mx-auto mb-3 opacity-40" />
                    <p>No {catType.label.toLowerCase()} entries yet.</p>
                    <Link
                        href={`/admin/category/${type}/new`}
                        className="mt-4 inline-flex items-center gap-1.5 text-main hover:underline text-sm font-semibold"
                    >
                        <Icon icon="solar:add-circle-bold" width={14} />
                        Create the first one
                    </Link>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200">
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Hierarchy & Title</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Level</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Slug</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
                                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Created</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {treeCats.map((cat) => {
                                const badge = STATUS_BADGE[cat.status] ?? STATUS_BADGE.draft;
                                const isRoot = cat.depth === 0;
                                const isChild = cat.depth === 1;
                                const isSubChild = cat.depth >= 2;

                                return (
                                    <tr
                                        key={cat._id}
                                        className={`transition hover:bg-indigo-50/30 ${
                                            isRoot ? "bg-white" : isChild ? "bg-gray-50/30" : "bg-gray-50/60"
                                        }`}
                                    >
                                        {/* Category Hierarchy & Title Column */}
                                        <td className="px-5 py-3.5">
                                            {isRoot && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-main flex items-center justify-center shrink-0 border border-indigo-100">
                                                        <Icon icon="solar:folder-with-files-bold" className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-gray-900 text-sm">
                                                            {cat.title}
                                                        </span>
                                                        {cat.hasChildren && (
                                                            <span className="text-[11px] text-gray-400 font-normal">
                                                                Parent Category
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {isChild && (
                                                <div className="flex items-center gap-2 pl-6">
                                                    <div className="flex items-center text-gray-300 shrink-0 select-none">
                                                        <span className="font-mono text-gray-300 text-sm mr-1">└─</span>
                                                        <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                                                            <Icon icon="solar:subdirectory-right-bold" className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-gray-800 text-sm">
                                                            {cat.title}
                                                        </span>
                                                        {cat.parentTitle && (
                                                            <span className="text-[11px] text-gray-400">
                                                                under <strong className="text-gray-600 font-medium">{cat.parentTitle}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {isSubChild && (
                                                <div
                                                    className="flex items-center gap-2"
                                                    style={{ paddingLeft: `${cat.depth * 2}rem` }}
                                                >
                                                    <div className="flex items-center text-gray-300 shrink-0 select-none">
                                                        <span className="font-mono text-gray-300 text-sm mr-1">└── └─</span>
                                                        <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/60">
                                                            <Icon icon="solar:diagram-up-bold" className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium text-gray-800 text-sm">
                                                            {cat.title}
                                                        </span>
                                                        {cat.parentTitle && (
                                                            <span className="text-[11px] text-gray-400">
                                                                under <strong className="text-gray-600 font-medium">{cat.parentTitle}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* Level Badge */}
                                        <td className="px-5 py-3.5">
                                            {isRoot && (
                                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-main border border-indigo-200/60">
                                                    Parent (L1)
                                                </span>
                                            )}
                                            {isChild && (
                                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                                                    Child (L2)
                                                </span>
                                            )}
                                            {isSubChild && (
                                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                                                    Subchild (L{cat.depth + 1})
                                                </span>
                                            )}
                                        </td>

                                        {/* Slug */}
                                        <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                                            {cat.slug}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-3.5">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>

                                        {/* Created */}
                                        <td className="px-5 py-3.5 text-gray-400 text-xs">
                                            {new Date(cat.createdAt).toLocaleDateString()}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`${viewBase}${cat.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                        cat.status === "published"
                                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                    }`}
                                                >
                                                    <Icon icon="solar:eye-bold" width={13} /> View
                                                </Link>
                                                <Link
                                                    href={`/admin/category/${type}/${cat._id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-main hover:bg-indigo-100 transition"
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
