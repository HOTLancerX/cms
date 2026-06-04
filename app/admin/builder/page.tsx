"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";

interface BuilderDoc {
    _id: string;
    title: string;
    status: string;
    updatedAt: string;
}

export default function BuilderListPage() {
    const [docs, setDocs] = useState<BuilderDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        xFetch("/builder")
            .then((r) => r.json())
            .then((data) => {
                setDocs(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this builder page?")) return;
        await xFetch(`/builder?id=${id}`, { method: "DELETE" });
        setDocs((prev) => prev.filter((d) => d._id !== id));
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-xl font-bold">Builder Pages</h1>
                <Link
                    href="/admin/builder/add"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium no-underline"
                >
                    <Icon icon="mdi:plus" width="16" /> Add New
                </Link>
            </div>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-neutral-200 text-left">
                        <th className="px-3 py-2 text-xs text-neutral-500 font-medium">Title</th>
                        <th className="px-3 py-2 text-xs text-neutral-500 font-medium">Status</th>
                        <th className="px-3 py-2 text-xs text-neutral-500 font-medium">Updated</th>
                        <th className="px-3 py-2 text-xs text-neutral-500 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {docs.map((doc) => (
                        <tr key={doc._id} className="border-b border-neutral-100">
                            <td className="px-3 py-2.5 text-sm">
                                <Link href={`/admin/builder/${doc._id}`} className="text-blue-500 no-underline hover:underline">
                                    {doc.title}
                                </Link>
                            </td>
                            <td className="px-3 py-2.5">
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] ${doc.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-neutral-100 text-neutral-500"
                                        }`}
                                >
                                    {doc.status}
                                </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-neutral-500">
                                {new Date(doc.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2.5">
                                <button
                                    onClick={() => handleDelete(doc._id)}
                                    className="bg-transparent border-none text-red-500 text-xs cursor-pointer hover:underline"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {docs.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-3 py-5 text-center text-neutral-400 text-sm">
                                No builder pages yet.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
