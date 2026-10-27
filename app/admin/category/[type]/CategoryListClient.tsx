"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import LinkProductsModal from "@/components/admin/LinkProductsModal";
import { xFetch } from "@/lib/express";
import { useToast } from "@/components/ui/Toast";

export interface CatItem {
    _id: string;
    title: string;
    slug: string;
    parentId: string | null;
    status: string;
    createdAt: string;
    count?: number;
    [key: string]: any;
}

export interface TreeCatItem extends CatItem {
    depth: number;
    parentTitle?: string;
    hasChildren?: boolean;
}

interface ParsedBulkRow {
    id: string;
    title: string;
    slug: string;
    parentId: string | null;
    depth: number;
    status: "published" | "draft";
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    published: { label: "Published", cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
    draft: { label: "Draft", cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-300" },
    trash: { label: "Trash", cls: "bg-red-100 text-red-700 ring-1 ring-red-300" },
};

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/&/g, "-and-")
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export const LEVEL_CONFIG: Array<{ label: string; badgeCls: string; iconCls: string; icon: string }> = [
    { label: "Parent (L1)", badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200/60", iconCls: "bg-indigo-50 text-main border-indigo-100", icon: "solar:folder-with-files-bold" },
    { label: "Child (L2)", badgeCls: "bg-amber-50 text-amber-700 border-amber-200/60", iconCls: "bg-amber-50 text-amber-600 border-amber-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 3 (L3)", badgeCls: "bg-purple-50 text-purple-700 border-purple-200/60", iconCls: "bg-purple-50 text-purple-600 border-purple-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 4 (L4)", badgeCls: "bg-blue-50 text-blue-700 border-blue-200/60", iconCls: "bg-blue-50 text-blue-600 border-blue-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 5 (L5)", badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200/60", iconCls: "bg-emerald-50 text-emerald-600 border-emerald-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 6 (L6)", badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200/60", iconCls: "bg-cyan-50 text-cyan-600 border-cyan-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 7 (L7)", badgeCls: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/60", iconCls: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 8 (L8)", badgeCls: "bg-pink-50 text-pink-700 border-pink-200/60", iconCls: "bg-pink-50 text-pink-600 border-pink-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 9 (L9)", badgeCls: "bg-rose-50 text-rose-700 border-rose-200/60", iconCls: "bg-rose-50 text-rose-600 border-rose-200/60", icon: "solar:diagram-up-bold" },
    { label: "Level 10 (L10)", badgeCls: "bg-teal-50 text-teal-700 border-teal-200/60", iconCls: "bg-teal-50 text-teal-600 border-teal-200/60", icon: "solar:diagram-up-bold" },
];

export function getLevelInfo(depth: number) {
    const safeDepth = Math.max(0, Math.min(depth, 9));
    return LEVEL_CONFIG[safeDepth] || {
        label: `Level ${depth + 1} (L${depth + 1})`,
        badgeCls: "bg-gray-50 text-gray-700 border-gray-200",
        iconCls: "bg-gray-50 text-gray-600 border-gray-200",
        icon: "solar:diagram-up-bold",
    };
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
        if (depth >= 10) return; // Support up to 10 levels (depth 0 to 9)
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

    traverse("root", 0);

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

interface CategoryListClientProps {
    type: string;
    catType: {
        key: string;
        label: string;
        icon?: string;
        postType?: string;
    };
    initialCats: CatItem[];
    viewBase: string;
}

export default function CategoryListClient({
    type,
    catType,
    initialCats,
    viewBase,
}: CategoryListClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const toast = useToast();

    const [cats, setCats] = useState<CatItem[]>(initialCats);
    const [search, setSearch] = useState("");

    // Sync state when initialCats updates (e.g. via router.refresh())
    useEffect(() => {
        setCats(initialCats);
    }, [initialCats]);

    // ── Multi-Select & Delete State ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // ── Bulk Modal State ──
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkInputText, setBulkInputText] = useState("");
    const [defaultParentId, setDefaultParentId] = useState<string>("");
    const [defaultStatus, setDefaultStatus] = useState<"published" | "draft">("published");
    const [autoHierarchy, setAutoHierarchy] = useState(true);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [bulkSuccess, setBulkSuccess] = useState("");

    // Custom row overrides in bulk modal
    const [rowOverrides, setRowOverrides] = useState<Record<string, { title?: string; slug?: string; parentId?: string | null }>>({});

    // ── Link Products / Brand Link Modal State ──
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkTargetCatId, setLinkTargetCatId] = useState<string>("");
    const [linkTargetCatIds, setLinkTargetCatIds] = useState<string[]>([]);

    const handleOpenLinkModal = (catId?: string, catIds?: string[]) => {
        if (catIds && catIds.length > 0) {
            setLinkTargetCatId(catIds[0]);
            setLinkTargetCatIds(catIds);
        } else if (catId) {
            setLinkTargetCatId(catId);
            setLinkTargetCatIds([catId]);
        } else if (selectedIds.size > 0) {
            const arr = Array.from(selectedIds);
            setLinkTargetCatId(arr[0]);
            setLinkTargetCatIds(arr);
        } else {
            setLinkTargetCatId(cats.length > 0 ? cats[0]._id : "");
            setLinkTargetCatIds(cats.length > 0 ? [cats[0]._id] : []);
        }
        setShowLinkModal(true);
    };

    // Filter categories by search
    const filteredCats = useMemo(() => {
        if (!search.trim()) return cats;
        const q = search.toLowerCase();
        return cats.filter((c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }, [cats, search]);

    const treeCats = useMemo(() => buildCategoryTree(filteredCats), [filteredCats]);

    // ── Multi-select helpers ──
    const allSelected = treeCats.length > 0 && treeCats.every((c) => selectedIds.has(c._id));
    const someSelected = treeCats.some((c) => selectedIds.has(c._id)) && !allSelected;

    const handleToggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(treeCats.map((c) => c._id)));
        }
    };

    const handleToggleSelect = (catId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) {
                next.delete(catId);
            } else {
                next.add(catId);
            }
            return next;
        });
    };

    // ── Delete single category ──
    const handleDeleteSingle = async (catId: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
            return;
        }
        setIsDeleting(catId);
        try {
            const res = await xFetch(`/cat?id=${catId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to delete category");
                return;
            }
            toast.success(`Category "${title}" deleted successfully!`);
            setCats((prev) => prev.filter((c) => c._id !== catId));
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(catId);
                return next;
            });
            startTransition(() => {
                router.refresh();
            });
        } catch (err: any) {
            toast.error(err?.message || "Failed to delete category");
        } finally {
            setIsDeleting(null);
        }
    };

    // ── Bulk delete selected categories ──
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        if (!confirm(`Are you sure you want to delete ${count} selected categor${count === 1 ? "y" : "ies"}? Any subcategories will be re-parented.`)) {
            return;
        }
        setIsBulkDeleting(true);
        try {
            const res = await xFetch("/cat/bulk-delete", {
                method: "POST",
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to delete selected categories");
                return;
            }
            toast.success(`Successfully deleted ${data.deletedCount || count} categories!`);
            const idsToDelete = new Set(selectedIds);
            setCats((prev) => prev.filter((c) => !idsToDelete.has(c._id)));
            setSelectedIds(new Set());
            startTransition(() => {
                router.refresh();
            });
        } catch (err: any) {
            toast.error(err?.message || "Network error while deleting categories");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Parse lines into bulk rows in real-time
    const parsedRows: ParsedBulkRow[] = useMemo(() => {
        const lines = bulkInputText.split(/\r?\n/);
        const rows: ParsedBulkRow[] = [];
        const seenSlugs = new Set<string>();

        // Stack to track ancestor row keys for each depth level (0 through 9)
        const parentStack: Record<number, string> = {};

        lines.forEach((rawLine, index) => {
            const trimmed = rawLine.trim();
            if (!trimmed) return;

            // Detect indent level (tabs, 2+ spaces, or leading dashes/bullets) up to 10 levels (depth 0 to 9)
            let depth = 0;
            const tabMatch = rawLine.match(/^(\t+)/);
            if (tabMatch) {
                depth = tabMatch[1].length;
            } else {
                const prefixMatch = rawLine.match(/^([\s\-\—\*•]+)/);
                if (prefixMatch) {
                    const prefix = prefixMatch[1];
                    const tabs = (prefix.match(/\t/g) || []).length;
                    const spaces = (prefix.match(/ /g) || []).length;
                    const dashes = (prefix.match(/[\-\—\*•]/g) || []).length;

                    if (tabs > 0) {
                        depth = tabs;
                    } else if (spaces > 0) {
                        depth = Math.floor(spaces / 2);
                    } else if (dashes > 0) {
                        depth = dashes;
                    }
                }
            }
            depth = Math.max(0, Math.min(9, depth));

            const cleanTitle = trimmed.replace(/^[\s\-\—\*•\d.]+\s*/, "").trim() || trimmed;
            const rowKey = `line_${index}`;
            const override = rowOverrides[rowKey];

            const finalTitle = override?.title !== undefined ? override.title : cleanTitle;
            let baseSlug = override?.slug !== undefined ? override.slug : slugify(finalTitle);

            // Handle uniqueness within current input
            let finalSlug = baseSlug;
            let count = 1;
            while (seenSlugs.has(finalSlug)) {
                finalSlug = `${baseSlug}-${count}`;
                count++;
            }
            seenSlugs.add(finalSlug);

            // Resolve parentId
            let assignedParentId: string | null = defaultParentId || null;
            if (override?.parentId !== undefined) {
                assignedParentId = override.parentId;
            } else if (autoHierarchy && depth > 0) {
                // Find direct parent from ancestor stack
                for (let d = depth - 1; d >= 0; d--) {
                    if (parentStack[d]) {
                        assignedParentId = parentStack[d];
                        break;
                    }
                }
            }

            const rowItem: ParsedBulkRow = {
                id: rowKey,
                title: finalTitle,
                slug: finalSlug,
                parentId: assignedParentId,
                depth: autoHierarchy ? depth : 0,
                status: defaultStatus,
            };

            // Update ancestor stack for subsequent items
            parentStack[depth] = rowKey;
            for (let d = depth + 1; d <= 10; d++) {
                delete parentStack[d];
            }

            rows.push(rowItem);
        });

        return rows;
    }, [bulkInputText, defaultParentId, defaultStatus, autoHierarchy, rowOverrides]);

    // Handle single row edit in bulk modal
    const handleRowChange = (rowId: string, field: "title" | "slug" | "parentId", value: any) => {
        setRowOverrides((prev) => ({
            ...prev,
            [rowId]: {
                ...prev[rowId],
                [field]: value,
            },
        }));
    };

    // Remove single row from bulk input
    const handleRemoveRow = (index: number) => {
        const lines = bulkInputText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        lines.splice(index, 1);
        setBulkInputText(lines.join("\n"));
    };

    // Submit Bulk Creation
    const handleCreateAll = async () => {
        if (parsedRows.length === 0) {
            setBulkError("Please enter at least one category title.");
            return;
        }

        setIsSubmittingBulk(true);
        setBulkError("");
        setBulkSuccess("");

        try {
            const payload = {
                type,
                items: parsedRows.map((r) => ({
                    id: r.id,
                    title: r.title,
                    slug: r.slug,
                    parentId: r.parentId,
                    status: r.status,
                })),
            };

            const res = await xFetch("/cat/bulk-create", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setBulkError(data.error || "Failed to create categories in bulk.");
                return;
            }

            const newCategories = data.categories || [];
            setBulkSuccess(`Successfully created ${newCategories.length} categories!`);

            // Add newly created categories to local state
            setCats((prev) => [...prev, ...newCategories]);

            setTimeout(() => {
                setShowBulkModal(false);
                setBulkInputText("");
                setRowOverrides({});
                setBulkSuccess("");
                startTransition(() => {
                    router.refresh();
                });
            }, 1200);
        } catch (err: any) {
            setBulkError(err?.message || "Network error while saving categories.");
        } finally {
            setIsSubmittingBulk(false);
        }
    };

    const handlePasteSample = () => {
        const sample = `Electronics & Tech
  - Smartphones & Mobiles
    - Android Phones
      - Samsung Galaxy
        - Flagship S-Series
          - Ultra Models
            - 512GB Editions
              - Titanium Finish
                - Special Bundles
                  - Pre-order Limited Edition
  - Laptops & Computers
    - Gaming Laptops
      - RTX 4090 Series`;
        setBulkInputText(sample);
        setRowOverrides({});
    };

    return (
        <div className="space-y-6">
            {/* ── Top Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-main border border-indigo-100">
                            <Icon icon={catType.icon ?? "solar:folder-with-files-bold"} width={20} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">{catType.label}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            {cats.length} total
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">
                        Manage hierarchical categories, subcategories, slugs, and status.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Link Products / Brand Link Button */}
                    <button
                        type="button"
                        onClick={() => handleOpenLinkModal()}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition border border-indigo-200/60 shadow-2xs cursor-pointer"
                    >
                        <Icon icon={catType.key === "brands" ? "solar:tag-bold" : catType.key === "product-tag" ? "solar:hashtag-square-bold" : "solar:link-circle-bold"} width={16} />
                        {catType.key === "brands" ? "Brand Link" : catType.key === "product-tag" ? "Link Products to Tags" : "Link Products"}
                    </button>

                    {/* Bulk Add Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowBulkModal(true);
                            setBulkError("");
                            setBulkSuccess("");
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                    >
                        <Icon icon="solar:magic-stick-3-bold" width={16} />
                        Bulk Add {catType.label}
                    </button>

                    {/* Single Add Button */}
                    <Link
                        href={`/admin/category/${type}/new`}
                        className="inline-flex items-center gap-1.5 bg-linear-to-r from-main to-violet-600 hover:opacity-90 text-white px-4 py-2.5 rounded-xl font-semibold transition text-xs shadow-xs"
                    >
                        <Icon icon="solar:add-circle-bold" width={16} />
                        Add {catType.label}
                    </Link>
                </div>
            </div>

            {/* ── Filter / Search Bar ── */}
            <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                <div className="relative w-72">
                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-2.5 text-gray-400" width={15} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Search ${catType.label.toLowerCase()}...`}
                        className="w-full text-xs border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                    />
                </div>

                <div className="text-xs text-gray-400">
                    Showing <strong>{treeCats.length}</strong> of <strong>{cats.length}</strong> entries
                </div>
            </div>

            {/* ── Multi-Select Actions Bar ── */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-900 shadow-2xs animate-fade-in">
                    <div className="flex items-center gap-2.5">
                        <span className="font-bold bg-red-600 text-white px-2 py-0.5 rounded-md text-[11px]">
                            {selectedIds.size}
                        </span>
                        <span className="font-semibold text-gray-800">
                            categor{selectedIds.size === 1 ? "y" : "ies"} selected
                        </span>
                        <span className="text-gray-300">•</span>
                        <button
                            type="button"
                            onClick={() => setSelectedIds(new Set())}
                            className="text-gray-600 hover:text-gray-900 hover:underline font-medium cursor-pointer"
                        >
                            Deselect all
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Bulk Link Products Button */}
                        <button
                            type="button"
                            onClick={() => handleOpenLinkModal(undefined, Array.from(selectedIds))}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs cursor-pointer"
                            title={`Link products to the ${selectedIds.size} selected items`}
                        >
                            <Icon icon={catType.key === "product-tag" ? "solar:hashtag-square-bold" : catType.key === "brands" ? "solar:tag-bold" : "solar:link-circle-bold"} width={15} />
                            {catType.key === "product-tag" ? "Link Products to Selected Tags" : catType.key === "brands" ? "Brand Link Selected" : "Link Selected"} ({selectedIds.size})
                        </button>

                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                            {isBulkDeleting ? (
                                <>
                                    <Icon icon="svg-spinners:ring-resize" width={15} />
                                    Deleting {selectedIds.size}...
                                </>
                            ) : (
                                <>
                                    <Icon icon="solar:trash-bin-trash-bold" width={15} />
                                    Delete Selected ({selectedIds.size})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Category Tree Table ── */}
            {treeCats.length === 0 ? (
                <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                    <Icon icon={catType.icon ?? "solar:folder-bold"} width={48} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium text-gray-600">No {catType.label.toLowerCase()} entries found.</p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowBulkModal(true)}
                            className="inline-flex items-center gap-1 text-violet-600 hover:underline text-xs font-semibold cursor-pointer"
                        >
                            <Icon icon="solar:magic-stick-3-bold" width={14} />
                            Bulk create now
                        </button>
                        <span className="text-gray-300">•</span>
                        <Link
                            href={`/admin/category/${type}/new`}
                            className="inline-flex items-center gap-1 text-main hover:underline text-xs font-semibold"
                        >
                            <Icon icon="solar:add-circle-bold" width={14} />
                            Create single category
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-2xs bg-white">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-600 font-semibold">
                                <th className="w-10 px-4 py-3.5 text-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = someSelected;
                                        }}
                                        onChange={handleToggleSelectAll}
                                        className="w-4 h-4 rounded text-main border-gray-300 focus:ring-main cursor-pointer accent-indigo-600"
                                        title={allSelected ? "Deselect all" : "Select all"}
                                    />
                                </th>
                                <th className="text-left px-5 py-3.5">Hierarchy & Title</th>
                                <th className="text-center px-4 py-3.5">Count</th>
                                <th className="text-left px-5 py-3.5">Level</th>
                                <th className="text-left px-5 py-3.5">Slug</th>
                                <th className="text-left px-5 py-3.5">Status</th>
                                <th className="text-left px-5 py-3.5">Created</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {treeCats.map((cat) => {
                                const badge = STATUS_BADGE[cat.status] ?? STATUS_BADGE.draft;
                                const isRoot = cat.depth === 0;
                                const lvl = getLevelInfo(cat.depth);
                                const isSelected = selectedIds.has(cat._id);

                                return (
                                    <tr
                                        key={cat._id}
                                        className={`transition hover:bg-indigo-50/30 ${
                                            isSelected
                                                ? "bg-indigo-50/60 ring-1 ring-inset ring-indigo-200/70"
                                                : isRoot
                                                ? "bg-white"
                                                : cat.depth % 2 === 1
                                                ? "bg-gray-50/20"
                                                : "bg-gray-50/40"
                                        }`}
                                    >
                                        {/* Multi-Select Checkbox */}
                                        <td className="w-10 px-4 py-3.5 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(cat._id)}
                                                className="w-4 h-4 rounded text-main border-gray-300 focus:ring-main cursor-pointer accent-indigo-600"
                                            />
                                        </td>

                                        {/* Category Hierarchy & Title */}
                                        <td className="px-5 py-3.5">
                                            {isRoot ? (
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${lvl.iconCls}`}>
                                                        <Icon icon={lvl.icon} className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-gray-900 text-xs">
                                                            {cat.title}
                                                        </span>
                                                        {cat.hasChildren && (
                                                            <span className="text-[10px] text-gray-400">
                                                                Parent Category
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex items-center gap-2"
                                                    style={{ paddingLeft: `${Math.min(cat.depth * 1.25, 12)}rem` }}
                                                >
                                                    <div className="flex items-center text-gray-300 shrink-0 select-none">
                                                        <span className="font-mono text-gray-300 text-xs mr-1">└─</span>
                                                        <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center border ${lvl.iconCls}`}>
                                                            <Icon icon={lvl.icon} className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={`text-xs ${cat.depth === 1 ? "font-semibold text-gray-800" : "font-medium text-gray-700"}`}>
                                                            {cat.title}
                                                        </span>
                                                        {cat.parentTitle && (
                                                            <span className="text-[10px] text-gray-400">
                                                                under <strong className="text-gray-600 font-medium">{cat.parentTitle}</strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* Product / Item Counter Number */}
                                        <td className="px-4 py-3.5 text-center">
                                            <span
                                                className={`inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full text-xs font-bold ${
                                                    (cat.count ?? 0) > 0
                                                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                                                        : "bg-gray-100 text-gray-400 border border-gray-200/50"
                                                }`}
                                                title={`${cat.count ?? 0} item(s)`}
                                            >
                                                {cat.count ?? 0}
                                            </span>
                                        </td>

                                        {/* Level Badge */}
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${lvl.badgeCls}`}>
                                                {lvl.label}
                                            </span>
                                        </td>

                                        {/* Slug */}
                                        <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                                            /{cat.slug}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </td>

                                        {/* Created */}
                                        <td className="px-5 py-3.5 text-gray-400 text-[11px]">
                                            {new Date(cat.createdAt).toLocaleDateString()}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenLinkModal(cat._id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition cursor-pointer"
                                                    title={catType.key === "brands" ? `Link products directly to brand "${cat.title}"` : catType.key === "product-tag" ? `Link products directly to tag "${cat.title}"` : `Link products directly to "${cat.title}"`}
                                                >
                                                    <Icon icon={catType.key === "brands" ? "solar:tag-bold" : catType.key === "product-tag" ? "solar:hashtag-square-bold" : "solar:link-bold"} width={13} />
                                                    {catType.key === "brands" ? "Brand Link" : catType.key === "product-tag" ? "Tag Products" : "Link"}
                                                </button>
                                                <Link
                                                    href={`${viewBase}${cat.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                                        cat.status === "published"
                                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                    }`}
                                                >
                                                    <Icon icon="solar:eye-bold" width={13} /> View
                                                </Link>
                                                <Link
                                                    href={`/admin/category/${type}/${cat._id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-main hover:bg-indigo-100 transition"
                                                >
                                                    <Icon icon="solar:pen-bold" width={13} /> Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteSingle(cat._id, cat.title)}
                                                    disabled={isDeleting === cat._id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
                                                    title={`Delete "${cat.title}"`}
                                                >
                                                    {isDeleting === cat._id ? (
                                                        <Icon icon="svg-spinners:ring-resize" width={13} />
                                                    ) : (
                                                        <Icon icon="solar:trash-bin-trash-bold" width={13} />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Bulk Category Creator Modal ── */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                                    <Icon icon="solar:magic-stick-3-bold" width={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">
                                        Bulk Add {catType.label}
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Enter titles line-by-line. Slugs and hierarchy are automatically generated.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBulkModal(false)}
                                disabled={isSubmittingBulk}
                                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                            >
                                <Icon icon="solar:close-circle-bold" width={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Controls Bar */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200/70 text-xs">
                                {/* Default Parent Category */}
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Parent Category</label>
                                    <select
                                        value={defaultParentId}
                                        onChange={(e) => setDefaultParentId(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-400 font-medium text-gray-800"
                                    >
                                        <option value="">None (Top Level / Root)</option>
                                        {treeCats.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.depth > 0 ? `${"— ".repeat(c.depth)}${c.title}` : c.title} (L{c.depth + 1})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Default Status */}
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Status</label>
                                    <select
                                        value={defaultStatus}
                                        onChange={(e) => setDefaultStatus(e.target.value as "published" | "draft")}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-400 font-medium text-gray-800"
                                    >
                                        <option value="published">Published</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>

                                {/* Quick Tools */}
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Quick Sample</label>
                                    <button
                                        type="button"
                                        onClick={handlePasteSample}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium transition cursor-pointer"
                                    >
                                        <Icon icon="solar:clipboard-text-linear" width={14} />
                                        Paste 10-Level Sample
                                    </button>
                                </div>
                            </div>

                            {/* Textarea Input */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <Icon icon="solar:document-text-bold" width={14} className="text-violet-600" />
                                        Category Titles (One per line, up to 10 levels)
                                    </label>
                                    <span className="text-[11px] text-gray-400">
                                        Tip: Indent with 2 spaces, tabs, or dashes (&quot;- &quot;, &quot;-- &quot;) to create sub-levels (L1–L10)
                                    </span>
                                </div>
                                <textarea
                                    rows={6}
                                    value={bulkInputText}
                                    onChange={(e) => {
                                        setBulkInputText(e.target.value);
                                        setBulkError("");
                                    }}
                                    placeholder={`Electronics & Tech\n  - Smartphones & Mobiles\n    - Android Phones\n      - Samsung Galaxy\n        - Flagship S-Series\n          - Ultra Models\n  - Laptops & Computers`}
                                    className="w-full text-xs font-mono border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-500 bg-white leading-relaxed"
                                />
                            </div>

                            {/* Live Preview Table */}
                            {parsedRows.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                            <Icon icon="solar:eye-bold" width={14} className="text-emerald-600" />
                                            Auto-Generated Preview ({parsedRows.length} categories)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBulkInputText("");
                                                setRowOverrides({});
                                            }}
                                            className="text-[11px] text-red-500 hover:underline cursor-pointer"
                                        >
                                            Clear all
                                        </button>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                                        <table className="w-full text-left text-xs text-gray-700">
                                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 font-semibold text-[11px] text-gray-500">
                                                <tr>
                                                    <th className="px-3 py-2 w-10 text-center">#</th>
                                                    <th className="px-3 py-2 w-16 text-center">Level</th>
                                                    <th className="px-3 py-2 w-1/3">Title</th>
                                                    <th className="px-3 py-2 w-1/4">Auto Slug</th>
                                                    <th className="px-3 py-2">Parent</th>
                                                    <th className="px-3 py-2 w-10 text-center">Del</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {parsedRows.map((row, idx) => {
                                                    const rowLvl = getLevelInfo(row.depth);
                                                    return (
                                                        <tr key={row.id} className="hover:bg-gray-50/80">
                                                            <td className="px-3 py-2 text-center text-gray-400 text-[11px]">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="px-2 py-1.5 text-center">
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rowLvl.badgeCls}`}>
                                                                    L{row.depth + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-1.5">
                                                                <div
                                                                    className="flex items-center gap-1.5"
                                                                    style={{ paddingLeft: `${Math.min(row.depth * 0.75, 6)}rem` }}
                                                                >
                                                                    {row.depth > 0 && (
                                                                        <span className="font-mono text-gray-300 text-xs shrink-0 select-none">└─</span>
                                                                    )}
                                                                    <input
                                                                        type="text"
                                                                        value={row.title}
                                                                        onChange={(e) => handleRowChange(row.id, "title", e.target.value)}
                                                                        className="w-full text-xs font-semibold border border-transparent hover:border-gray-200 focus:border-violet-400 rounded px-1.5 py-0.5 bg-transparent focus:bg-white"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-1.5 font-mono text-[11px] text-violet-700">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-gray-300">/</span>
                                                                    <input
                                                                        type="text"
                                                                        value={row.slug}
                                                                        onChange={(e) => handleRowChange(row.id, "slug", e.target.value)}
                                                                        className="w-full text-[11px] font-mono border border-transparent hover:border-gray-200 focus:border-violet-400 rounded px-1 py-0.5 bg-transparent focus:bg-white text-violet-700"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-1.5">
                                                                <select
                                                                    value={row.parentId || ""}
                                                                    onChange={(e) => handleRowChange(row.id, "parentId", e.target.value || null)}
                                                                    className="w-full text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700"
                                                                >
                                                                    <option value="">Root / Top Level</option>
                                                                    {/* Previous items in this batch */}
                                                                    {idx > 0 && (
                                                                        <optgroup label="This Batch">
                                                                            {parsedRows.slice(0, idx).map((prevRow, pIdx) => (
                                                                                <option key={prevRow.id} value={prevRow.id}>
                                                                                    {"— ".repeat(prevRow.depth)}#{pIdx + 1} {prevRow.title} (L{prevRow.depth + 1})
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    )}
                                                                    {/* Existing categories */}
                                                                    {treeCats.length > 0 && (
                                                                        <optgroup label="Existing Categories">
                                                                            {treeCats.map((c) => (
                                                                                <option key={c._id} value={c._id}>
                                                                                    {c.depth > 0 ? `${"— ".repeat(c.depth)}${c.title}` : c.title} (L{c.depth + 1})
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    )}
                                                                </select>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRow(idx)}
                                                                    className="text-gray-400 hover:text-red-600 transition p-1 cursor-pointer"
                                                                >
                                                                    <Icon icon="solar:trash-bin-trash-bold" width={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Notifications */}
                            {bulkError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                                    <Icon icon="solar:danger-triangle-bold" width={16} />
                                    {bulkError}
                                </div>
                            )}

                            {bulkSuccess && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                                    <Icon icon="solar:check-circle-bold" width={16} />
                                    {bulkSuccess}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/70">
                            <span className="text-xs text-gray-500">
                                {parsedRows.length > 0 ? (
                                    <>Ready to create <strong>{parsedRows.length}</strong> categories at once.</>
                                ) : (
                                    "Enter titles above to see preview."
                                )}
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    disabled={isSubmittingBulk}
                                    className="px-4 py-2 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateAll}
                                    disabled={parsedRows.length === 0 || isSubmittingBulk}
                                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isSubmittingBulk ? (
                                        <>
                                            <Icon icon="svg-spinners:ring-resize" width={15} />
                                            Creating Categories...
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:check-circle-bold" width={15} />
                                            Create All Categories ({parsedRows.length})
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Link Products / Brand Link Modal ── */}
            <LinkProductsModal
                isOpen={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                catType={catType}
                categories={treeCats}
                initialTargetId={linkTargetCatId}
                initialTargetIds={linkTargetCatIds}
                onSuccess={() => {
                    startTransition(() => {
                        router.refresh();
                    });
                }}
            />
        </div>
    );
}
