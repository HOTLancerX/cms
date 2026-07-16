"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Dimensions — unified 4-side spacing control.
 *
 * Props:
 *   type     : "margin" | "padding"   — used as default label when `label` is omitted
 *   label    : string (optional)      — overrides the derived label
 *   units    : string[] (optional)    — overrides the default unit list
 *   value    : { top, right, bottom, left, unit }
 *   onChange : (value) => void
 *
 * Behaviour:
 *   - Linked mode  : changing any side updates all four sides simultaneously.
 *   - unit "auto"  : numeric inputs are hidden (only in default unit set).
 *   - Defaults to linked when all four sides share the same value.
 */

const DEFAULT_UNITS = ["px", "%", "em", "rem", "vw", "vh", "ch", "auto"] as const;

const SIDES = [
    { key: "top", label: "Top" },
    { key: "right", label: "Right" },
    { key: "bottom", label: "Bottom" },
    { key: "left", label: "Left" },
] as const;

type Side = (typeof SIDES)[number]["key"];

interface SpacingValue {
    top: number | "";
    right: number | "";
    bottom: number | "";
    left: number | "";
    unit: string;
}

interface DimensionsProps {
    /** Which spacing property this instance controls (used as default label). */
    type: "margin" | "padding";
    /** Override the header label. */
    label?: string;
    /** Override the available units. When omitted, uses the full default list. */
    units?: readonly string[] | string[];
    value: Partial<SpacingValue> | null | undefined;
    onChange: (value: SpacingValue) => void;
}

export default function Dimensions({ type, label: labelProp, units: unitsProp, value, onChange }: DimensionsProps) {
    const units = unitsProp ?? DEFAULT_UNITS;

    const normalized: SpacingValue = {
        top: "",
        right: "",
        bottom: "",
        left: "",
        unit: units[0] ?? "px",
        ...(typeof value === "object" && value !== null ? value : {}),
    };

    const allSame =
        normalized.top === normalized.right &&
        normalized.right === normalized.bottom &&
        normalized.bottom === normalized.left;

    const [linked, setLinked] = useState(allSame);
    const [showUnits, setShowUnits] = useState(false);

    const isAuto = normalized.unit === "auto";
    const label = labelProp ?? (type === "margin" ? "Margin" : "Padding");

    // ── value helpers ──────────────────────────────────────────────────────────

    const update = (side: Side, raw: string) => {
        const num = raw === "" ? "" : Number(raw);
        if (linked) {
            onChange({ ...normalized, top: num, right: num, bottom: num, left: num });
        } else {
            onChange({ ...normalized, [side]: num });
        }
    };

    const changeUnit = (unit: string) => {
        if (unit === "auto") {
            onChange({ top: "", right: "", bottom: "", left: "", unit: "auto" });
        } else {
            onChange({ ...normalized, unit });
        }
        setShowUnits(false);
    };

    const toggleLink = () => {
        const next = !linked;
        setLinked(next);
        if (next) {
            onChange({
                ...normalized,
                right: normalized.top,
                bottom: normalized.top,
                left: normalized.top,
            });
        }
    };

    // ── render ─────────────────────────────────────────────────────────────────

    return (
        <div>
            {/* ── Header: label + unit selector + link toggle ── */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-gray-700">{label}</span>

                <div className="flex items-center gap-1">
                    {/* Unit selector */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowUnits(!showUnits)}
                            className="text-[11px] text-gray-500 hover:text-gray-700 p-1 border border-gray-200 rounded cursor-pointer bg-white flex items-center gap-0.5"
                            title="Change unit"
                        >
                            {normalized.unit}
                            <Icon icon="mdi:chevron-down" width="10" />
                        </button>

                        {showUnits && (
                            <div className="absolute top-full right-0 z-20 mt-1 bg-white border border-gray-200 min-w-[60px]">
                                {units.map((u) => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => changeUnit(u)}
                                        className={`block w-full px-3 py-1.5 text-xs text-left border-none cursor-pointer uppercase tracking-wide ${normalized.unit === u
                                                ? "bg-purple-50 text-fuchsia-600 font-semibold"
                                                : "bg-transparent text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        {u === "auto" ? "AUTO" : u.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Link toggle */}
                    <button
                        type="button"
                        onClick={toggleLink}
                        className={`flex items-center justify-center w-7 h-7 rounded border cursor-pointer transition-colors ${linked
                                ? "border-blue-300 bg-blue-50 text-blue-500"
                                : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                            }`}
                        title={linked ? "Unlink values" : "Link values"}
                    >
                        <Icon
                            icon={linked ? "solar:link-bold" : "solar:link-broken-bold"}
                            width="14"
                        />
                    </button>
                </div>
            </div>

            {/* ── Inputs row (hidden when unit is "auto") ── */}
            {!isAuto ? (
                <div className="grid grid-cols-4 gap-1">
                    {SIDES.map(({ key, label: sideLabel }) => (
                        <div key={key} className="flex-1 min-w-0">
                            <input
                                type="number"
                                value={normalized[key]}
                                onChange={(e) => update(key, e.target.value)}
                                placeholder="0"
                                className="w-full px-1.5 py-1.5 border border-gray-200 rounded text-[13px] text-center outline-none bg-white"
                            />
                            <span className="block text-center text-[10px] text-blue-400 font-medium mt-1">
                                {sideLabel}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[11px] text-gray-400 italic">
                    {label} is set to auto.
                </p>
            )}
        </div>
    );
}
