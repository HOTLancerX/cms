"use client";

import { useState } from "react";
import Select from "./Select";
import ColorPickerPopup from "./ColorPickerPopup";
import NumberControl from "./Number";

/**
 * BoxShadow control — Normal / Hover tabs (own internal tab state, no nested Tabs wrapper).
 *
 * Schema shape:
 * {
 *   normal: { x, y, blur, spread, color, inset },
 *   hover:  { x, y, blur, spread, color, inset },
 *   transition: number (ms)
 * }
 *
 * CSS is generated automatically by cssRegistry["boxShadow"] in css.ts.
 * Safe to embed inside other controls (Border) without nested tab conflicts.
 */

const POSITION_OPTIONS = [
    { value: "false", label: "Outline" },
    { value: "true", label: "Inset" },
];

const DEFAULT_STATE = {
    x: 0,
    y: 0,
    blur: 0,
    spread: 0,
    color: "rgba(0,0,0,0.15)",
    inset: false,
};

function normalizeValue(value: any) {
    // Legacy flat format (no normal/hover keys)
    if (value && !value.normal && (value.x !== undefined || value.blur !== undefined)) {
        return {
            normal: { ...DEFAULT_STATE, ...value },
            hover: { ...DEFAULT_STATE },
            transition: 300,
        };
    }
    return {
        normal: { ...DEFAULT_STATE, ...(value?.normal || {}) },
        hover: { ...DEFAULT_STATE, ...(value?.hover || {}) },
        transition: value?.transition ?? 300,
    };
}

export default function BoxShadow({ value, onChange }: any) {
    const [tab, setTab] = useState<"normal" | "hover">("normal");

    const data = normalizeValue(value);
    const current = data[tab];

    const update = (field: string, v: any) =>
        onChange({ ...data, [tab]: { ...current, [field]: v } });

    return (
        <div>
            {/* ── Tab bar — own implementation, not nested inside Tabs ── */}
            <div className="flex border border-gray-200 rounded overflow-hidden mb-3">
                <button
                    type="button"
                    onClick={() => setTab("normal")}
                    className={`flex-1 py-2 text-xs font-medium border-none cursor-pointer text-gray-700 transition-colors ${tab === "normal" ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                        }`}
                >
                    Normal
                </button>
                <button
                    type="button"
                    onClick={() => setTab("hover")}
                    className={`flex-1 py-2 text-xs font-medium border-none cursor-pointer text-gray-700 transition-colors ${tab === "hover" ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                        }`}
                >
                    Hover
                </button>
            </div>

            <div className="space-y-3">
                {/* Color */}
                <ColorPickerPopup
                    label="Color"
                    value={current.color}
                    onChange={(c) => update("color", c)}
                />

                {/* Horizontal (X) */}
                <NumberControl
                    label="Horizontal"
                    value={current.x}
                    onChange={(v) => update("x", v)}
                    min={-200}
                    max={200}
                />

                {/* Vertical (Y) */}
                <NumberControl
                    label="Vertical"
                    value={current.y}
                    onChange={(v) => update("y", v)}
                    min={-200}
                    max={200}
                />

                {/* Blur */}
                <NumberControl
                    label="Blur"
                    value={current.blur}
                    onChange={(v) => update("blur", v)}
                    min={0}
                    max={200}
                />

                {/* Spread */}
                <NumberControl
                    label="Spread"
                    value={current.spread}
                    onChange={(v) => update("spread", v)}
                    min={-200}
                    max={200}
                />

                {/* Position */}
                <Select
                    label="Position"
                    value={String(current.inset)}
                    onChange={(v) => update("inset", v === "true")}
                    options={POSITION_OPTIONS}
                    grid={2}
                />

                {/* Transition Duration — Hover tab only */}
                {tab === "hover" && (
                    <div className="pt-3 border-t border-gray-100">
                        <NumberControl
                            label="Transition Duration"
                            unit="ms"
                            value={data.transition}
                            onChange={(v) => onChange({ ...data, transition: v })}
                            min={0}
                            max={2000}
                            step={50}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
