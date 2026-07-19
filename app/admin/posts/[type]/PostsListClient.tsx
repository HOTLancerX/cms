"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface User {
    _id: string;
    name: string;
    email: string;
}

interface Category {
    _id: string;
    title: string;
    type: string;
}

interface Post {
    _id: string;
    title: string;
    slug: string;
    type: string;
    category: string | null;
    status: "published" | "draft" | "trash";
    userId: string;
    createdAt: string;
}

interface PostInfo {
    _id: string;
    postId: string;
    name: string;
    value: string;
}

interface PostsListClientProps {
    initialPosts: Post[];
    initialInfos: PostInfo[];
    type: string;
    postType: { key: string; label: string; icon?: string };
    viewBase: string;
    categories: Category[];
    users: User[];
    expressApi: string;
    xHeaders: Record<string, string>;
}

const STATUS_BADGES: Record<string, { label: string; cls: string; icon: string }> = {
    published: {
        label: "Published",
        cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-emerald-100/50",
        icon: "solar:check-circle-bold"
    },
    draft: {
        label: "Draft",
        cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 hover:bg-amber-100/50",
        icon: "solar:document-bold"
    },
    trash: {
        label: "Trash",
        cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 hover:bg-rose-100/50",
        icon: "solar:trash-can-minimalistic-bold"
    },
};

export default function PostsListClient({
    initialPosts,
    initialInfos,
    type,
    postType,
    viewBase,
    categories,
    users,
    expressApi,
    xHeaders,
}: PostsListClientProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [infos, setInfos] = useState<PostInfo[]>(initialInfos);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sellerFilter, setSellerFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");

    // Operations states
    const [cloningId, setCloningId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Automatically dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Re-fetch helper to keep UI state in sync
    const refreshData = async () => {
        try {
            const res = await fetch(`/api/admin-posts?type=${encodeURIComponent(type)}`, {
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts || []);
                setInfos(data.infos || []);
            }
        } catch (err) {
            console.error("Error refreshing data:", err);
        }
    };

    // Helper: Map user ID to User
    const userMap = useMemo(() => {
        const map = new Map<string, User>();
        users.forEach((u) => map.set(u._id, u));
        return map;
    }, [users]);

    // Helper: Map category ID to Category
    const categoryMap = useMemo(() => {
        const map = new Map<string, Category>();
        categories.forEach((c) => map.set(c._id, c));
        return map;
    }, [categories]);

    // Helper: Parse Pricing information from _variate info field
    const getPriceInfo = (postId: string) => {
        const itemInfos = infos.filter((i) => i.postId?.toString().toLowerCase() === postId.toLowerCase());
        const variateInfo = itemInfos.find((i) => i.name === "_variate");
        if (!variateInfo || !variateInfo.value) return null;
        try {
            const state = JSON.parse(variateInfo.value);
            if (state.priceType === "single") {
                if (!state.regularprice && !state.sellingprice) return null;
                return {
                    regular: state.regularprice,
                    selling: state.sellingprice,
                    type: "single",
                };
            } else if (state.priceType === "variant" && Array.isArray(state.variants)) {
                const prices = state.variants
                    .map((v: any) => parseFloat(v.price))
                    .filter((p: number) => !isNaN(p));
                if (prices.length === 0) return null;
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                return {
                    min,
                    max,
                    type: "variant",
                };
            }
        } catch {
            return null;
        }
        return null;
    };

    // Helper: Parse Featured Image from images/image info fields with variant fallback
    const getFeaturedImage = (postId: string) => {
        const itemInfos = infos.filter((i) => i.postId?.toString().toLowerCase() === postId.toLowerCase());
        
        // 1. Try standard images or image field
        const imagesInfo = itemInfos.find((i) => i.name === "images" || i.name === "image");
        if (imagesInfo && imagesInfo.value) {
            const val = imagesInfo.value.trim();
            if (val) {
                try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
                        return parsed[0];
                    }
                    if (typeof parsed === "string" && parsed) {
                        return parsed;
                    }
                } catch {
                    // Fallback to raw string value
                    return val;
                }
            }
        }

        // 2. Try variant image fallback
        const variateInfo = itemInfos.find((i) => i.name === "_variate");
        if (variateInfo && variateInfo.value) {
            try {
                const state = JSON.parse(variateInfo.value);
                if (state.priceType === "variant" && Array.isArray(state.variants)) {
                    for (const v of state.variants) {
                        if (v.image) return v.image;
                    }
                }
            } catch {}
        }

        return null;
    };

    // Clone/Duplicate Post logic
    const handleClone = async (post: Post) => {
        setCloningId(post._id);
        try {
            // 1. Gather all info records for the post
            const itemInfos = infos.filter((i) => i.postId === post._id);
            const infoRecord: Record<string, string> = {};
            itemInfos.forEach((i) => {
                infoRecord[i.name] = i.value;
            });

            // 2. Generate unique slug by checking availability
            let originalSlug = post.slug;
            let slug = `${originalSlug}-copy`;
            let checkCount = 0;
            let isAvailable = false;

            while (!isAvailable && checkCount < 10) {
                const checkRes = await fetch(`${expressApi}/post?slug=${encodeURIComponent(slug)}`, {
                    headers: xHeaders,
                });
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData.available) {
                        isAvailable = true;
                    } else {
                        checkCount++;
                        slug = `${originalSlug}-copy-${checkCount}`;
                    }
                } else {
                    break;
                }
            }

            // 3. Send POST request to duplicate post
            const payload = {
                title: `${post.title} (Copy)`,
                slug,
                status: "draft",
                type: post.type,
                category: post.category,
                userId: post.userId,
                info: infoRecord,
            };

            const createRes = await fetch(`${expressApi}/post`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...xHeaders,
                },
                body: JSON.stringify(payload),
            });

            if (createRes.ok) {
                setNotification({ message: `"${post.title}" cloned successfully!`, type: "success" });
                await refreshData();
            } else {
                const data = await createRes.json();
                setNotification({ message: `Cloning failed: ${data.error || "Unknown error"}`, type: "error" });
            }
        } catch (err) {
            console.error("Cloning error:", err);
            setNotification({ message: "Network error occurred while cloning", type: "error" });
        } finally {
            setCloningId(null);
        }
    };

    // Delete post logic
    const handleDelete = async (postId: string) => {
        setDeletingId(postId);
        try {
            const res = await fetch(`${expressApi}/post?id=${postId}`, {
                method: "DELETE",
                headers: xHeaders,
            });
            if (res.ok) {
                setNotification({ message: `Post deleted successfully.`, type: "success" });
                setDeleteConfirmPost(null);
                await refreshData();
            } else {
                setNotification({ message: "Failed to delete post.", type: "error" });
            }
        } catch (err) {
            console.error("Delete error:", err);
            setNotification({ message: "Network error occurred while deleting.", type: "error" });
        } finally {
            setDeletingId(null);
        }
    };

    // Filter and Sort Logic
    const filteredPosts = useMemo(() => {
        return posts
            .filter((p) => {
                const searchLower = search.toLowerCase();
                const matchesSearch =
                    p.title.toLowerCase().includes(searchLower) ||
                    p.slug.toLowerCase().includes(searchLower);

                const matchesStatus = statusFilter === "all" || p.status === statusFilter;
                const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
                const matchesSeller = sellerFilter === "all" || p.userId === sellerFilter;

                return matchesSearch && matchesStatus && matchesCategory && matchesSeller;
            })
            .sort((a, b) => {
                if (sortBy === "newest") {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                } else if (sortBy === "oldest") {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                } else if (sortBy === "title") {
                    return a.title.localeCompare(b.title);
                }
                return 0;
            });
    }, [posts, search, statusFilter, categoryFilter, sellerFilter, sortBy]);

    // Collect all unique category IDs used in current post list for dynamic selection
    const availableCategories = useMemo(() => {
        const ids = new Set(posts.map((p) => p.category).filter(Boolean));
        return categories.filter((c) => ids.has(c._id));
    }, [posts, categories]);

    // Collect all unique users used in current posts list
    const availableSellers = useMemo(() => {
        const ids = new Set(posts.map((p) => p.userId).filter(Boolean));
        return users.filter((u) => ids.has(u._id));
    }, [posts, users]);

    // Reset filters helper
    const handleResetFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setCategoryFilter("all");
        setSellerFilter("all");
        setSortBy("newest");
    };

    return (
        <div className="space-y-6">
            {/* Notification Toast */}
            {notification && (
                <div
                    className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border shadow-lg transition-all duration-300 animate-slide-in ${
                        notification.type === "success"
                            ? "bg-emerald-500 text-white border-emerald-600"
                            : "bg-rose-500 text-white border-rose-600"
                    }`}
                >
                    <Icon
                        icon={notification.type === "success" ? "solar:check-circle-bold" : "solar:danger-bold"}
                        width={18}
                    />
                    <span>{notification.message}</span>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden p-6 relative">
                        <div className="flex items-center gap-3.5 mb-4">
                            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500 shrink-0">
                                <Icon icon="solar:trash-can-minimalistic-bold" width={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Confirm Deletion</h3>
                                <p className="text-xs text-gray-400">Permanently delete post</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            Are you sure you want to delete <strong className="text-gray-800">"{deleteConfirmPost.title}"</strong>? This action cannot be undone and will delete all custom information associated with it.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmPost(null)}
                                className="px-4.5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmPost._id)}
                                disabled={deletingId === deleteConfirmPost._id}
                                className="px-4.5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5"
                            >
                                {deletingId === deleteConfirmPost._id ? (
                                    <Icon icon="line-md:loading-twotone-loop" width={14} />
                                ) : (
                                    <Icon icon="solar:trash-can-minimalistic-bold" width={14} />
                                )}
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-indigo-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_40%)] pointer-events-none" />
                <div className="z-10">
                    <div className="flex items-center gap-3">
                        {postType.icon && (
                            <div className="p-2.5 bg-white/10 rounded-xl">
                                <Icon icon={postType.icon} width={24} className="text-indigo-200" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{postType.label} Management</h1>
                            <p className="text-indigo-200/70 text-xs mt-0.5 font-medium">
                                {posts.length} total entries • {filteredPosts.length} matches
                            </p>
                        </div>
                    </div>
                </div>
                <div className="z-10 flex items-center gap-3">
                    {/* Reset filter button (if any filter is set) */}
                    {(search || statusFilter !== "all" || categoryFilter !== "all" || sellerFilter !== "all") && (
                        <button
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold backdrop-blur-xs transition"
                            title="Reset all search queries and active filters"
                        >
                            <Icon icon="solar:restart-bold" width={14} />
                            Reset Filters
                        </button>
                    )}
                    <Link
                        href={`/admin/posts/${type}/new`}
                        className="inline-flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-900 px-4.5 py-2.5 rounded-xl font-bold transition text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Icon icon="solar:add-circle-bold" width={16} />
                        Add New {postType.label}
                    </Link>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    {/* Search Field */}
                    <div className="md:col-span-4 relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Icon icon="solar:magnifer-bold" width={18} />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={`Search ${postType.label.toLowerCase()} by title, slug...`}
                            className="w-full bg-gray-50 border border-gray-200 pl-9.5 pr-8 py-2 rounded-xl text-sm placeholder-gray-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 transition"
                            >
                                <Icon icon="solar:close-circle-bold" width={16} />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="md:col-span-2 relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none w-full bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition text-gray-700 font-medium"
                        >
                            <option value="all">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="trash">Trash</option>
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                            <Icon icon="solar:alt-arrow-down-bold" width={14} />
                        </span>
                    </div>

                    {/* Category Filter */}
                    <div className="md:col-span-2.5 relative">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="appearance-none w-full bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition text-gray-700 font-medium"
                        >
                            <option value="all">All Categories</option>
                            {availableCategories.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                            <Icon icon="solar:alt-arrow-down-bold" width={14} />
                        </span>
                    </div>

                    {/* Seller Filter */}
                    <div className="md:col-span-2.5 relative">
                        <select
                            value={sellerFilter}
                            onChange={(e) => setSellerFilter(e.target.value)}
                            className="appearance-none w-full bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition text-gray-700 font-medium"
                        >
                            <option value="all">All Sellers</option>
                            {availableSellers.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                            <Icon icon="solar:alt-arrow-down-bold" width={14} />
                        </span>
                    </div>

                    {/* Sort Selector */}
                    <div className="md:col-span-1 relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition text-gray-700 font-medium"
                            title="Sort Results"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="title">Title (A-Z)</option>
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400">
                            <Icon icon="solar:alt-arrow-down-bold" width={12} />
                        </span>
                    </div>
                </div>

                {/* Filter chips overview */}
                {(statusFilter !== "all" || categoryFilter !== "all" || sellerFilter !== "all" || search) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs font-semibold">
                        <span className="text-gray-400">Active Filters:</span>
                        {search && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                                Search: &quot;{search}&quot;
                                <button onClick={() => setSearch("")} className="hover:text-indigo-900">
                                    <Icon icon="solar:close-circle-bold" width={14} />
                                </button>
                            </span>
                        )}
                        {statusFilter !== "all" && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                                Status: {statusFilter}
                                <button onClick={() => setStatusFilter("all")} className="hover:text-indigo-900">
                                    <Icon icon="solar:close-circle-bold" width={14} />
                                </button>
                            </span>
                        )}
                        {categoryFilter !== "all" && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                                Category: {categoryMap.get(categoryFilter)?.title || categoryFilter}
                                <button onClick={() => setCategoryFilter("all")} className="hover:text-indigo-900">
                                    <Icon icon="solar:close-circle-bold" width={14} />
                                </button>
                            </span>
                        )}
                        {sellerFilter !== "all" && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                                Seller: {userMap.get(sellerFilter)?.name || sellerFilter}
                                <button onClick={() => setSellerFilter("all")} className="hover:text-indigo-900">
                                    <Icon icon="solar:close-circle-bold" width={14} />
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Posts Grid/Table */}
            {filteredPosts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-xs text-gray-400">
                    <Icon
                        icon={postType.icon ?? "solar:document-bold"}
                        width={54}
                        className="mx-auto mb-3 opacity-30 text-indigo-400"
                    />
                    <p className="font-semibold text-gray-700 text-sm">No {postType.label.toLowerCase()} items found.</p>
                    <p className="text-xs text-gray-400 mt-1">Try tweaking your search keywords or filter settings.</p>
                    <button
                        onClick={handleResetFilters}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100/70 px-3.5 py-2 rounded-xl transition"
                    >
                        <Icon icon="solar:restart-bold" width={14} />
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/75 border-b border-gray-100 text-xs text-gray-500 uppercase font-bold tracking-wider">
                                    <th className="px-5 py-4 w-[80px]">Item</th>
                                    <th className="px-5 py-4">Title & Slug</th>
                                    <th className="px-5 py-4">Category</th>
                                    <th className="px-5 py-4">Seller</th>
                                    <th className="px-5 py-4 text-right">Price</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Created</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPosts.map((post) => {
                                    const badge = STATUS_BADGES[post.status] ?? STATUS_BADGES.draft;
                                    const seller = userMap.get(post.userId);
                                    const category = categoryMap.get(post.category || "");
                                    const featuredImage = getFeaturedImage(post._id);
                                    const priceInfo = getPriceInfo(post._id);

                                    return (
                                        <tr key={post._id} className="hover:bg-gray-50/70 transition-colors">
                                            {/* Featured Image */}
                                            <td className="px-5 py-3.5">
                                                {featuredImage ? (
                                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-100 shadow-xs shrink-0 group">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={featuredImage}
                                                            alt={post.title}
                                                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                                                        <Icon icon="solar:camera-minimalistic-linear" width={20} />
                                                    </div>
                                                )}
                                            </td>

                                            {/* Title & Slug */}
                                            <td className="px-5 py-3.5">
                                                <div className="max-w-[280px]">
                                                    <p className="font-bold text-gray-800 line-clamp-1 truncate" title={post.title}>
                                                        {post.title}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-mono line-clamp-1 mt-0.5">
                                                        {post.slug}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-5 py-3.5 text-gray-600 font-medium">
                                                {category ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Icon icon="solar:folder-with-files-bold" width={14} className="text-gray-400" />
                                                        {category.title}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 italic text-xs">Uncategorized</span>
                                                )}
                                            </td>

                                            {/* Seller / Author */}
                                            <td className="px-5 py-3.5">
                                                {seller ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                                                            {seller.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="text-xs">
                                                            <p className="font-semibold text-gray-700 line-clamp-1">{seller.name}</p>
                                                            <p className="text-[9px] text-gray-400 line-clamp-1">{seller.email}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 italic text-xs">No Seller</span>
                                                )}
                                            </td>

                                            {/* Pricing */}
                                            <td className="px-5 py-3.5 text-right font-semibold">
                                                {priceInfo ? (
                                                    <div>
                                                        {priceInfo.type === "single" ? (
                                                            <div className="text-xs">
                                                                {priceInfo.selling ? (
                                                                    <>
                                                                        <span className="text-indigo-600 font-bold">${priceInfo.selling}</span>
                                                                        {priceInfo.regular && (
                                                                            <span className="text-[10px] text-gray-400 line-through ml-1.5">${priceInfo.regular}</span>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-gray-800">${priceInfo.regular}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-indigo-600 font-bold">
                                                                ${priceInfo.min} - ${priceInfo.max}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 italic text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${badge.cls}`}>
                                                    <Icon icon={badge.icon} width={13} />
                                                    {badge.label}
                                                </span>
                                            </td>

                                            {/* Date Created */}
                                            <td className="px-5 py-3.5 text-gray-400 text-xs font-medium">
                                                {new Date(post.createdAt).toLocaleDateString(undefined, {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric"
                                                })}
                                            </td>

                                            {/* Action Buttons with Icon + Text */}
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    {/* View */}
                                                    <Link
                                                        href={`${viewBase}${post.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                                            post.status === "published"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                                                : "pointer-events-none opacity-40 bg-gray-50 text-gray-400 border-gray-100"
                                                        }`}
                                                    >
                                                        <Icon icon="solar:eye-bold" width={13} />
                                                        View
                                                    </Link>

                                                    {/* Edit */}
                                                    <Link
                                                        href={`/admin/posts/${type}/${post._id}`}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition"
                                                    >
                                                        <Icon icon="solar:pen-bold" width={13} />
                                                        Edit
                                                    </Link>

                                                    {/* Duplicate / Clone */}
                                                    <button
                                                        onClick={() => handleClone(post)}
                                                        disabled={cloningId === post._id}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                                                    >
                                                        {cloningId === post._id ? (
                                                            <Icon icon="line-md:loading-twotone-loop" width={13} className="text-violet-700" />
                                                        ) : (
                                                            <Icon icon="solar:copy-bold" width={13} />
                                                        )}
                                                        Clone
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => setDeleteConfirmPost(post)}
                                                        disabled={deletingId === post._id}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                                                    >
                                                        <Icon icon="solar:trash-can-minimalistic-bold" width={13} />
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
                </div>
            )}
        </div>
    );
}
