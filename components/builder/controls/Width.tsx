"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Width control with unit selector (px, %, em, rem, vw, custom).
 * value: { value: number, unit: string } OR number (legacy — treated as px)
 */

const UNITS = ["px", "%", "em", "rem", "vw"];

const UNIT_RANGES: Record<string, { min: number; max: number; step: number }> = {
    px: { min: 0, max: 1920, step: 1 },
    "%": { min: 0, max: 100, step: 1 },
    em: { min: 0, max: 120, step: 0.1 },
    rem: { min: 0, max: 120, step: 0.1 },
    vw: { min: 0, max: 100, step: 1 },
};

export default function Width({ value, onChange }: any) {
    // Normalize value
    const normalized =
        typeof value === "object" && value !== null
            ? { value: value.value ?? 1200, unit: value.unit ?? "px" }
            : { value: value ?? 1200, unit: "px" };

    const [showUnits, setShowUnits] = useState(false);

    const range = UNIT_RANGES[normalized.unit] || UNIT_RANGES.px;

    const update = (v: number) => {
        onChange({ value: v, unit: normalized.unit });
    };

    const changeUnit = (unit: string) => {
        // Reset value to sensible default for new unit
        const defaults: Record<string, number> = {
            px: 1200,
            "%": 100,
            em: 75,
            rem: 75,
            vw: 100,
        };
        onChange({ value: defaults[unit] ?? 100, unit });
        setShowUnits(false);
    };

    return (
        <div>
            {/* Label row */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-gray-700">Width</span>

                {/* Unit selector */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowUnits(!showUnits)}
                        className="text-xs font-semibold text-fuchsia-500 bg-transparent border-none cursor-pointer"
                    >
                        {normalized.unit}
                    </button>

                    {showUnits && (
                        <div className="absolute top-full right-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[50px]">
                            {UNITS.map((u) => (
                                <button
                                    key={u}
                                    type="button"
                                    onClick={() => changeUnit(u)}
                                    className={`block w-full px-3 py-1 text-xs text-left border-none cursor-pointer ${normalized.unit === u ? "bg-purple-50 text-fuchsia-500" : "bg-transparent text-gray-700"
                                        }`}
                                >
                                    {u}
                                </button>
                            ))}
                            {/* Custom (pen icon) */}
                            <button
                                type="button"
                                onClick={() => setShowUnits(false)}
                                className="flex items-center justify-center w-full px-3 py-1 bg-transparent border-none cursor-pointer text-gray-500"
                            >
                                <Icon icon="mdi:pencil" width="14" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Slider + input */}
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={normalized.value}
                    onChange={(e) => update(Number(e.target.value))}
                    className="flex-1 accent-gray-700"
                />
                <input
                    type="number"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={normalized.value}
                    onChange={(e) => update(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-[13px] border border-gray-200 rounded text-center outline-none"
                />
            </div>
        </div>
    );
}
