"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

const SECTION_TYPES = [
    { key: "all", label: "All" },
    { key: "header", label: "Header" },
    { key: "footer", label: "Footer" },
    { key: "hero", label: "Hero" },
    { key: "category", label: "Category" },
    { key: "cta", label: "CTA" },
    { key: "testimonial", label: "Testimonial" },
    { key: "faq", label: "FAQ" },
    { key: "contact", label: "Contact" },
    { key: "pricing", label: "Pricing" },
    { key: "team", label: "Team" },
    { key: "general", label: "General" },
];

interface SectionDoc {
    _id: string;
    title: string;
    type: string;
    image: string;
    status: string;
    updatedAt: string;
}

export default function BuilderSectionPage() {
    const [sections, setSections] = useState<SectionDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        fetch("/api/buildersection")
            .then((r) => r.json())
            .then((data) => {
                setSections(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this section?")) return;
        await fetch(`/api/buildersection?id=${id}`, { method: "DELETE" });
        setSections((prev) => prev.filter((s) => s._id !== id));
    };

    const filtered = activeTab === "all"
        ? sections
        : sections.filter((s) => s.type === activeTab);

    if (loading) return <div className="p-6 text-sm text-neutral-500">Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-5">
                <h1 className="text-xl font-bold text-neutral-800">Builder Sections</h1>
            </div>

            {/* Type Tabs */}
            <div className="flex flex-wrap gap-1 mb-5 border-b border-neutral-200 pb-2">
                {SECTION_TYPES.map((tab) => {
                    const count = tab.key === "all"
                        ? sections.length
                        : sections.filter((s) => s.type === tab.key).length;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-t cursor-pointer border-none transition-colors ${activeTab === tab.key
                                ? "bg-blue-500 text-white"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                }`}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-blue-400 text-white" : "bg-neutral-200 text-neutral-500"}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Section Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-sm">
                    No sections found{activeTab !== "all" ? ` for "${activeTab}"` : ""}.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((section) => (
                        <div
                            key={section._id}
                            className="border border-neutral-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
                        >
                            {/* Image preview */}
                            <div className="h-32 bg-neutral-100 flex items-center justify-center overflow-hidden">
                                {section.image ? (
                                    <img
                                        src={section.image}
                                        alt={section.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Icon icon="mdi:image-outline" width="32" className="text-neutral-300" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <h3 className="text-sm font-medium text-neutral-800 truncate">{section.title}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 capitalize">
                                        {section.type}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${section.status === "active" ? "bg-green-400" : "bg-neutral-300"}`} />
                                        <span className="text-[11px] text-neutral-400">
                                            {new Date(section.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-neutral-100">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(section._id)}
                                        className="text-[11px] text-red-500 hover:text-red-600 bg-transparent border-none cursor-pointer"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
