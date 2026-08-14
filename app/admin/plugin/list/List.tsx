"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";

// ── Types (previously from data/plugin.ts — now sourced from Express) ─────────
export interface AvailablePlugin {
    _id: string;
    nx: string;
    name: string;
    version: string;
    description: string;
    author: string;
    path: string;
    icon: string;
    color: string;
    youtubeId?: string;
    price?: number;
}

function extractYoutubeId(urlOrId?: string): string {
    if (!urlOrId) return "";
    const str = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : str;
}

// Maps Tailwind gradient class pairs → actual CSS gradient.
// Dynamic Tailwind classes are purged at build time, so we resolve them here.
const COLOR_MAP: Record<string, string> = {
    "from-sky-500 to-blue-600": "linear-gradient(to bottom right, #0ea5e9, #2563eb)",
    "from-violet-500 to-purple-600": "linear-gradient(to bottom right, #8b5cf6, #9333ea)",
    "from-indigo-500 to-violet-600": "linear-gradient(to bottom right, #6366f1, #7c3aed)",
    "from-emerald-500 to-teal-600": "linear-gradient(to bottom right, #10b981, #0d9488)",
    "from-orange-500 to-red-600": "linear-gradient(to bottom right, #f97316, #dc2626)",
    "from-pink-500 to-rose-600": "linear-gradient(to bottom right, #ec4899, #e11d48)",
    "from-amber-500 to-orange-600": "linear-gradient(to bottom right, #f59e0b, #ea580c)",
    "from-cyan-500 to-sky-600": "linear-gradient(to bottom right, #06b6d4, #0284c7)",
    "from-lime-500 to-green-600": "linear-gradient(to bottom right, #84cc16, #16a34a)",
    "from-fuchsia-500 to-pink-600": "linear-gradient(to bottom right, #d946ef, #db2777)",
    "from-violet-600 to-indigo-600": "linear-gradient(to right, #7c3aed, #4f46e5)",
};

function resolveGradient(color: string): string {
    return COLOR_MAP[color] ?? "linear-gradient(to bottom right, #6366f1, #7c3aed)";
}

interface InstalledRecord {
    _id: string;
    nx: string;
    name: string;
    version: string;
    status: string;
}

interface Props {
    available: AvailablePlugin[];
    installed: InstalledRecord[];
}

function isNewerVersion(a: string, b: string): boolean {
    const parse = (v: string) => v.split(".").map(Number);
    const [aMaj, aMin, aPatch] = parse(a);
    const [bMaj, bMin, bPatch] = parse(b);
    if (aMaj !== bMaj) return aMaj > bMaj;
    if (aMin !== bMin) return aMin > bMin;
    return aPatch > bPatch;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-100 text-emerald-700 ring-emerald-300" },
    inactive: { label: "Inactive", cls: "bg-white/80 text-gray-600 ring-gray-300" },
    install: { label: "Installed", cls: "bg-blue-100 text-blue-700 ring-blue-300" },
    update: { label: "Updated", cls: "bg-orange-100 text-orange-700 ring-orange-300" },
};

export default function PluginStoreList({ available, installed }: Props) {
    const router = useRouter();

    // Keyed by nx — canonical unique ID
    const [installedMap, setInstalledMap] = useState<Map<string, InstalledRecord>>(
        () => new Map(installed.map((p) => [p.nx, p]))
    );
    const [processing, setProcessing] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [activeVideo, setActiveVideo] = useState<{ id: string; name: string } | null>(null);

    const filtered = available.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            p.nx.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.author.toLowerCase().includes(q)
        );
    });

    const updateLocal = (nx: string, patch: Partial<InstalledRecord>) =>
        setInstalledMap((prev) => {
            const next = new Map(prev);
            const existing = next.get(nx);
            if (existing) {
                next.set(nx, { ...existing, ...patch });
            } else if (patch._id) {
                // newly inserted record
                next.set(nx, patch as InstalledRecord);
            }
            return next;
        });

    const handleInstall = async (plugin: AvailablePlugin) => {
        setProcessing(plugin.nx);
        const res = await xFetch("/plugin/installed", {
            method: "POST",
            body: JSON.stringify({
                nx: plugin.nx,
                name: plugin.name,
                version: plugin.version,
                icon: plugin.icon,
                color: plugin.color,
                status: "install",
            }),
        });
        setProcessing(null);
        if (res.ok) {
            router.refresh();
        }
    };

    const handleUpdate = async (nx: string) => {
        const record = installedMap.get(nx);
        if (!record) return;
        setProcessing(nx);
        await xFetch("/plugin/installed", {
            method: "PUT",
            body: JSON.stringify({ id: record._id, status: "update" }),
        });
        updateLocal(nx, { status: "update" });
        setProcessing(null);
    };

    const handleToggle = async (nx: string) => {
        const record = installedMap.get(nx);
        if (!record) return;
        const next = record.status === "active" ? "inactive" : "active";
        setProcessing(nx);
        await xFetch("/plugin/installed", {
            method: "PUT",
            body: JSON.stringify({ id: record._id, status: next }),
        });
        updateLocal(nx, { status: next });
        setProcessing(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Plugin Store</h1>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{available.length} plugins available</p>
                    <Link
                        href="/admin/plugin"
                        className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition text-sm shadow"
                        style={{ background: resolveGradient("from-violet-600 to-indigo-600") }}
                    >
                        <Icon icon="solar:arrow-left-bold" width={16} />
                        List
                    </Link>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Icon icon="solar:magnifer-linear" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search store…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition"
                />
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Icon icon="solar:shop-bold" width={48} className="mx-auto mb-3 opacity-40" />
                    <p>{search ? "No plugins match your search." : "No plugins available."}</p>
                </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((plugin) => {
                    const record = installedMap.get(plugin.nx);
                    const isInstalled = !!record;
                    const isActive = record?.status === "active";
                    const isPending = record?.status === "install" || record?.status === "update";
                    const hasUpdate =
                        isInstalled &&
                        !isPending &&
                        isNewerVersion(plugin.version, record!.version);
                    const isBusy = processing === plugin.nx;
                    const badge = record ? STATUS_BADGE[record.status] ?? STATUS_BADGE.inactive : null;
                    const ytId = extractYoutubeId(plugin.youtubeId);
                    const isPaid = Number(plugin.price) === 5;

                    return (
                        <div
                            key={plugin.nx}
                            className="rounded-2xl overflow-hidden shadow-md border border-white/20 flex flex-col"
                        >
                            {/* Coloured header — inline style avoids Tailwind purge */}
                            <div
                                className="p-5 flex items-center gap-4"
                                style={{ background: resolveGradient(plugin.color) }}
                            >
                                <div className="bg-white/20 rounded-xl p-2.5">
                                    <Icon icon={plugin.icon} width={28} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-lg capitalize leading-tight truncate">
                                        {plugin.name}
                                    </h3>
                                    <p className="text-gray-200 text-xs font-mono truncate">{plugin.nx}</p>
                                </div>

                                {/* Status badge — only when installed */}
                                {badge && (
                                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${badge.cls}`}>
                                        {badge.label}
                                    </span>
                                )}
                            </div>

                            {/* Body */}
                            <div className="bg-white flex-1 p-5 flex flex-col gap-3">
                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                                    {plugin.description}
                                </p>

                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                            v{plugin.version}
                                        </span>
                                        <span
                                            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                                                isPaid
                                                    ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                                                    : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                                            }`}
                                        >
                                            {isPaid ? "Paid" : "Free"}
                                        </span>
                                        <span className="text-xs text-gray-400">by {plugin.author}</span>
                                    </div>

                                    {/* Video Demo Button if youtubeId exists */}
                                    {ytId && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveVideo({ id: ytId, name: plugin.name })}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 transition cursor-pointer text-xs font-bold shrink-0 shadow-2xs"
                                            title="Watch Video Preview"
                                        >
                                            <Icon icon="solar:play-circle-bold" width={18} className="text-red-600" />
                                            <span>Video</span>
                                        </button>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2">
                                    {!isInstalled ? (
                                        /* ── Not in DB → Install ── */
                                        <button
                                            onClick={() => handleInstall(plugin)}
                                            disabled={isBusy}
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50 hover:opacity-90"
                                            style={{ background: resolveGradient(plugin.color) }}
                                        >
                                            {isBusy
                                                ? <Icon icon="svg-spinners:ring-resize" width={16} />
                                                : <Icon icon="solar:download-bold" width={16} />
                                            }
                                            {isBusy ? "Saving…" : "Install"}
                                        </button>
                                    ) : isPending ? (
                                        /* ── Already queued: disabled confirmation state ── */
                                        <button
                                            disabled
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white opacity-70 cursor-not-allowed"
                                            style={{ background: "linear-gradient(to right, #9ca3af, #6b7280)" }}
                                        >
                                            <Icon icon="solar:check-circle-bold" width={16} />
                                            {record!.status === "update" ? "Updated" : "Installed"}
                                        </button>
                                    ) : (
                                        <>
                                            {/* ── Installed → Activate / Deactivate toggle ── */}
                                            <button
                                                onClick={() => handleToggle(plugin.nx)}
                                                disabled={isBusy}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-40 hover:opacity-90"
                                                style={{ background: isActive ? "#f97316" : "#10b981" }}
                                            >
                                                {isBusy ? (
                                                    <Icon icon="svg-spinners:ring-resize" width={16} />
                                                ) : isActive ? (
                                                    <><Icon icon="solar:pause-bold" width={16} />Deactivate</>
                                                ) : (
                                                    <><Icon icon="solar:play-bold" width={16} />Activate</>
                                                )}
                                            </button>

                                            {/* ── Has update → Update button ── */}
                                            {hasUpdate && (
                                                <button
                                                    onClick={() => handleUpdate(plugin.nx)}
                                                    disabled={isBusy}
                                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50"
                                                    title={`Update to v${plugin.version}`}
                                                >
                                                    {isBusy
                                                        ? <Icon icon="svg-spinners:ring-resize" width={16} />
                                                        : <Icon icon="solar:refresh-bold" width={16} />
                                                    }
                                                    v{plugin.version}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Version diff hint */}
                                {isInstalled && hasUpdate && (
                                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                                        <span className="line-through">v{record!.version}</span>
                                        <Icon icon="solar:arrow-right-bold" width={12} />
                                        <span className="text-orange-500 font-semibold">v{plugin.version}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* Video Popup Modal Box */}
            {activeVideo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setActiveVideo(null)}
                >
                    <div
                        className="relative w-full max-w-3xl bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                                    <Icon icon="solar:play-circle-bold" width={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white leading-tight">
                                        {activeVideo.name}
                                    </h3>
                                    <p className="text-xs text-slate-400">Video Demo Preview</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveVideo(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                                title="Close Video"
                            >
                                <Icon icon="solar:close-circle-bold" width={26} />
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
