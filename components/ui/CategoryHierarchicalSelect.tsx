"use client";

/**
 * CategoryHierarchicalSelect — Self-fetching drill-down category picker.
 *
 * A FieldProps-compatible UI component. Reads ctx?.catType to know which
 * category type to fetch — no manual configuration needed in the form.
 *
 * UX: one dropdown at a time. Selecting an item reveals its children as the
 * next dropdown. Selecting "— None —" collapses everything below that level.
 *
 * Value stored: JSON string  { id: string; path: string[] }
 * The key "category" is special — PostForm syncs it to core category state.
 *
 * Usage in a plugin's register():
 *   addHook("post.form", [{
 *     key: "category",
 *     label: "Category",
 *     type: "product",
 *     style: "right",
 *     position: 5,
 *     component: CategoryHierarchicalSelect,
 *     hierarchicalCatType: "product-category",
 *   }], PLUGIN_NX);
 */

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { FieldProps } from "@/hook";
import { xFetch } from "@/lib/express";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CategoryNode {
    id: string;
    title: string;
    parentId: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function childrenOf(nodes: CategoryNode[], parentId: string | null): CategoryNode[] {
    return nodes.filter((n) => n.parentId === parentId);
}

function buildMap(nodes: CategoryNode[]): Map<string, CategoryNode> {
    return new Map(nodes.map((n) => [n.id, n]));
}

function buildPath(id: string, map: Map<string, CategoryNode>): string[] {
    const path: string[] = [];
    let cur = map.get(id);
    while (cur) {
        path.unshift(cur.id);
        cur = cur.parentId ? map.get(cur.parentId) : undefined;
    }
    return path;
}

function parseValue(raw: string): { id: string; path: string[] } {
    if (!raw) return { id: "", path: [] };
    // Support plain id string (legacy) or JSON blob
    try {
        const p = JSON.parse(raw);
        if (p && typeof p === "object" && "id" in p) return p;
        return { id: raw, path: [] };
    } catch {
        return { id: raw, path: [] };
    }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CategoryHierarchicalSelect({ name, label, value, onChange, ctx }: FieldProps) {
    const catType = (ctx?.catType as string) ?? "";

    const [nodes, setNodes]         = useState<CategoryNode[]>([]);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(false);
    const [selections, setSelections] = useState<string[]>([]);

    // ── Fetch all nodes for this cat type ───────────────────────────────────
    const fetchNodes = useCallback(() => {
        if (!catType) return;
        setLoading(true);
        setError(false);
        xFetch(`/cat?type=${encodeURIComponent(catType)}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                const cats: any[] = data.cats ?? [];
                setNodes(cats.map((c) => ({
                    id: c._id,
                    title: c.title,
                    parentId: c.parentId != null ? String(c.parentId) : null,
                })));
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [catType]);

    useEffect(() => { fetchNodes(); }, [fetchNodes]);

    // ── Restore selections from value (edit mode) ───────────────────────────
    useEffect(() => {
        if (nodes.length === 0) return;
        const { id } = parseValue(value);
        if (!id) { setSelections([]); return; }
        setSelections(buildPath(id, buildMap(nodes)));
    }, [value, nodes]);

    // ── Handle a level change ───────────────────────────────────────────────
    const handleChange = (level: number, selectedId: string) => {
        const next = [...selections.slice(0, level)];
        if (selectedId) next[level] = selectedId;
        setSelections(next);

        const leafId = selectedId || "";
        const map    = buildMap(nodes);
        const path   = leafId ? buildPath(leafId, map) : [];
        // Emit JSON blob so PostForm can extract both id and path from one value
        onChange(leafId ? JSON.stringify({ id: leafId, path }) : "");
    };

    // ── Build visible dropdowns ─────────────────────────────────────────────
    const dropdowns: { options: CategoryNode[]; selectedId: string }[] = [];
    const topLevel = childrenOf(nodes, null);
    if (topLevel.length > 0) {
        dropdowns.push({ options: topLevel, selectedId: selections[0] ?? "" });
    }
    for (let i = 0; i < selections.length; i++) {
        if (!selections[i]) break;
        const children = childrenOf(nodes, selections[i]);
        if (children.length === 0) break;
        dropdowns.push({ options: children, selectedId: selections[i + 1] ?? "" });
    }

    // ── Render ──────────────────────────────────────────────────────────────
    if (!catType) return null;

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <Icon icon="mdi:loading" width="16" height="16" className="animate-spin" />
                Loading categories…
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <span className="text-red-500">Failed to load categories.</span>
                <button type="button" onClick={fetchNodes} className="text-xs text-indigo-500 hover:underline">
                    Retry
                </button>
            </div>
        );
    }

    if (nodes.length === 0) return null;

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold">{label}</label>
            {dropdowns.map(({ options, selectedId }, idx) => (
                <select
                    key={idx}
                    value={selectedId}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 bg-white"
                >
                    <option value="">{idx === 0 ? `— Select ${label} —` : "— None —"}</option>
                    {options.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.title}</option>
                    ))}
                </select>
            ))}
        </div>
    );
}
