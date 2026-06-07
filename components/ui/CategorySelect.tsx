"use client";

/**
 * CategorySelect — Self-fetching category dropdown.
 *
 * A fully dynamic, pluggable replacement for a hardcoded Select+options pair.
 * The category type to fetch comes from ctx?.catType (set by the hook field's
 * hierarchicalCatType property, forwarded by PostForm into ctx).
 *
 * Usage in a plugin's register():
 *   addHook("post.form", [{
 *     key: "category",
 *     label: "Category",
 *     type: "blog",           // post type this field applies to
 *     style: "right",
 *     position: 5,
 *     component: CategorySelect,
 *     hierarchicalCatType: "blog-category",   // ← fetched automatically
 *   }], PLUGIN_NX);
 *
 * Value stored: the selected category _id string (written directly to the
 * form's core `category` state via the special key "category").
 */

import { useEffect, useState } from "react";
import type { FieldProps } from "@/hook";
import { xFetch } from "@/lib/express";

interface CatOption {
    _id: string;
    title: string;
    parentId: string | null;
}

function buildTree(
    items: CatOption[],
    parentId: string | null = null,
    depth = 0
): { id: string; title: string; depth: number }[] {
    return items
        .filter((i) => (i.parentId ?? null) === parentId)
        .flatMap((i) => [
            { id: i._id, title: i.title, depth },
            ...buildTree(items, i._id, depth + 1),
        ]);
}

export function CategorySelect({ name, label, value, onChange, ctx }: FieldProps) {
    // catType comes from the hook field's hierarchicalCatType, forwarded via ctx
    const catType = (ctx?.catType as string) ?? "";

    const [options, setOptions] = useState<CatOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!catType) return;
        setLoading(true);
        xFetch(`/cat?type=${encodeURIComponent(catType)}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => setOptions(d.cats ?? []))
            .catch(() => setOptions([]))
            .finally(() => setLoading(false));
    }, [catType]);

    const flat = buildTree(options);

    if (!catType) return null;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-xs font-semibold">
                {label}
            </label>
            <select
                id={name}
                name={name}
                value={value}
                disabled={loading}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:opacity-60"
            >
                <option value="">
                    {loading ? "Loading…" : `— Select ${label} —`}
                </option>
                {flat.map(({ id, title, depth }) => (
                    <option key={id} value={id}>
                        {depth > 0 ? `${"— ".repeat(depth)}${title}` : title}
                    </option>
                ))}
            </select>
        </div>
    );
}
