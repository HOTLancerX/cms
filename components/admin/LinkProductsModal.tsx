"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";

export interface LinkCategoryOption {
    _id: string;
    title: string;
    depth?: number;
    parentId?: string | null;
}

export interface LinkProductItem {
    _id: string;
    title: string;
    slug: string;
    type: string;
    status: string;
    categoryId: string | null;
    categoryTitle: string | null;
    brandId?: string | null;
    brandTitle?: string | null;
    image: string | null;
    createdAt: string;
}

export interface LinkProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    catType: {
        key: string;
        label: string;
        postType?: string;
        icon?: string;
    };
    initialTargetId?: string;
    categories: LinkCategoryOption[];
    onSuccess?: () => void;
}

export default function LinkProductsModal({
    isOpen,
    onClose,
    catType,
    initialTargetId,
    categories = [],
    onSuccess,
}: LinkProductsModalProps) {
    const isBrand = catType.key === "brands";

    // ── Target & Source selection ──
    const [targetId, setTargetId] = useState<string>(initialTargetId || (categories[0]?._id ?? ""));
    const [sourceFilter, setSourceFilter] = useState<string>(isBrand ? "unbranded" : "uncategorized");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Additional categories list for brand category filtering
    const [productCategories, setProductCategories] = useState<{ _id: string; title: string }[]>([]);

    // ── Search & Filter State ──
    const [search, setSearch] = useState("");
    const [matchCase, setMatchCase] = useState(false);
    const [exactMatch, setExactMatch] = useState(false);
    const [page, setPage] = useState(1);

    // ── Data State ──
    const [products, setProducts] = useState<LinkProductItem[]>([]);
    const [totalMatching, setTotalMatching] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [uncategorizedCount, setUncategorizedCount] = useState<number | null>(null);
    const [unbrandedCount, setUnbrandedCount] = useState<number | null>(null);

    // ── Selection & Submitting ──
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Update targetId when initialTargetId changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialTargetId) {
                setTargetId(initialTargetId);
            } else if (categories.length > 0 && !targetId) {
                setTargetId(categories[0]._id);
            }
            setSourceFilter(isBrand ? "unbranded" : "uncategorized");
            setCategoryFilter("all");
            setSelectedIds([]);
            setPage(1);
            setSearch("");
            setErrorMsg("");
            setSuccessMsg("");
        }
    }, [isOpen, initialTargetId, isBrand, categories]);

    // Fetch product categories when in brand mode for the category filter dropdown
    useEffect(() => {
        if (isOpen && isBrand) {
            fetch(`/api/admin/category/link-products?type=product&limit=1`)
                .catch(() => {});
            // Fetch product-category list
            fetch(`/api/product-category?limit=100`)
                .catch(() => {});
        }
    }, [isOpen, isBrand]);

    // ── Fetch products ──
    const fetchProducts = useCallback(async (
        q: string = search,
        tgtId: string = targetId,
        srcFilter: string = sourceFilter,
        catFilter: string = categoryFilter,
        pg: number = page,
        isC: boolean = matchCase,
        isE: boolean = exactMatch
    ) => {
        setLoading(true);
        setErrorMsg("");
        try {
            const params = new URLSearchParams({
                search: q,
                type: catType.postType || "product",
                excludeCatId: tgtId || "",
                sourceCatId: srcFilter || "",
                sourceCategoryFilter: catFilter !== "all" ? catFilter : "",
                catType: catType.key,
                isBrand: String(isBrand),
                limit: "100",
                page: String(pg),
                matchCase: String(isC),
                exactMatch: String(isE),
            });

            const res = await fetch(`/api/admin/category/link-products?${params.toString()}`);
            const data = await res.json();
            if (res.ok) {
                setProducts(data.products || []);
                setTotalMatching(typeof data.total === "number" ? data.total : (data.products?.length || 0));
                setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 1);
                setPage(typeof data.page === "number" ? data.page : pg);
                if (typeof data.uncategorizedCount === "number") setUncategorizedCount(data.uncategorizedCount);
                if (typeof data.unbrandedCount === "number") setUnbrandedCount(data.unbrandedCount);
            } else {
                setErrorMsg(data.error || "Failed to search products.");
            }
        } catch {
            setErrorMsg("Network error while searching products.");
        } finally {
            setLoading(false);
        }
    }, [search, targetId, sourceFilter, categoryFilter, page, matchCase, exactMatch, catType, isBrand]);

    // Trigger fetch on open or filter change
    useEffect(() => {
        if (isOpen) {
            fetchProducts(search, targetId, sourceFilter, categoryFilter, page, matchCase, exactMatch);
        }
    }, [isOpen, targetId, sourceFilter, categoryFilter, page, matchCase, exactMatch]);

    // Handle search input debounce or submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchProducts(search, targetId, sourceFilter, categoryFilter, 1, matchCase, exactMatch);
    };

    // Toggle product selection
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
        );
    };

    const areAllVisibleSelected = useMemo(() => {
        return products.length > 0 && products.every((p) => selectedIds.includes(p._id));
    }, [products, selectedIds]);

    const toggleSelectAll = () => {
        if (areAllVisibleSelected) {
            setSelectedIds((prev) => prev.filter((id) => !products.some((p) => p._id === id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...products.map((p) => p._id)])));
        }
    };

    // Submit linking
    const handleSubmit = async () => {
        if (!targetId) {
            setErrorMsg(isBrand ? "Please select a target brand." : "Please select a target category.");
            return;
        }
        if (selectedIds.length === 0) {
            setErrorMsg("Please select at least one product to link.");
            return;
        }

        setSubmitting(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const res = await fetch("/api/admin/category/link-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId: targetId,
                    brandId: targetId,
                    productIds: selectedIds,
                    isBrand,
                    catType: catType.key,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || "Failed to link products.");
                return;
            }

            const targetItem = categories.find((c) => c._id === targetId);
            const targetName = targetItem?.title || (isBrand ? "Brand" : "Category");
            setSuccessMsg(
                isBrand
                    ? `Successfully linked ${selectedIds.length} product(s) to brand "${targetName}"!`
                    : `Successfully linked ${selectedIds.length} product(s) to category "${targetName}"!`
            );

            setSelectedIds([]);
            onSuccess?.();

            // Refresh current product list
            await fetchProducts(search, targetId, sourceFilter, categoryFilter, page, matchCase, exactMatch);

            setTimeout(() => {
                setSuccessMsg("");
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err?.message || "Network error while linking products.");
        } finally {
            setSubmitting(false);
        }
    };

    // Pagination helper
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-gray-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* ── Modal Header ── */}
                <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <Icon icon={isBrand ? "solar:tag-bold" : "solar:link-circle-bold"} width={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                {isBrand ? "Brand Link — Link Products to Brand" : `Link Products to ${catType.label}`}
                            </h2>
                            <p className="text-xs text-gray-500">
                                {isBrand
                                    ? "Select a brand, search products, and link them to this brand in 1 click."
                                    : "Select a category, search items, and link them with 1 click."}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                        <Icon icon="solar:close-circle-bold" width={20} />
                    </button>
                </div>

                {/* ── Modal Body ── */}
                <div className="p-3 md:p-5 overflow-y-auto space-y-4 flex-1">
                    
                    {/* Destination and Source Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Target Box (Destination) */}
                        <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                    <Icon icon={isBrand ? "solar:tag-bold" : "solar:folder-with-files-bold"} width={15} className="text-indigo-600" />
                                    1. Target {isBrand ? "Brand" : "Category"} (Assign To)
                                </label>
                                <span className="text-[10px] text-indigo-600 font-medium">
                                    Destination
                                </span>
                            </div>
                            <select
                                value={targetId}
                                onChange={(e) => {
                                    setTargetId(e.target.value);
                                    setSelectedIds([]);
                                    setPage(1);
                                }}
                                className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 cursor-pointer"
                            >
                                <option value="" disabled>-- Select a Target {isBrand ? "Brand" : "Category"} --</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.depth && c.depth > 0 ? `${"— ".repeat(c.depth)}${c.title}` : c.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Source Box (Filter to search from) */}
                        <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60 flex flex-col justify-between space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                    <Icon icon="solar:filter-linear" width={15} className="text-amber-700" />
                                    2. Search From ({isBrand ? "Brand Status" : "Category"})
                                </label>
                                <span className="text-[10px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
                                    {isBrand
                                        ? (unbrandedCount !== null ? `${unbrandedCount} Unbranded` : "Unbranded by default")
                                        : (uncategorizedCount !== null ? `${uncategorizedCount} Uncategorized` : "Uncategorized by default")}
                                </span>
                            </div>
                            <select
                                value={sourceFilter}
                                onChange={(e) => {
                                    setSourceFilter(e.target.value);
                                    setSelectedIds([]);
                                    setPage(1);
                                }}
                                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30 cursor-pointer"
                            >
                                {isBrand ? (
                                    <>
                                        <option value="unbranded">
                                            🏷️ Unbranded Products ({unbrandedCount !== null ? unbrandedCount : 0})
                                        </option>
                                        <optgroup label="Or select products currently assigned to:">
                                            {categories
                                                .filter((c) => c._id !== targetId)
                                                .map((c) => (
                                                    <option key={c._id} value={c._id}>
                                                        🏷️ {c.title}
                                                    </option>
                                                ))}
                                        </optgroup>
                                        <option value="all">🌐 All Products</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="uncategorized">
                                            📂 Uncategorized Products ({uncategorizedCount !== null ? uncategorizedCount : 0})
                                        </option>
                                        <optgroup label="Or select products from specific category:">
                                            {categories
                                                .filter((c) => c._id !== targetId)
                                                .map((c) => (
                                                    <option key={c._id} value={c._id}>
                                                        📁 {c.title}
                                                    </option>
                                                ))}
                                        </optgroup>
                                        <option value="all">🌐 All Products from other categories</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Search & Actions Toolbar */}
                    <div className="space-y-2.5">
                        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="relative flex-1">
                                <Icon
                                    icon="solar:magnifer-linear"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    width={16}
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={isBrand ? "Search product title or slug to link to brand..." : "Search product title or slug..."}
                                    className="w-full text-xs border border-gray-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMatchCase((prev) => !prev);
                                        setPage(1);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                        matchCase
                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    Aa Match Case
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExactMatch((prev) => !prev);
                                        setPage(1);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                        exactMatch
                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    &quot;Exact&quot; Match
                                </button>
                                <button
                                    type="submit"
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-2xs cursor-pointer"
                                >
                                    Search
                                </button>
                            </div>
                        </form>

                        {/* Selection Bar */}
                        <div className="flex items-center justify-between text-xs pt-1">
                            <div className="flex items-center gap-3">
                                {products.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                                    >
                                        {areAllVisibleSelected ? "Deselect All Visible" : "Select All Visible"}
                                    </button>
                                )}
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500 font-medium">
                                    Found <strong>{totalMatching}</strong> matching products
                                </span>
                            </div>

                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {selectedIds.length} selected
                            </span>
                        </div>
                    </div>

                    {/* Feedback Messages */}
                    {errorMsg && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                            <Icon icon="solar:danger-triangle-bold" width={16} />
                            {errorMsg}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                            <Icon icon="solar:check-circle-bold" width={16} />
                            {successMsg}
                        </div>
                    )}

                    {/* Products List Table */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                        {loading ? (
                            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                <Icon icon="svg-spinners:ring-resize" width={28} className="text-indigo-600" />
                                <span className="text-xs">Searching products...</span>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Icon icon="solar:box-minimalistic-linear" width={36} className="mx-auto mb-2 opacity-40" />
                                <p className="text-xs font-medium text-gray-600">No products found matching the criteria.</p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Try switching the source category or clearing search filters.
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                                {products.map((p) => {
                                    const isSelected = selectedIds.includes(p._id);
                                    return (
                                        <div
                                            key={p._id}
                                            onClick={() => toggleSelect(p._id)}
                                            className={`p-3 flex items-center justify-between gap-3 hover:bg-indigo-50/40 transition-colors cursor-pointer ${
                                                isSelected ? "bg-indigo-50/60" : ""
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // Handled by row click
                                                    className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                                                    {p.image ? (
                                                        <Image
                                                            src={p.image}
                                                            alt={p.title}
                                                            width={40}
                                                            height={40}
                                                            className="object-contain w-full h-full p-0.5"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <Icon icon="solar:devices-bold" width={20} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 truncate">
                                                        {p.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            /{p.slug}
                                                        </span>
                                                        {p.categoryTitle && (
                                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                                                Category: {p.categoryTitle}
                                                            </span>
                                                        )}
                                                        {isBrand && (
                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                                                p.brandTitle
                                                                    ? "bg-violet-50 text-violet-700 border border-violet-100"
                                                                    : "bg-amber-50 text-amber-700 border border-amber-100"
                                                            }`}>
                                                                Brand: {p.brandTitle || "Unbranded"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-2">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                    p.status === "published"
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-gray-400 text-[11px]">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
                                >
                                    Prev
                                </button>
                                {getPageNumbers().map((pNum, idx) => (
                                    pNum === "..." ? (
                                        <span key={`dot-${idx}`} className="px-1.5 text-gray-400">...</span>
                                    ) : (
                                        <button
                                            key={`pg-${pNum}`}
                                            type="button"
                                            onClick={() => setPage(Number(pNum))}
                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                                                pNum === page
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            {pNum}
                                        </button>
                                    )
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Modal Footer ── */}
                <div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-t border-gray-100 bg-gray-50/70">
                    <span className="text-xs text-gray-500">
                        {selectedIds.length > 0 ? (
                            <>Ready to link <strong>{selectedIds.length}</strong> product(s).</>
                        ) : (
                            "Select products above to link."
                        )}
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={selectedIds.length === 0 || submitting || !targetId}
                            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <Icon icon="svg-spinners:ring-resize" width={14} />
                                    Linking...
                                </>
                            ) : (
                                <>
                                    <Icon icon="solar:link-circle-bold" width={15} />
                                    {isBrand ? "Link Products to Brand" : `Link Products to ${catType.label}`} ({selectedIds.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
