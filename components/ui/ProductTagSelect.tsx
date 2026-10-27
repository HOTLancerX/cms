"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import type { FieldProps } from "@/hook";
import { xFetch } from "@/lib/express";

interface TagNode {
    id: string;
    title: string;
    slug: string;
}

function parseTagIds(raw: string): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => (typeof item === "object" && item ? item.id || item._id || item.slug : String(item))).filter(Boolean);
        }
        if (typeof parsed === "object" && parsed !== null) {
            return [parsed.id || parsed._id || ""].filter(Boolean);
        }
        return [String(parsed)].filter(Boolean);
    } catch {
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
}

export function ProductTagSelect({ name, label, value, onChange, ctx }: FieldProps) {
    const catType = (ctx?.catType as string) || "product-tag";

    const [tags, setTags] = useState<TagNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedIds = parseTagIds(value);

    // Fetch existing tags
    const fetchTags = useCallback(async () => {
        setLoading(true);
        try {
            const res = await xFetch(`/cat?type=${encodeURIComponent(catType)}`, { cache: "no-store" });
            const data = await res.json();
            const cats: any[] = data.cats ?? [];
            setTags(
                cats.map((c) => ({
                    id: String(c._id),
                    title: c.title || "",
                    slug: c.slug || "",
                }))
            );
        } catch {
            // Keep empty
        } finally {
            setLoading(false);
        }
    }, [catType]);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Add tag by ID
    const handleAddTag = (id: string) => {
        if (!selectedIds.includes(id)) {
            const updated = [...selectedIds, id];
            onChange(JSON.stringify(updated));
        }
        setSearch("");
        setIsOpen(false);
        inputRef.current?.focus();
    };

    // Remove tag by ID
    const handleRemoveTag = (id: string) => {
        const updated = selectedIds.filter((tId) => tId !== id);
        onChange(JSON.stringify(updated));
    };

    // Quick create new tag
    const handleCreateTag = async () => {
        const title = search.trim();
        if (!title || creating) return;

        setCreating(true);
        try {
            const slug = slugify(title);
            const res = await xFetch("/cat", {
                method: "POST",
                body: JSON.stringify({
                    title,
                    slug,
                    type: catType,
                    status: "published",
                }),
            });
            const data = await res.json();
            if (res.ok && data?.cat?._id) {
                const newTag: TagNode = {
                    id: String(data.cat._id),
                    title: data.cat.title || title,
                    slug: data.cat.slug || slug,
                };
                setTags((prev) => [...prev, newTag]);
                handleAddTag(newTag.id);
            }
        } catch {
            // Error handling
        } finally {
            setCreating(false);
        }
    };

    // Filter available tags that are not yet selected
    const unselectedTags = tags.filter((t) => !selectedIds.includes(t.id));
    const filteredTags = search.trim()
        ? unselectedTags.filter((t) =>
              t.title.toLowerCase().includes(search.toLowerCase()) ||
              t.slug.toLowerCase().includes(search.toLowerCase())
          )
        : unselectedTags;

    // Check if the typed title matches any existing tag exactly
    const exactMatchExists = tags.some(
        (t) => t.title.toLowerCase() === search.trim().toLowerCase()
    );

    return (
        <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded border border-gray-100 shadow-2xs" ref={dropdownRef}>
            <div className="flex items-center justify-between">
                <label htmlFor={name} className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Icon icon="solar:hashtag-square-bold" className="text-indigo-600" width={14} />
                    {label || "Tags"}
                </label>
                {loading && <Icon icon="svg-spinners:ring-resize" className="text-gray-400" width={12} />}
            </div>

            {/* Selected Tags Pills */}
            <div className="flex flex-wrap gap-1.5 min-h-8 items-center">
                {selectedIds.length === 0 && !isOpen && (
                    <span className="text-[11px] text-gray-400 italic">No tags selected</span>
                )}
                {selectedIds.map((id) => {
                    const tagObj = tags.find((t) => t.id === id);
                    const tagTitle = tagObj ? tagObj.title : id;
                    return (
                        <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60 transition hover:bg-indigo-100"
                        >
                            <Icon icon="solar:hashtag-linear" width={12} className="opacity-60" />
                            <span>{tagTitle}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveTag(id)}
                                className="text-indigo-400 hover:text-indigo-800 transition ml-0.5"
                                title="Remove tag"
                            >
                                <Icon icon="solar:close-circle-bold" width={14} />
                            </button>
                        </span>
                    );
                })}
            </div>

            {/* Search / Select Dropdown Trigger */}
            <div className="relative mt-1">
                <div className="relative flex items-center">
                    <Icon icon="solar:magnifer-linear" className="absolute left-2.5 text-gray-400" width={14} />
                    <input
                        ref={inputRef}
                        id={name}
                        type="text"
                        value={search}
                        onFocus={() => setIsOpen(true)}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setIsOpen(true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                if (filteredTags.length > 0) {
                                    handleAddTag(filteredTags[0].id);
                                } else if (search.trim() && !exactMatchExists) {
                                    handleCreateTag();
                                }
                            }
                        }}
                        placeholder={`Search or add ${label?.toLowerCase() || "tag"}...`}
                        className="w-full text-xs rounded-lg border border-gray-200 bg-gray-50/50 pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                </div>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg text-xs animate-in fade-in zoom-in-95 duration-100">
                        {filteredTags.length > 0 ? (
                            filteredTags.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleAddTag(t.id)}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-indigo-50 text-left text-gray-700 hover:text-indigo-700 transition"
                                >
                                    <span className="font-medium">#{t.title}</span>
                                    <span className="text-[10px] text-gray-400">{t.slug}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-2.5 py-2 text-center text-gray-400 text-[11px]">
                                {search.trim() ? "No matching tags" : "All available tags selected"}
                            </div>
                        )}

                        {/* Quick create action */}
                        {search.trim() && !exactMatchExists && (
                            <div className="border-t border-gray-100 mt-1 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCreateTag}
                                    disabled={creating}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-indigo-600 hover:bg-indigo-50 font-semibold transition disabled:opacity-50"
                                >
                                    <Icon icon={creating ? "svg-spinners:ring-resize" : "solar:add-circle-bold"} width={14} />
                                    <span>Create &quot;{search.trim()}&quot;</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
