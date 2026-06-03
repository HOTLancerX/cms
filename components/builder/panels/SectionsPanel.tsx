"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useDraggable } from "@dnd-kit/react";

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
    content: any;
}

interface Props {
    onInsert: (content: any[]) => void;
}

export default function SectionsPanel({ onInsert }: Props) {
    const [sections, setSections] = useState<SectionDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/buildersection")
            .then((r) => r.json())
            .then((data) => {
                setSections(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = sections.filter((s) => {
        const matchType = activeTab === "all" || s.type === activeTab;
        const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
    });

    return (
        <div className="p-3">
            {/* Search */}
            <div className="relative mb-3">
                <Icon
                    icon="mdi:magnify"
                    width="14"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Search sections..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full py-[7px] pr-2 pl-7 border border-gray-200 rounded text-xs outline-none"
                />
            </div>

            {/* Type tabs — scrollable */}
            <div className="flex flex-wrap gap-1 mb-3">
                {SECTION_TYPES.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer border-none transition-colors ${activeTab === tab.key
                            ? "bg-blue-500 text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Section list */}
            {loading ? (
                <div className="text-xs text-neutral-400 text-center py-6">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="text-xs text-neutral-400 text-center py-6">No sections found.</div>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                    {filtered.map((section) => (
                        <DraggableSectionItem
                            key={section._id}
                            section={section}
                            onInsert={() => onInsert(Array.isArray(section.content) ? section.content : [])}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function DraggableSectionItem({
    section,
    onInsert,
}: {
    section: SectionDoc;
    onInsert: () => void;
}) {
    const { ref, isDragging } = useDraggable({
        id: `section-${section._id}`,
        type: "catalog-section",
        data: { sectionContent: section.content, dndType: "section" },
    });

    return (
        <button
            ref={ref}
            type="button"
            onClick={onInsert}
            className={`flex items-center gap-2.5 p-2 rounded border cursor-grab text-left transition-all duration-200 ${isDragging
                ? "border-blue-300 bg-blue-50 scale-95 opacity-60 shadow-lg"
                : "border-neutral-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm"
                }`}
        >
            {/* Thumbnail */}
            <div className="w-14 h-10 rounded bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
                {section.image ? (
                    <img src={section.image} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Icon icon="mdi:view-dashboard-outline" width="18" className="text-neutral-300" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-neutral-700 truncate">{section.title}</div>
                <div className="text-[10px] text-neutral-400 capitalize">{section.type}</div>
            </div>
        </button>
    );
}
