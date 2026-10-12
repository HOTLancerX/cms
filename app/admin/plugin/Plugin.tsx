"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";

export type PluginStatus = "active" | "inactive" | "new" | "install" | "update" | "delete";

export interface DomainData {
    projectName?: string;
    domainName?: string;
    domainURL?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
}

export interface PluginRecord {
    _id: string | null;
    nx: string;
    name: string;
    version: string;
    description: string;
    author: string;
    icon: string;
    color: string;
    youtubeId?: string;
    price?: number;
    startDate?: string | null;
    endDate?: string | null;
    isExpired?: boolean;
    isNotStarted?: boolean;
    status: PluginStatus;
}

function DeployButton() {
    const [deploying, setDeploying] = useState(false);
    const [done, setDone] = useState(false);

    const handleDeploy = async () => {
        setDeploying(true);
        setDone(false);
        try {
            await fetch(process.env.NEXT_PUBLIC_VERCEL!, { method: "POST" });
            setDone(true);
            setTimeout(() => setDone(false), 3000);
        } catch {
        } finally {
            setDeploying(false);
        }
    };

    return (
        <button
            onClick={handleDeploy}
            disabled={deploying}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
        >
            {deploying ? (
                <Icon icon="svg-spinners:ring-resize" width={16} />
            ) : done ? (
                <Icon icon="solar:check-circle-bold" width={16} />
            ) : (
                <Icon icon="solar:cloud-upload-bold" width={16} />
            )}
            {deploying ? "Deploying…" : done ? "Deployed!" : "Deploy"}
        </button>
    );
}

function extractYoutubeId(urlOrId?: string): string {
    if (!urlOrId) return "";
    const str = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : str;
}

function getDaysRemaining(endDateStr?: string | null): {
    days: number;
    hours: number;
    text: string;
    status: "ok" | "warning" | "expired" | "none";
} {
    if (!endDateStr) {
        return { days: 0, hours: 0, text: "Unlimited", status: "none" };
    }
    const now = Date.now();
    const end = new Date(endDateStr).getTime();
    const diff = end - now;

    if (diff <= 0) {
        return { days: 0, hours: 0, text: "Expired", status: "expired" };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let text = "";
    if (days > 0) {
        text = `${days}d left`;
    } else if (hours > 0) {
        text = `${hours}h left`;
    } else {
        text = "<1h left";
    }

    const status = days < 7 ? "warning" : "ok";
    return { days, hours, text, status };
}

// Maps Tailwind gradient class pairs → actual CSS gradient.
const COLOR_MAP: Record<string, string> = {
    "from-sky-500 to-blue-600": "linear-gradient(135deg, #0ea5e9, #2563eb)",
    "from-violet-500 to-purple-600": "linear-gradient(135deg, #8b5cf6, #9333ea)",
    "from-indigo-500 to-violet-600": "linear-gradient(135deg, #6366f1, #7c3aed)",
    "from-emerald-500 to-teal-600": "linear-gradient(135deg, #10b981, #0d9488)",
    "from-orange-500 to-red-600": "linear-gradient(135deg, #f97316, #dc2626)",
    "from-pink-500 to-rose-600": "linear-gradient(135deg, #ec4899, #e11d48)",
    "from-amber-500 to-orange-600": "linear-gradient(135deg, #f59e0b, #ea580c)",
    "from-cyan-500 to-sky-600": "linear-gradient(135deg, #06b6d4, #0284c7)",
    "from-lime-500 to-green-600": "linear-gradient(135deg, #84cc16, #16a34a)",
    "from-fuchsia-500 to-pink-600": "linear-gradient(135deg, #d946ef, #db2777)",
    "from-violet-600 to-indigo-600": "linear-gradient(135deg, #7c3aed, #4f46e5)",
    "from-indigo-500 to-purple-600": "linear-gradient(135deg, #6366f1, #9333ea)",
};

function resolveGradient(color: string): string {
    return COLOR_MAP[color] ?? "linear-gradient(135deg, #6366f1, #7c3aed)";
}

const STATUS_CONFIG: Record<PluginStatus, { label: string; dot: string; bg: string; text: string; border: string }> = {
    active: {
        label: "Active",
        dot: "bg-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
    },
    inactive: {
        label: "Inactive",
        dot: "bg-gray-400",
        bg: "bg-gray-50",
        text: "text-gray-600",
        border: "border-gray-200",
    },
    new: {
        label: "Discovered",
        dot: "bg-violet-500",
        bg: "bg-violet-50",
        text: "text-violet-700",
        border: "border-violet-200",
    },
    install: {
        label: "Installing",
        dot: "bg-blue-500",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
    },
    update: {
        label: "Update",
        dot: "bg-orange-500",
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
    },
    delete: {
        label: "Pending Delete",
        dot: "bg-red-500",
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
    },
};

export default function PluginList({
    initialPlugins,
    domain,
}: {
    initialPlugins: PluginRecord[];
    domain?: DomainData | null;
}) {
    const [plugins, setPlugins] = useState<PluginRecord[]>(initialPlugins);
    const [processing, setProcessing] = useState<string | null>(null);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "new">("all");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [selectedNxs, setSelectedNxs] = useState<Set<string>>(new Set());
    const [activeVideo, setActiveVideo] = useState<{ id: string; name: string } | null>(null);

    // Filter plugins based on status filter and search term
    const filtered = useMemo(() => {
        return plugins.filter((p) => {
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
                p.name.toLowerCase().includes(q) ||
                p.nx.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.author.toLowerCase().includes(q)
            );
        });
    }, [plugins, statusFilter, search]);

    const activeCount = useMemo(() => plugins.filter((p) => p.status === "active").length, [plugins]);
    const inactiveCount = useMemo(() => plugins.filter((p) => p.status === "inactive").length, [plugins]);
    const newCount = useMemo(() => plugins.filter((p) => p.status === "new").length, [plugins]);

    const updateLocal = (nx: string, patch: Partial<PluginRecord>) =>
        setPlugins((prev) => prev.map((p) => (p.nx === nx ? { ...p, ...patch } : p)));

    const apiPut = async (id: string, status: PluginStatus) => {
        const res = await xFetch("/plugin/installed", {
            method: "PUT",
            body: JSON.stringify({ id, status }),
        });
        return res.ok;
    };

    // Toggle active <-> inactive
    const handleToggle = async (plugin: PluginRecord) => {
        if (!plugin._id) return;
        const next: PluginStatus = plugin.status === "active" ? "inactive" : "active";
        setProcessing(plugin.nx);
        const ok = await apiPut(plugin._id, next);
        if (ok) updateLocal(plugin.nx, { status: next });
        setProcessing(null);
    };

    // Activate newly discovered plugin (creates DB record & activates)
    const handleActivateNew = async (plugin: PluginRecord) => {
        setProcessing(plugin.nx);
        try {
            const res = await xFetch("/plugin/installed", {
                method: "POST",
                body: JSON.stringify({
                    nx: plugin.nx,
                    name: plugin.name,
                    version: plugin.version,
                    icon: plugin.icon,
                    color: plugin.color,
                    status: "active",
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const newId = data?._id ?? data?.plugin?._id ?? null;
                updateLocal(plugin.nx, { status: "active", _id: newId });
            }
        } finally {
            setProcessing(null);
        }
    };

    // Delete/uninstall from DB (resets card to "new")
    const handleDelete = async (plugin: PluginRecord) => {
        if (!plugin._id) return;
        setProcessing(plugin.nx);
        const res = await xFetch(`/plugin/installed?id=${plugin._id}`, { method: "DELETE" });
        if (res.ok) {
            updateLocal(plugin.nx, { _id: null, status: "new" });
            setSelectedNxs((prev) => {
                const next = new Set(prev);
                next.delete(plugin.nx);
                return next;
            });
        }
        setProcessing(null);
    };

    // Selection helpers
    const isSelected = (nx: string) => selectedNxs.has(nx);

    const toggleSelect = (nx: string) => {
        setSelectedNxs((prev) => {
            const next = new Set(prev);
            if (next.has(nx)) next.delete(nx);
            else next.add(nx);
            return next;
        });
    };

    const isAllFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedNxs.has(p.nx));
    const isSomeFilteredSelected = filtered.some((p) => selectedNxs.has(p.nx)) && !isAllFilteredSelected;

    const toggleSelectAll = () => {
        if (isAllFilteredSelected) {
            setSelectedNxs((prev) => {
                const next = new Set(prev);
                filtered.forEach((p) => next.delete(p.nx));
                return next;
            });
        } else {
            setSelectedNxs((prev) => {
                const next = new Set(prev);
                filtered.forEach((p) => next.add(p.nx));
                return next;
            });
        }
    };

    const selectOnlyFiltered = () => {
        setSelectedNxs(new Set(filtered.map((p) => p.nx)));
    };

    const selectOnlyActive = () => {
        setSelectedNxs(new Set(plugins.filter((p) => p.status === "active").map((p) => p.nx)));
    };

    const selectOnlyInactive = () => {
        setSelectedNxs(new Set(plugins.filter((p) => p.status === "inactive" || p.status === "new").map((p) => p.nx)));
    };

    const clearSelection = () => setSelectedNxs(new Set());

    // Batch activate
    const handleBatchActivate = async () => {
        const targets = plugins.filter((p) => selectedNxs.has(p.nx) && p.status !== "active");
        if (targets.length === 0) return;
        setBatchProcessing(true);
        try {
            for (const plugin of targets) {
                if (plugin.status === "new" || !plugin._id) {
                    const res = await xFetch("/plugin/installed", {
                        method: "POST",
                        body: JSON.stringify({
                            nx: plugin.nx,
                            name: plugin.name,
                            version: plugin.version,
                            icon: plugin.icon,
                            color: plugin.color,
                            status: "active",
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const newId = data?._id ?? data?.plugin?._id ?? null;
                        updateLocal(plugin.nx, { status: "active", _id: newId });
                    }
                } else {
                    const ok = await apiPut(plugin._id, "active");
                    if (ok) updateLocal(plugin.nx, { status: "active" });
                }
            }
        } finally {
            setBatchProcessing(false);
        }
    };

    // Batch deactivate
    const handleBatchDeactivate = async () => {
        const targets = plugins.filter((p) => selectedNxs.has(p.nx) && p.status === "active" && p._id);
        if (targets.length === 0) return;
        setBatchProcessing(true);
        try {
            for (const plugin of targets) {
                const ok = await apiPut(plugin._id!, "inactive");
                if (ok) updateLocal(plugin.nx, { status: "inactive" });
            }
        } finally {
            setBatchProcessing(false);
        }
    };

    // Batch delete
    const handleBatchDelete = async () => {
        const targets = plugins.filter((p) => selectedNxs.has(p.nx) && p._id);
        if (targets.length === 0) return;
        setBatchProcessing(true);
        try {
            for (const plugin of targets) {
                const res = await xFetch(`/plugin/installed?id=${plugin._id}`, { method: "DELETE" });
                if (res.ok) updateLocal(plugin.nx, { _id: null, status: "new" });
            }
            clearSelection();
        } finally {
            setBatchProcessing(false);
        }
    };

    // Selected statistics
    const selectedCount = selectedNxs.size;
    const selectedActiveCount = plugins.filter((p) => selectedNxs.has(p.nx) && p.status === "active").length;
    const selectedInactiveOrNewCount = plugins.filter((p) => selectedNxs.has(p.nx) && p.status !== "active").length;
    const selectedInDbCount = plugins.filter((p) => selectedNxs.has(p.nx) && !!p._id).length;

    // License Badge Helper
    const renderLicensePill = (plugin: PluginRecord) => {
        const targetDate = plugin.endDate || domain?.endDate;
        const rem = getDaysRemaining(targetDate);

        if (rem.status === "none") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100/90 text-gray-600 text-xs font-semibold border border-gray-200/80">
                    <Icon icon="solar:shield-check-bold" width={13} className="text-gray-400" />
                    <span>Unlimited</span>
                </span>
            );
        }
        if (rem.status === "expired") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Expired</span>
                </span>
            );
        }
        if (rem.status === "warning") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                    <Icon icon="solar:clock-circle-bold" width={13} className="text-amber-500" />
                    <span>{rem.text}</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <Icon icon="solar:shield-keyhole-bold" width={13} className="text-emerald-500" />
                <span>{rem.text}</span>
            </span>
        );
    };

    return (
        <div className="space-y-5 pb-20">
            {/* ── Page Header & Deploy/Store Actions ─────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Plugins & Extensions
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                        Control modular capabilities, manage activation states, and inspect active packages.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <DeployButton />
                    <Link
                        href="/admin/plugin/list"
                        className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl font-semibold hover:opacity-95 active:scale-95 transition-all text-xs md:text-sm shadow-xs"
                        style={{ background: resolveGradient("from-violet-600 to-indigo-600") }}
                    >
                        <Icon icon="solar:shop-bold" width={18} />
                        <span>Plugin Store</span>
                    </Link>
                </div>
            </div>

            {/* ── System License Notice (If present) ─────────────────────────── */}
            {domain?.endDate && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-200/80 text-emerald-900 text-xs md:text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:shield-keyhole-bold" width={18} className="text-emerald-600" />
                        <span>
                            System License Workspace: <strong className="font-bold">{domain.domainName || "Default Domain"}</strong>
                        </span>
                    </div>
                    <span className="font-semibold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        {getDaysRemaining(domain.endDate).text}
                    </span>
                </div>
            )}

            {/* ── Main Toolbar: Search, Status Filters, View Toggle ────────────── */}
            <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <Icon
                        icon="solar:magnifer-linear"
                        width={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Search plugins by name, ID, or author…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-gray-200 bg-gray-50/70 focus:bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-500 transition-all"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <Icon icon="solar:close-circle-bold" width={16} />
                        </button>
                    )}
                </div>

                {/* Status Filter Chips & View Mode Toggle */}
                <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 flex-wrap">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl">
                        {(
                            [
                                { id: "all", label: "All", count: plugins.length },
                                { id: "active", label: "Active", count: activeCount },
                                { id: "inactive", label: "Inactive", count: inactiveCount },
                                { id: "new", label: "New", count: newCount },
                            ] as const
                        ).map((tab) => {
                            const isCurrent = statusFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                        isCurrent
                                            ? "bg-white text-gray-900 shadow-xs"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            isCurrent ? "bg-gray-100 text-gray-700" : "bg-gray-200/70 text-gray-500"
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* View Switcher: List vs Grid */}
                    <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "list"
                                    ? "bg-white text-violet-700 shadow-xs"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                            }`}
                            title="List View (Default)"
                        >
                            <Icon icon="solar:list-bold" width={16} />
                            <span>List</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "grid"
                                    ? "bg-white text-violet-700 shadow-xs"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                            }`}
                            title="Grid View"
                        >
                            <Icon icon="solar:widget-2-bold" width={16} />
                            <span>Grid</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Multi-select Options Bar ───────────────────────────────────── */}
            <div className="bg-white rounded-2xl px-4 py-2.5 border border-gray-200/90 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            ref={(el) => {
                                if (el) el.indeterminate = isSomeFilteredSelected;
                            }}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-gray-300 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-700">
                            {isAllFilteredSelected
                                ? `All ${filtered.length} selected`
                                : selectedCount > 0
                                ? `${selectedCount} of ${filtered.length} selected`
                                : `Select All (${filtered.length})`}
                        </span>
                    </label>

                    {/* Quick Selection Shortcuts */}
                    <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                        <span>•</span>
                        <button
                            type="button"
                            onClick={selectOnlyFiltered}
                            className="text-gray-500 hover:text-violet-600 font-medium hover:underline cursor-pointer"
                        >
                            Select Visible
                        </button>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={selectOnlyActive}
                            className="text-gray-500 hover:text-emerald-600 font-medium hover:underline cursor-pointer"
                        >
                            Select Active
                        </button>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={selectOnlyInactive}
                            className="text-gray-500 hover:text-amber-600 font-medium hover:underline cursor-pointer"
                        >
                            Select Inactive
                        </button>
                    </div>
                </div>

                {/* Batch Actions Trigger Group */}
                {selectedCount > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150 flex-wrap">
                        {/* Batch Activate */}
                        {selectedInactiveOrNewCount > 0 && (
                            <button
                                type="button"
                                onClick={handleBatchActivate}
                                disabled={batchProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                                {batchProcessing ? (
                                    <Icon icon="svg-spinners:ring-resize" width={14} />
                                ) : (
                                    <Icon icon="solar:play-bold" width={14} />
                                )}
                                <span>Activate ({selectedInactiveOrNewCount})</span>
                            </button>
                        )}

                        {/* Batch Deactivate */}
                        {selectedActiveCount > 0 && (
                            <button
                                type="button"
                                onClick={handleBatchDeactivate}
                                disabled={batchProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 active:scale-95 text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                                {batchProcessing ? (
                                    <Icon icon="svg-spinners:ring-resize" width={14} />
                                ) : (
                                    <Icon icon="solar:pause-bold" width={14} />
                                )}
                                <span>Deactivate ({selectedActiveCount})</span>
                            </button>
                        )}

                        {/* Batch Delete */}
                        {selectedInDbCount > 0 && (
                            <button
                                type="button"
                                onClick={handleBatchDelete}
                                disabled={batchProcessing}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                                title="Remove selected from database"
                            >
                                {batchProcessing ? (
                                    <Icon icon="svg-spinners:ring-resize" width={14} />
                                ) : (
                                    <Icon icon="solar:trash-bin-trash-bold" width={14} />
                                )}
                                <span>Remove ({selectedInDbCount})</span>
                            </button>
                        )}

                        {/* Clear Selection */}
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* ── Main View Content ───────────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 px-4 shadow-xs">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <Icon icon="solar:box-minimalistic-bold" width={36} />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">No plugins found</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                        {search
                            ? `No plugins match "${search}". Try searching with a different term.`
                            : "No plugins available under this filter."}
                    </p>
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="mt-4 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition cursor-pointer"
                        >
                            Reset Search
                        </button>
                    )}
                </div>
            ) : viewMode === "list" ? (
                /* ─────────────────────────────────────────────────────────────
                   LIST VIEW: Professional SaaS Data Table
                   Proper HTML table structure ensures rigid, horizontal row alignment
                   ───────────────────────────────────────────────────────────── */
                <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-215">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="py-3 px-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllFilteredSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = isSomeFilteredSelected;
                                            }}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-gray-300 cursor-pointer"
                                            title="Select all"
                                        />
                                    </th>
                                    <th className="py-3 px-4 min-w-85">Plugin Information</th>
                                    <th className="py-3 px-4 w-40">Version & Meta</th>
                                    <th className="py-3 px-4 w-36">License Left</th>
                                    <th className="py-3 px-4 w-32 text-center">Status</th>
                                    <th className="py-3 px-4 w-44 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((plugin) => {
                                    const isRowSelected = isSelected(plugin.nx);
                                    const isActive = plugin.status === "active";
                                    const isNew = plugin.status === "new";
                                    const isBusy = processing === plugin.nx || batchProcessing;
                                    const statusCfg = STATUS_CONFIG[plugin.status] ?? STATUS_CONFIG.inactive;
                                    const ytId = extractYoutubeId(plugin.youtubeId);
                                    const isPaid = Number(plugin.price) === 5;

                                    return (
                                        <tr
                                            key={plugin.nx}
                                            className={`transition-colors group ${
                                                isRowSelected
                                                    ? "bg-violet-50/50 hover:bg-violet-50/70"
                                                    : "hover:bg-gray-50/70 bg-white"
                                            }`}
                                        >
                                            {/* Column 1: Checkbox */}
                                            <td className="py-4 px-4 text-center align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={isRowSelected}
                                                    onChange={() => toggleSelect(plugin.nx)}
                                                    className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-gray-300 cursor-pointer"
                                                />
                                            </td>

                                            {/* Column 2: Plugin (Icon, Name, Identifier, Description) */}
                                            <td className="py-4 px-4 align-middle">
                                                <div className="flex items-center gap-3.5">
                                                    <div
                                                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                                                        style={{ background: resolveGradient(plugin.color) }}
                                                    >
                                                        <Icon icon={plugin.icon} width={24} className="text-white" />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-sm text-gray-900 group-hover:text-violet-700 transition-colors">
                                                                {plugin.name}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200/60">
                                                                {plugin.nx}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-lg">
                                                            {plugin.description || "No description provided."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 3: Version & Meta Tags */}
                                            <td className="py-4 px-4 align-middle">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200/60">
                                                            v{plugin.version}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                                                isPaid
                                                                    ? "bg-purple-100 text-purple-700"
                                                                    : "bg-emerald-100 text-emerald-700"
                                                                }`}
                                                        >
                                                            {isPaid ? "Paid" : "Free"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                                        <span>by {plugin.author || "System"}</span>
                                                        {ytId && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveVideo({ id: ytId, name: plugin.name })}
                                                                className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-1.5 py-0.2 rounded transition cursor-pointer"
                                                                title="Watch video demo"
                                                            >
                                                                <Icon icon="solar:play-circle-bold" width={13} />
                                                                <span>Demo</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 4: License / Expiry */}
                                            <td className="py-4 px-4 align-middle whitespace-nowrap">
                                                {renderLicensePill(plugin)}
                                            </td>

                                            {/* Column 5: Status Badge */}
                                            <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                    {statusCfg.label}
                                                </span>
                                            </td>

                                            {/* Column 6: Actions (Toggle Switch / Activate + Delete) */}
                                            <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                                                <div className="inline-flex items-center justify-end gap-2.5">
                                                    {isNew ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleActivateNew(plugin)}
                                                            disabled={isBusy}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
                                                        >
                                                            {isBusy ? (
                                                                <Icon icon="svg-spinners:ring-resize" width={14} />
                                                            ) : (
                                                                <Icon icon="solar:play-bold" width={14} />
                                                            )}
                                                            <span>Activate</span>
                                                        </button>
                                                    ) : (
                                                        <>
                                                            {/* Sleek iOS-style Toggle Switch */}
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={isActive}
                                                                onClick={() => handleToggle(plugin)}
                                                                disabled={isBusy}
                                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-40 ${
                                                                    isActive ? "bg-emerald-500" : "bg-gray-300"
                                                                }`}
                                                                title={isActive ? "Click to deactivate" : "Click to activate"}
                                                            >
                                                                <span
                                                                    aria-hidden="true"
                                                                    className={`pointer-events-none h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                                                        isActive ? "translate-x-5" : "translate-x-0"
                                                                    }`}
                                                                >
                                                                    {isBusy ? (
                                                                        <Icon icon="svg-spinners:ring-resize" width={10} className="text-gray-500" />
                                                                    ) : null}
                                                                </span>
                                                            </button>

                                                            {/* Delete / Remove Icon Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(plugin)}
                                                                disabled={isBusy}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition active:scale-95 disabled:opacity-40 cursor-pointer"
                                                                title="Remove plugin record"
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-bold" width={17} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ─────────────────────────────────────────────────────────────
                   GRID VIEW: Card Deck
                   Shared logic with List view without information repetition
                   ───────────────────────────────────────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((plugin) => {
                        const isCardSelected = isSelected(plugin.nx);
                        const isActive = plugin.status === "active";
                        const isNew = plugin.status === "new";
                        const isBusy = processing === plugin.nx || batchProcessing;
                        const statusCfg = STATUS_CONFIG[plugin.status] ?? STATUS_CONFIG.inactive;
                        const ytId = extractYoutubeId(plugin.youtubeId);
                        const isPaid = Number(plugin.price) === 5;

                        return (
                            <div
                                key={plugin.nx}
                                className={`rounded-2xl overflow-hidden bg-white border transition-all duration-200 flex flex-col ${
                                    isCardSelected
                                        ? "border-violet-400 ring-2 ring-violet-200 shadow-md"
                                        : "border-gray-200/90 hover:border-gray-300 shadow-xs hover:shadow-md"
                                }`}
                            >
                                {/* Card Header with gradient */}
                                <div
                                    className="p-4 md:p-5 flex items-start justify-between gap-3 relative text-white"
                                    style={{ background: resolveGradient(plugin.color) }}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isCardSelected}
                                            onChange={() => toggleSelect(plugin.nx)}
                                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-400 bg-white/20 border-white/40 cursor-pointer shrink-0 mt-0.5"
                                        />

                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                                            <Icon icon={plugin.icon} width={24} className="text-white" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-base capitalize leading-snug truncate">
                                                {plugin.name}
                                            </h3>
                                            <p className="text-white/80 text-xs font-mono truncate">{plugin.nx}</p>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <span
                                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-2xs ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                        {statusCfg.label}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 md:p-5 flex-1 flex flex-col justify-between gap-4">
                                    <div className="space-y-3">
                                        <p className="text-gray-600 text-xs md:text-sm leading-relaxed line-clamp-2">
                                            {plugin.description || "No description provided."}
                                        </p>

                                        {/* Metadata Badges */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    v{plugin.version}
                                                </span>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                                        isPaid
                                                            ? "bg-purple-100 text-purple-700"
                                                            : "bg-emerald-100 text-emerald-700"
                                                    }`}
                                                >
                                                    {isPaid ? "Paid" : "Free"}
                                                </span>
                                                <span className="text-[11px] text-gray-400">
                                                    by {plugin.author || "System"}
                                                </span>
                                            </div>

                                            {ytId && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveVideo({ id: ytId, name: plugin.name })}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition cursor-pointer"
                                                >
                                                    <Icon icon="solar:play-circle-bold" width={14} />
                                                    <span>Video</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* License row */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                                            <span className="text-gray-500 font-medium">Access Status:</span>
                                            {renderLicensePill(plugin)}
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                                        {isNew ? (
                                            <button
                                                type="button"
                                                onClick={() => handleActivateNew(plugin)}
                                                disabled={isBusy}
                                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
                                            >
                                                {isBusy ? (
                                                    <Icon icon="svg-spinners:ring-resize" width={16} />
                                                ) : (
                                                    <Icon icon="solar:play-bold" width={16} />
                                                )}
                                                <span>Activate Plugin</span>
                                            </button>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={isActive}
                                                        onClick={() => handleToggle(plugin)}
                                                        disabled={isBusy}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-40 ${
                                                            isActive ? "bg-emerald-500" : "bg-gray-300"
                                                        }`}
                                                        title={isActive ? "Deactivate" : "Activate"}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                                                isActive ? "translate-x-5" : "translate-x-0"
                                                            }`}
                                                        >
                                                            {isBusy ? (
                                                                <Icon icon="svg-spinners:ring-resize" width={10} className="text-gray-500" />
                                                            ) : null}
                                                        </span>
                                                    </button>
                                                    <span className="text-xs font-semibold text-gray-700">
                                                        {isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(plugin)}
                                                    disabled={isBusy}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition active:scale-95 disabled:opacity-40 cursor-pointer"
                                                    title="Remove from database"
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" width={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Informational Note ─────────────────────────────────────────── */}
            <p className="text-xs text-gray-400 text-center">
                Only <strong className="text-emerald-600 font-semibold">active</strong> plugins execute hooks and provide extensions. Newly discovered plugins remain dormant until activated.
            </p>

            {/* ── Video Preview Modal ─────────────────────────────────────────── */}
            {activeVideo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setActiveVideo(null)}
                >
                    <div
                        className="relative w-full max-w-3xl bg-slate-900 rounded-3xl p-4 md:p-6 border border-slate-800 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                                    <Icon icon="solar:play-circle-bold" width={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-tight">
                                        {activeVideo.name}
                                    </h3>
                                    <p className="text-xs text-slate-400">Plugin Video Demo</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveVideo(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title="Close"
                            >
                                <Icon icon="solar:close-circle-bold" width={24} />
                            </button>
                        </div>

                        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner">
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1`}
                                title={activeVideo.name}
                                className="h-full w-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
