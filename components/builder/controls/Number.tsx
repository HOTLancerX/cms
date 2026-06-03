"use client";

import { useState } from "react";

interface Props {
    value: any;
    onChange: (v: number) => void;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    units?: string[];
    onUnitChange?: (u: string) => void;
    showSlider?: boolean;
    grid?: 1 | 2;
}

export default function NumberControl({
    value,
    onChange,
    label,
    min = 0,
    max = 999,
    step = 1,
    unit,
    units,
    onUnitChange,
    showSlider = true,
    grid,
}: Props) {
    const [showUnits, setShowUnits] = useState(false);
    const isInline = grid === 2;

    return (
        <div className={isInline ? "flex items-center justify-between gap-3" : ""}>
            {label && (
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-gray-700">{label}</span>
                    {units ? (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowUnits(!showUnits)}
                                className="text-[11px] font-semibold text-fuchsia-500 bg-transparent border-none cursor-pointer"
                            >
                                {unit || units[0]}
                            </button>
                            {showUnits && (
                                <div className="absolute top-full right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[50px]">
                                    {units.map((u) => (
                                        <button
                                            key={u}
                                            type="button"
                                            onClick={() => { onUnitChange?.(u); setShowUnits(false); }}
                                            className={`block w-full px-3 py-1.5 text-[12px] border-none cursor-pointer text-left ${unit === u ? "bg-purple-50 text-fuchsia-500 font-semibold" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : unit ? (
                        <span className="text-[11px] text-fuchsia-500 font-semibold">{unit}</span>
                    ) : null}
                </div>
            )}
            <div className="flex items-center gap-2">
                {showSlider && (
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value ?? 0}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="flex-1 accent-gray-700"
                    />
                )}
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value ?? 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={`px-2 py-1.5 border border-gray-200 rounded text-xs text-center outline-none ${showSlider ? "w-14" : "w-full"}`}
                />
            </div>
        </div>
    );
}
