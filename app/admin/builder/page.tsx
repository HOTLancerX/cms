"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";

interface BuilderDoc {
    _id: string;
    title: string;
    status: string;
    templateType?: string | null;
    updatedAt: string;
}

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
    header: { icon: "solar:sidebar-minimalistic-bold",  color: "text-violet-600",  bg: "bg-violet-50" },
    footer: { icon: "solar:list-bold",                  color: "text-indigo-600",  bg: "bg-indigo-50" },
    page:   { icon: "solar:file-bold",                  color: "text-blue-600",    bg: "bg-blue-50"   },
    post:   { icon: "solar:document-bold",              color: "text-sky-600",     bg: "bg-sky-50"    },
    cat:    { icon: "solar:folder-bold",                color: "text-amber-600",   bg: "bg-amber-50"  },
};

export default function BuilderListPage() {
    const [docs, setDocs]       = useState<BuilderDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        xFetch("/builder")
            .then((r) => r.json())
            .then((data) => { setDocs(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this builder page?")) return;
        await xFetch(`/builder?id=${id}`, { method: "DELETE" });
        setDocs((prev) => prev.filter((d) => d._id !== id));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px] gap-3 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={22} />
                <span className="text-sm">Loading pages…</span>
            </div>
        );
    }

    return (
        <div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Builder Pages</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{docs.length} page{docs.length !== 1 ? "s" : ""}</p>
                </div>
                <Link
                    href="/admin/builder/add"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-sm font-semibold no-underline transition-colors shadow-sm shadow-indigo-200 w-full sm:w-auto"
                >
                    <Icon icon="mdi:plus-circle" width={18} />
                    Add New Page
                </Link>
            </div>

            {/* Empty state */}
            {docs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Icon icon="solar:widget-bold" width={40} className="text-gray-300" />
                    <p className="text-sm text-gray-400 font-medium">No builder pages yet</p>
                    <Link
                        href="/admin/builder/add"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 no-underline transition-colors"
                    >
                        <Icon icon="mdi:plus" width={14} /> Create your first page
                    </Link>
                </div>
            )}

            {/* Desktop table */}
            {docs.length > 0 && (
                <>
                    <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {docs.map((doc) => {
                                    const meta = TYPE_META[doc.templateType ?? ""] ?? {
                                        icon: "solar:file-bold", color: "text-gray-500", bg: "bg-gray-50",
                                    };
                                    return (
                                        <tr key={doc._id} className="hover:bg-gray-50/60 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                                                        <Icon icon={meta.icon} width={16} className={meta.color} />
                                                    </div>
                                                    <Link
                                                        href={`/admin/builder/${doc._id}`}
                                                        className="text-sm font-semibold text-gray-800 hover:text-indigo-600 no-underline transition-colors"
                                                    >
                                                        {doc.title}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {doc.templateType ? (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${meta.bg} ${meta.color}`}>
                                                        {doc.templateType}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                    doc.status === "active"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-gray-100 text-gray-500"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${doc.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">
                                                {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                                                    year: "numeric", month: "short", day: "numeric",
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/admin/builder/${doc._id}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold no-underline transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Icon icon="solar:pen-bold" width={14} />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(doc._id)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border-0 cursor-pointer transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Icon icon="solar:trash-bin-trash-bold" width={14} />
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

                    {/* Mobile cards */}
                    <div className="flex flex-col gap-3 sm:hidden">
                        {docs.map((doc) => {
                            const meta = TYPE_META[doc.templateType ?? ""] ?? {
                                icon: "solar:file-bold", color: "text-gray-500", bg: "bg-gray-50",
                            };
                            return (
                                <div key={doc._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                    {/* Top row */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                                            <Icon icon={meta.icon} width={18} className={meta.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                href={`/admin/builder/${doc._id}`}
                                                className="text-sm font-bold text-gray-800 hover:text-indigo-600 no-underline transition-colors block truncate"
                                            >
                                                {doc.title}
                                            </Link>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                                                    year: "numeric", month: "short", day: "numeric",
                                                })}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                                            doc.status === "active"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-gray-100 text-gray-500"
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${doc.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                                            {doc.status}
                                        </span>
                                    </div>

                                    {/* Type badge */}
                                    {doc.templateType && (
                                        <div className="mb-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${meta.bg} ${meta.color}`}>
                                                <Icon icon={meta.icon} width={11} />
                                                {doc.templateType}
                                            </span>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-50">
                                        <Link
                                            href={`/admin/builder/${doc._id}`}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold no-underline transition-colors"
                                        >
                                            <Icon icon="solar:pen-bold" width={15} />
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(doc._id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border-0 cursor-pointer transition-colors"
                                        >
                                            <Icon icon="solar:trash-bin-trash-bold" width={15} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
