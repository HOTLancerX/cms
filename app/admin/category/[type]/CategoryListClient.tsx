"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

export interface CatItem {
    _id: string;
    title: string;
    slug: string;
    parentId: string | null;
    status: string;
    createdAt: string;
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

    const [cats, setCats] = useState<CatItem[]>(initialCats);
    const [search, setSearch] = useState("");

    // ── Bulk Modal State ──
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkInputText, setBulkInputText] = useState("");
    const [defaultParentId, setDefaultParentId] = useState<string>("");
    const [defaultStatus, setDefaultStatus] = useState<"published" | "draft">("published");
    const [autoHierarchy, setAutoHierarchy] = useState(true);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [bulkSuccess, setBulkSuccess] = useState("");

    // ── Link Products Modal State ──
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkTargetCatId, setLinkTargetCatId] = useState<string>("");
    const [sourceCatFilter, setSourceCatFilter] = useState<string>("");
    const [uncategorizedCount, setUncategorizedCount] = useState<number | null>(null);
    const [productSearch, setProductSearch] = useState("");
    const [matchCase, setMatchCase] = useState(false);
    const [exactMatch, setExactMatch] = useState(false);
    const [linkPage, setLinkPage] = useState(1);
    const [totalLinkProducts, setTotalLinkProducts] = useState(0);
    const [totalLinkPages, setTotalLinkPages] = useState(1);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isSubmittingLink, setIsSubmittingLink] = useState(false);
    const [linkError, setLinkError] = useState("");
    const [linkSuccess, setLinkSuccess] = useState("");

    // Custom row overrides in bulk modal
    const [rowOverrides, setRowOverrides] = useState<Record<string, { title?: string; slug?: string; parentId?: string | null }>>({});

    // Fetch products to link (excluding products already in the selected target category)
    const searchProducts = async (
        q: string = productSearch,
        excludeId: string = linkTargetCatId,
        sourceId: string = sourceCatFilter,
        page: number = linkPage,
        isCase: boolean = matchCase,
        isExact: boolean = exactMatch
    ) => {
        setIsSearchingProducts(true);
        setLinkError("");
        try {
            const p = new URLSearchParams({
                search: q,
                type: catType.postType || "product",
                excludeCatId: excludeId || "",
                sourceCatId: sourceId || "",
                limit: "100",
                page: String(page),
                matchCase: String(isCase),
                exactMatch: String(isExact),
            });
            const res = await fetch(`/api/admin/category/link-products?${p.toString()}`);
            const data = await res.json();
            if (res.ok) {
                setProductsList(data.products || []);
                setTotalLinkProducts(typeof data.total === "number" ? data.total : (data.products?.length || 0));
                setTotalLinkPages(typeof data.totalPages === "number" ? data.totalPages : 1);
                setLinkPage(typeof data.page === "number" ? data.page : page);
                if (typeof data.uncategorizedCount === "number") {
                    setUncategorizedCount(data.uncategorizedCount);
                }
            } else {
                setLinkError(data.error || "Failed to search products.");
            }
        } catch {
            setLinkError("Network error while searching products.");
        } finally {
            setIsSearchingProducts(false);
        }
    };

    // Open Link Products Modal
    const handleOpenLinkModal = (catId?: string) => {
        const targetId = catId || (cats.length > 0 ? cats[0]._id : "");
        setLinkTargetCatId(targetId);
        setSourceCatFilter("uncategorized");
        setProductSearch("");
        setMatchCase(false);
        setExactMatch(false);
        setLinkPage(1);
        setSelectedProductIds([]);
        setLinkError("");
        setLinkSuccess("");
        setShowLinkModal(true);
        searchProducts("", targetId, "uncategorized", 1, false, false);
    };

    // Handle Target Category Change
    const handleTargetCategoryChange = (newTargetId: string) => {
        setLinkTargetCatId(newTargetId);
        setSelectedProductIds([]);
        setLinkPage(1);
        searchProducts(productSearch, newTargetId, sourceCatFilter, 1, matchCase, exactMatch);
    };

    // Handle Source Category Filter Change
    const handleSourceCategoryChange = (newSourceId: string) => {
        setSourceCatFilter(newSourceId);
        setSelectedProductIds([]);
        setLinkPage(1);
        searchProducts(productSearch, linkTargetCatId, newSourceId, 1, matchCase, exactMatch);
    };

    // Toggle match case filter
    const handleToggleMatchCase = () => {
        const nextCase = !matchCase;
        setMatchCase(nextCase);
        setLinkPage(1);
        searchProducts(productSearch, linkTargetCatId, sourceCatFilter, 1, nextCase, exactMatch);
    };

    // Toggle exact match filter
    const handleToggleExactMatch = () => {
        const nextExact = !exactMatch;
        setExactMatch(nextExact);
        setLinkPage(1);
        searchProducts(productSearch, linkTargetCatId, sourceCatFilter, 1, matchCase, nextExact);
    };

    // Handle Link modal page change
    const handleLinkPageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalLinkPages || newPage === linkPage) return;
        setLinkPage(newPage);
        searchProducts(productSearch, linkTargetCatId, sourceCatFilter, newPage, matchCase, exactMatch);
    };

    // Generate page numbers for link modal
    const getLinkPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalLinkPages <= 7) {
            for (let i = 1; i <= totalLinkPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (linkPage > 3) {
                pages.push("...");
            }
            const start = Math.max(2, linkPage - 1);
            const end = Math.min(totalLinkPages - 1, linkPage + 1);
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            if (linkPage < totalLinkPages - 2) {
                pages.push("...");
            }
            pages.push(totalLinkPages);
        }
        return pages;
    };

    // Toggle product selection
    const toggleSelectProduct = (id: string) => {
        setSelectedProductIds((prev) =>
            prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
        );
    };

    // Are all visible products on the current page selected
    const areAllVisibleSelected = useMemo(() => {
        return productsList.length > 0 && productsList.every((p) => selectedProductIds.includes(p._id));
    }, [productsList, selectedProductIds]);

    // Select/Deselect all visible products
    const toggleSelectAllProducts = () => {
        if (areAllVisibleSelected) {
            setSelectedProductIds((prev) => prev.filter((id) => !productsList.some((p) => p._id === id)));
        } else {
            setSelectedProductIds((prev) => Array.from(new Set([...prev, ...productsList.map((p) => p._id)])));
        }
    };

    // Submit Link Products
    const handleSubmitLinkProducts = async () => {
        if (!linkTargetCatId) {
            setLinkError("Please select a target category.");
            return;
        }
        if (selectedProductIds.length === 0) {
            setLinkError("Please select at least one product to link.");
            return;
        }

        setIsSubmittingLink(true);
        setLinkError("");
        setLinkSuccess("");

        try {
            const res = await fetch("/api/admin/category/link-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId: linkTargetCatId,
                    productIds: selectedProductIds,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setLinkError(data.error || "Failed to link products.");
                return;
            }

            const targetCat = cats.find((c) => c._id === linkTargetCatId);
            setLinkSuccess(`Successfully linked ${selectedProductIds.length} product(s) to "${targetCat?.title || 'category'}"!`);

            setSelectedProductIds([]);
            // Refresh current page of products and counts
            await searchProducts(productSearch, linkTargetCatId, sourceCatFilter, linkPage, matchCase, exactMatch);

            setTimeout(() => {
                setLinkSuccess("");
            }, 3000);
        } catch (err: any) {
            setLinkError(err?.message || "Network error while linking products.");
        } finally {
            setIsSubmittingLink(false);
        }
    };

    // Filter categories by search
    const filteredCats = useMemo(() => {
        if (!search.trim()) return cats;
        const q = search.toLowerCase();
        return cats.filter((c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }, [cats, search]);

    const treeCats = useMemo(() => buildCategoryTree(filteredCats), [filteredCats]);

    // Parse lines into bulk rows in real-time
    const parsedRows: ParsedBulkRow[] = useMemo(() => {
        const lines = bulkInputText.split(/\r?\n/);
        const rows: ParsedBulkRow[] = [];
        const seenSlugs = new Set<string>();

        let lastRootId: string | null = null;

        lines.forEach((rawLine, index) => {
            const trimmed = rawLine.trim();
            if (!trimmed) return;

            // Detect indent level (tabs or 2+ spaces or leading "- ")
            let depth = 0;
            const indentMatch = rawLine.match(/^(\s+|-+\s*)/);
            if (indentMatch) {
                const indentStr = indentMatch[1];
                if (indentStr.includes("\t")) {
                    depth = 1;
                } else if (indentStr.startsWith("-") || indentStr.startsWith("—")) {
                    depth = 1;
                } else {
                    depth = Math.min(2, Math.floor(indentStr.length / 2));
                }
            }

            const cleanTitle = trimmed.replace(/^[-*•–—\d.]+\s*/, "").trim() || trimmed;
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
            } else if (autoHierarchy && depth > 0 && lastRootId) {
                assignedParentId = lastRootId;
            }

            const rowItem: ParsedBulkRow = {
                id: rowKey,
                title: finalTitle,
                slug: finalSlug,
                parentId: assignedParentId,
                depth: autoHierarchy ? depth : 0,
                status: defaultStatus,
            };

            if (depth === 0) {
                lastRootId = null; // Will link to standard parent or none
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
                    title: r.title,
                    slug: r.slug,
                    parentId: r.parentId,
                    status: r.status,
                })),
            };

            const res = await fetch("/api/admin/category/bulk-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
        const sample = `Smartphones & Mobiles\n  - Android Phones\n  - Apple iPhones\n  - Refurbished Phones\nLaptops & Computers\n  - Gaming Laptops\n  - Ultrabooks\nAudio & Sound\n  - Wireless Earbuds\n  - Bluetooth Speakers`;
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
                    {/* Link Products Button */}
                    <button
                        type="button"
                        onClick={() => handleOpenLinkModal()}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition border border-indigo-200/60 shadow-2xs cursor-pointer"
                    >
                        <Icon icon="solar:link-circle-bold" width={16} />
                        Link Products
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
                                <th className="text-left px-5 py-3.5">Hierarchy & Title</th>
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
                                const isChild = cat.depth === 1;
                                const isSubChild = cat.depth >= 2;

                                return (
                                    <tr
                                        key={cat._id}
                                        className={`transition hover:bg-indigo-50/30 ${
                                            isRoot ? "bg-white" : isChild ? "bg-gray-50/30" : "bg-gray-50/60"
                                        }`}
                                    >
                                        {/* Category Hierarchy & Title */}
                                        <td className="px-5 py-3.5">
                                            {isRoot && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-main flex items-center justify-center shrink-0 border border-indigo-100">
                                                        <Icon icon="solar:folder-with-files-bold" className="w-3.5 h-3.5" />
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
                                            )}

                                            {isChild && (
                                                <div className="flex items-center gap-2 pl-6">
                                                    <div className="flex items-center text-gray-300 shrink-0 select-none">
                                                        <span className="font-mono text-gray-300 text-xs mr-1">└─</span>
                                                        <div className="w-5.5 h-5.5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                                                            <Icon icon="solar:subdirectory-right-bold" className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-gray-800 text-xs">
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

                                            {isSubChild && (
                                                <div
                                                    className="flex items-center gap-2"
                                                    style={{ paddingLeft: `${cat.depth * 1.75}rem` }}
                                                >
                                                    <div className="flex items-center text-gray-300 shrink-0 select-none">
                                                        <span className="font-mono text-gray-300 text-xs mr-1">└── └─</span>
                                                        <div className="w-5.5 h-5.5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/60">
                                                            <Icon icon="solar:diagram-up-bold" className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium text-gray-800 text-xs">
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

                                        {/* Level Badge */}
                                        <td className="px-5 py-3.5">
                                            {isRoot && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-main border border-indigo-200/60">
                                                    Parent (L1)
                                                </span>
                                            )}
                                            {isChild && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                                                    Child (L2)
                                                </span>
                                            )}
                                            {isSubChild && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                                                    Subchild (L{cat.depth + 1})
                                                </span>
                                            )}
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
                                                    title={`Link products directly to "${cat.title}"`}
                                                >
                                                    <Icon icon="solar:link-bold" width={13} /> Link
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
                                        {cats.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.title}
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
                                        Paste Sample Format
                                    </button>
                                </div>
                            </div>

                            {/* Textarea Input */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <Icon icon="solar:document-text-bold" width={14} className="text-violet-600" />
                                        Category Titles (One per line)
                                    </label>
                                    <span className="text-[11px] text-gray-400">
                                        Tip: Indent with spaces or &quot;- &quot; to create subcategories
                                    </span>
                                </div>
                                <textarea
                                    rows={6}
                                    value={bulkInputText}
                                    onChange={(e) => {
                                        setBulkInputText(e.target.value);
                                        setBulkError("");
                                    }}
                                    placeholder={`Smartphones & Mobiles\n  - Android Phones\n  - iPhones\nLaptops & Computers\n  - Gaming Laptops\nSmart Watches\nAudio & Sound`}
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

                                    <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                                        <table className="w-full text-left text-xs text-gray-700">
                                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 font-semibold text-[11px] text-gray-500">
                                                <tr>
                                                    <th className="px-3 py-2 w-10 text-center">#</th>
                                                    <th className="px-3 py-2 w-1/3">Title</th>
                                                    <th className="px-3 py-2 w-1/3">Auto Slug</th>
                                                    <th className="px-3 py-2">Parent</th>
                                                    <th className="px-3 py-2 w-10 text-center">Del</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {parsedRows.map((row, idx) => (
                                                    <tr key={row.id} className="hover:bg-gray-50/80">
                                                        <td className="px-3 py-2 text-center text-gray-400 text-[11px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-3 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={row.title}
                                                                onChange={(e) => handleRowChange(row.id, "title", e.target.value)}
                                                                className="w-full text-xs font-semibold border border-transparent hover:border-gray-200 focus:border-violet-400 rounded px-1.5 py-0.5 bg-transparent focus:bg-white"
                                                            />
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
                                                                <option value="">Root</option>
                                                                {cats.map((c) => (
                                                                    <option key={c._id} value={c._id}>
                                                                        {c.title}
                                                                    </option>
                                                                ))}
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
                                                ))}
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
            {/* ── Link Products to Category Modal ── */}
            {showLinkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                    <Icon icon="solar:link-circle-bold" width={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">
                                        Link {catType.postType ? catType.postType.charAt(0).toUpperCase() + catType.postType.slice(1) : "Products"} to Category
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Select a category, search items, and link them with 1 click.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowLinkModal(false)}
                                disabled={isSubmittingLink}
                                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                            >
                                <Icon icon="solar:close-circle-bold" width={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-2 md:p-4 overflow-y-auto space-y-5 flex-1">
                            {/* Two Side-by-Side Category Selectors */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Box 1: Target Category (Destination) */}
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                            <Icon icon="solar:folder-with-files-bold" width={15} className="text-indigo-600" />
                                            1. Target Category (Assign To)
                                        </label>
                                        <span className="text-[10px] text-indigo-600 font-medium">
                                            Hidden from search below
                                        </span>
                                    </div>
                                    <select
                                        value={linkTargetCatId}
                                        onChange={(e) => handleTargetCategoryChange(e.target.value)}
                                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                                    >
                                        <option value="" disabled>-- Select a Target Category --</option>
                                        {treeCats.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.depth > 0 ? `${"— ".repeat(c.depth)}${c.title}` : c.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Box 2: Source Category (Filter to select products from) */}
                                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/60 flex flex-col justify-between space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                            <Icon icon="solar:folder-linear" width={15} className="text-amber-700" />
                                            2. Select Category (Search From)
                                        </label>
                                        <span className="text-[10px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
                                            {uncategorizedCount !== null ? `${uncategorizedCount} Uncategorized` : "Uncategorized by default"}
                                        </span>
                                    </div>
                                    <select
                                        value={sourceCatFilter}
                                        onChange={(e) => handleSourceCategoryChange(e.target.value)}
                                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                    >
                                        <option value="uncategorized">
                                            📂 Uncategorized Products ({uncategorizedCount !== null ? uncategorizedCount : 0})
                                        </option>
                                        <optgroup label="Or select a specific category:">
                                            {cats
                                                .filter((c) => c._id !== linkTargetCatId)
                                                .map((c) => (
                                                    <option key={c._id} value={c._id}>
                                                        📁 {c.title}
                                                    </option>
                                                ))}
                                        </optgroup>
                                        <option value="all">🌐 All Products from other categories</option>
                                    </select>
                                </div>
                            </div>

                            {/* Search & Selection Toolbar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <Icon icon="solar:magnifer-linear" width={14} className="text-violet-600" />
                                        Search & Select {catType.postType ? catType.postType.charAt(0).toUpperCase() + catType.postType.slice(1) : "Products"} to Link
                                    </label>
                                    <div className="flex items-center gap-2 text-xs">
                                        {productsList.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={toggleSelectAllProducts}
                                                className="text-violet-600 hover:underline font-semibold cursor-pointer"
                                            >
                                                {areAllVisibleSelected ? "Deselect All Visible" : "Select All Visible"}
                                            </button>
                                        )}
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                            {selectedProductIds.length} selected
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <div className="relative flex-1">
                                        <Icon icon="solar:magnifer-linear" className="absolute left-3 top-2.5 text-gray-400" width={15} />
                                        <input
                                            type="text"
                                            value={productSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setProductSearch(val);
                                                setLinkPage(1);
                                                searchProducts(val, linkTargetCatId, sourceCatFilter, 1, matchCase, exactMatch);
                                            }}
                                            placeholder={`Search ${sourceCatFilter === 'uncategorized' ? 'uncategorized products' : 'products'} by title or slug...`}
                                            className="w-full text-xs border border-gray-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-500 bg-white"
                                        />
                                        {productSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setProductSearch("");
                                                    setLinkPage(1);
                                                    searchProducts("", linkTargetCatId, sourceCatFilter, 1, matchCase, exactMatch);
                                                }}
                                                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                            >
                                                <Icon icon="solar:close-circle-linear" width={15} />
                                            </button>
                                        )}
                                    </div>

                                    {/* 2 Filtering Options on the Right Side of Search */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleToggleMatchCase}
                                            title={matchCase ? "Match Case: Active (Case sensitive uppercase/lowercase)" : "Match Case: Inactive (Ignore case)"}
                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer select-none ${
                                                matchCase
                                                    ? "bg-violet-100/90 border-violet-300 text-violet-800 shadow-xs ring-1 ring-violet-400/40"
                                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                                            }`}
                                        >
                                            <span className={`px-1 py-0.2 rounded text-[11px] font-mono font-bold ${matchCase ? "bg-violet-200 text-violet-900" : "bg-gray-100 text-gray-500"}`}>
                                                Aa
                                            </span>
                                            <span>Match Case</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleToggleExactMatch}
                                            title={exactMatch ? "Exact Match: Active (Strict title/slug match)" : "Exact Match: Inactive (Partial substring match)"}
                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer select-none ${
                                                exactMatch
                                                    ? "bg-violet-100/90 border-violet-300 text-violet-800 shadow-xs ring-1 ring-violet-400/40"
                                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                                            }`}
                                        >
                                            <span className={`px-1 py-0.2 rounded text-[11px] font-mono font-bold ${exactMatch ? "bg-violet-200 text-violet-900" : "bg-gray-100 text-gray-500"}`}>
                                                &quot;&quot;
                                            </span>
                                            <span>Exact Match</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Products List Table */}
                            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden max-h-100 overflow-y-auto">
                                {isSearchingProducts ? (
                                    <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                                        <Icon icon="svg-spinners:ring-resize" width={22} className="text-violet-500" />
                                        Searching items...
                                    </div>
                                ) : productsList.length === 0 ? (
                                    <div className="py-12 text-center text-gray-400 text-xs">
                                        <Icon icon="solar:box-minimalistic-linear" width={28} className="mx-auto mb-1.5 text-gray-300" />
                                        No products available to link for this category.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs text-gray-700">
                                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 font-semibold text-[11px] text-gray-500 z-10">
                                            <tr>
                                                <th className="p-3 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={areAllVisibleSelected}
                                                        onChange={toggleSelectAllProducts}
                                                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                    />
                                                </th>
                                                <th className="p-3 w-14">Image</th>
                                                <th className="p-3">Title & Slug</th>
                                                <th className="p-3 w-48">Added Category</th>
                                                <th className="p-3 w-20 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {productsList.map((prod) => {
                                                const isSelected = selectedProductIds.includes(prod._id);

                                                return (
                                                    <tr
                                                        key={prod._id}
                                                        onClick={() => toggleSelectProduct(prod._id)}
                                                        className={`hover:bg-violet-50/40 transition cursor-pointer ${
                                                            isSelected ? "bg-violet-50/60" : ""
                                                        }`}
                                                    >
                                                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectProduct(prod._id)}
                                                                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            {prod.image ? (
                                                                <div className="w-9 h-9 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={prod.image}
                                                                        alt={prod.title}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-lg bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                                                                    <Icon icon="solar:camera-minimalistic-linear" width={14} />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 font-medium">
                                                            <p className="font-semibold text-gray-900 line-clamp-1">
                                                                {prod.title}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-gray-400">
                                                                /{prod.slug}
                                                            </p>
                                                        </td>
                                                        <td className="p-3">
                                                            {prod.categoryTitle ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                                                                    <Icon icon="solar:folder-bold" width={12} className="text-amber-600" />
                                                                    {prod.categoryTitle}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-normal text-gray-400 bg-gray-50 border border-gray-200/60 italic">
                                                                    Uncategorized
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                {prod.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Pagination (appears when there are more than a hundred products) */}
                            {totalLinkProducts > 100 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <span>
                                            Showing <strong className="text-gray-800 font-bold">{(linkPage - 1) * 100 + 1}</strong> to{" "}
                                            <strong className="text-gray-800 font-bold">{Math.min(linkPage * 100, totalLinkProducts)}</strong> of{" "}
                                            <strong className="text-gray-800 font-bold">{totalLinkProducts}</strong> products
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Prev Page */}
                                        <button
                                            type="button"
                                            onClick={() => handleLinkPageChange(linkPage - 1)}
                                            disabled={linkPage === 1 || isSearchingProducts}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                                        >
                                            <Icon icon="solar:alt-arrow-left-bold" width={13} />
                                            Prev
                                        </button>

                                        {/* Page Numbers */}
                                        <div className="flex items-center gap-1">
                                            {getLinkPageNumbers().map((p, idx) => {
                                                if (p === "...") {
                                                    return (
                                                        <span key={`ell-${idx}`} className="px-1 text-gray-400 select-none">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                const pageNum = Number(p);
                                                const isActive = pageNum === linkPage;
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        type="button"
                                                        onClick={() => handleLinkPageChange(pageNum)}
                                                        disabled={isSearchingProducts}
                                                        className={`min-w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                                                            isActive
                                                                ? "bg-violet-600 text-white shadow-xs"
                                                                : "text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 hover:text-gray-900"
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Next Page */}
                                        <button
                                            type="button"
                                            onClick={() => handleLinkPageChange(linkPage + 1)}
                                            disabled={linkPage === totalLinkPages || isSearchingProducts}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                                        >
                                            Next
                                            <Icon icon="solar:alt-arrow-right-bold" width={13} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Notifications */}
                            {linkError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                                    <Icon icon="solar:danger-triangle-bold" width={16} />
                                    {linkError}
                                </div>
                            )}

                            {linkSuccess && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                                    <Icon icon="solar:check-circle-bold" width={16} />
                                    {linkSuccess}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/70">
                            <span className="text-xs text-gray-500">
                                {selectedProductIds.length > 0 ? (
                                    <>
                                        <strong>{selectedProductIds.length}</strong> product(s) selected to link to <strong>{cats.find(c => c._id === linkTargetCatId)?.title || "target category"}</strong>.
                                    </>
                                ) : (
                                    "Select items from the list above to link."
                                )}
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLinkModal(false)}
                                    disabled={isSubmittingLink}
                                    className="px-4 py-2 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitLinkProducts}
                                    disabled={selectedProductIds.length === 0 || !linkTargetCatId || isSubmittingLink}
                                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isSubmittingLink ? (
                                        <>
                                            <Icon icon="svg-spinners:ring-resize" width={15} />
                                            Linking Products...
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:link-circle-bold" width={15} />
                                            Link Selected ({selectedProductIds.length})
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
