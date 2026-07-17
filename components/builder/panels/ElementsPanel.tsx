"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDraggable } from "@dnd-kit/react";
import { getElementCatalog } from "../helpers";

interface Props {
    onClickAdd: (elementType: string) => void;
}

export default function ElementsPanel({ onClickAdd }: Props) {
    const [search, setSearch] = useState("");

    // Get fresh catalog on every render (reflects active plugins)
    const catalog = getElementCatalog();

    // Filter by search
    const filtered = search
        ? catalog.filter((item) =>
            item.label.toLowerCase().includes(search.toLowerCase())
        )
        : catalog;

    // Group by category
    const categories = [...new Set(filtered.map((item) => item.category))];

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
                    placeholder="Search Widget..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full py-[7px] pr-2 pl-7 border border-gray-200 rounded text-xs outline-none"
                />
            </div>

            {/* Categories */}
            {categories.map((cat) => (
                <div key={cat} className="mb-4">
                    <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <span className="text-gray-400">▾</span> {cat}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {filtered
                            .filter((item) => item.category === cat)
                            .map((item) => (
                                <DraggableCatalogItem
                                    key={item.type}
                                    item={item}
                                    onClickAdd={() => onClickAdd(item.type)}
                                />
                            ))}
                    </div>
                </div>
            ))}

            {filtered.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-5">
                    No elements found.
                </p>
            )}
        </div>
    );
}

function DraggableCatalogItem({
    item,
    onClickAdd,
}: {
    item: ReturnType<typeof getElementCatalog>[number];
    onClickAdd: () => void;
}) {
    const { ref, isDragging } = useDraggable({
        id: `catalog-${item.type}`,
        type: "catalog",
        data: { elementType: item.type },
    });

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClickAdd}
            className={`flex flex-col items-center gap-1.5 p-2 rounded border border-gray-200 cursor-grab transition-all duration-200 ${isDragging
                    ? "bg-blue-50 border-blue-300 scale-95 opacity-60 shadow-lg shadow-blue-200/50"
                    : "bg-white hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm active:scale-95"
                }`}
        >
            {typeof item.icon === "string" && (item.icon.startsWith("/") || item.icon.includes(".") || item.icon.startsWith("http")) ? (
                <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-14 object-contain"
                />
            ) : (
                <Icon icon={item.icon} width="35" className={`transition-colors duration-200 ${isDragging ? "text-blue-500" : "text-gray-600"}`} />
            )}
            <span className={`text-sm transition-colors duration-200 line-clamp-2 ${isDragging ? "text-blue-600" : "text-gray-700"}`}>{item.label}</span>
        </button>
    );
}
