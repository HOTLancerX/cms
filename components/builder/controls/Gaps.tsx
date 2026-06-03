"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import NumberControl from "./Number";

/**
 * Gaps control — Column gap + Row gap with link toggle and unit selector.
 *
 * value: { column: number, row: number, unit: string }
 */

const SIZE_UNITS = ["px", "em", "rem", "vw", "%"] as const;

export default function Gaps({ value, onChange }: any) {
    const normalized =
        typeof value === "object" && value !== null
            ? { column: value.column ?? 0, row: value.row ?? 0, unit: value.unit ?? "px" }
            : { column: value ?? 0, row: value ?? 0, unit: "px" };

    const [linked, setLinked] = useState(normalized.column === normalized.row);
    const [showUnits, setShowUnits] = useState(false);

    const update = (field: "column" | "row", v: number) => {
        if (linked) {
            onChange({ ...normalized, column: v, row: v });
        } else {
            onChange({ ...normalized, [field]: v });
        }
    };

    const changeUnit = (u: string) => {
        onChange({ ...normalized, unit: u });
        setShowUnits(false);
    };

    const toggleLink = () => {
        const next = !linked;
        setLinked(next);
        if (next) {
            onChange({ ...normalized, row: normalized.column });
        }
    };

    return (
        <div>
            {/* Header: label + unit selector */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-gray-700">Gaps</span>
                <div className="flex items-center gap-1">
                    {/* Link toggle */}
                    <button
                        type="button"
                        onClick={toggleLink}
                        className={`flex items-center justify-center w-6 h-6 rounded border cursor-pointer transition-colors ${linked
                                ? "border-blue-300 bg-blue-50 text-blue-500"
                                : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                            }`}
                        title={linked ? "Unlink gaps" : "Link gaps"}
                    >
                        <Icon icon={linked ? "solar:link-bold" : "solar:link-broken-bold"} width="12" />
                    </button>

                    {/* Unit selector */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowUnits(!showUnits)}
                            className="text-[11px] font-semibold text-fuchsia-500 bg-transparent border-none cursor-pointer px-1"
                        >
                            {normalized.unit}
                        </button>
                        {showUnits && (
                            <div className="absolute top-full right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[50px]">
                                {SIZE_UNITS.map((u) => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => changeUnit(u)}
                                        className={`block w-full px-3 py-1.5 text-[12px] border-none cursor-pointer text-left ${normalized.unit === u
                                                ? "bg-purple-50 text-fuchsia-500 font-semibold"
                                                : "bg-transparent text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        {u}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Column gap */}
            <div className="mb-3">
                <NumberControl
                    label="Column"
                    value={normalized.column}
                    onChange={(v) => update("column", v)}
                    min={0}
                    max={200}
                    unit={normalized.unit}
                />
            </div>

            {/* Row gap — hidden when linked (mirrors column) */}
            {!linked && (
                <NumberControl
                    label="Row"
                    value={normalized.row}
                    onChange={(v) => update("row", v)}
                    min={0}
                    max={200}
                    unit={normalized.unit}
                />
            )}
        </div>
    );
}
