"use client";

import { Icon } from "@iconify/react";

/**
 * Flex control — Elementor-style
 * - Direction: row | column | row-reverse | column-reverse
 * - Justify Content: 6 options (direction-aware icons)
 * - Align Items: 4 options (direction-aware icons)
 *
 * Toggle behavior:
 * - Click to select
 * - Click again to deselect (reverts to `defaults[field]` or "" if not provided)
 *
 * Props:
 * - value: { direction, justifyContent, alignItems }
 * - onChange: (newValue) => void
 * - defaults?: { direction?, justifyContent?, alignItems? } — what to revert to on deselect
 */

const DIRECTIONS = [
    { value: "row", icon: "mdi:arrow-right" },
    { value: "column", icon: "mdi:arrow-down" },
    { value: "row-reverse", icon: "mdi:arrow-left" },
    { value: "column-reverse", icon: "mdi:arrow-up" },
];

const JUSTIFY_ROW = [
    { value: "flex-start", icon: "tabler:layout-align-left" },
    { value: "center", icon: "tabler:layout-align-center" },
    { value: "flex-end", icon: "tabler:layout-align-right" },
    { value: "space-between", icon: "tabler:layout-distribute-horizontal" },
    { value: "space-around", icon: "tabler:spacing-horizontal" },
    { value: "space-evenly", icon: "tabler:layout-board-split" },
];

const JUSTIFY_COLUMN = [
    { value: "flex-start", icon: "tabler:layout-align-top" },
    { value: "center", icon: "tabler:layout-align-middle" },
    { value: "flex-end", icon: "tabler:layout-align-bottom" },
    { value: "space-between", icon: "tabler:layout-distribute-vertical" },
    { value: "space-around", icon: "tabler:spacing-vertical" },
    { value: "space-evenly", icon: "tabler:layout-rows" },
];

const ALIGN_ROW = [
    { value: "flex-start", icon: "tabler:layout-align-top" },
    { value: "center", icon: "tabler:layout-align-middle" },
    { value: "flex-end", icon: "tabler:layout-align-bottom" },
    { value: "stretch", icon: "tabler:arrows-vertical" },
];

const ALIGN_COLUMN = [
    { value: "flex-start", icon: "tabler:layout-align-left" },
    { value: "center", icon: "tabler:layout-align-center" },
    { value: "flex-end", icon: "tabler:layout-align-right" },
    { value: "stretch", icon: "tabler:arrows-horizontal" },
];

interface FlexProps {
    value: any;
    onChange: (v: any) => void;
    defaults?: {
        direction?: string;
        justifyContent?: string;
        alignItems?: string;
    };
}

export default function Flex({ value, onChange, defaults }: FlexProps) {
    const fallback = {
        direction: defaults?.direction ?? "",
        justifyContent: defaults?.justifyContent ?? "",
        alignItems: defaults?.alignItems ?? "",
    };

    const current = {
        direction: "row",
        justifyContent: "flex-start",
        alignItems: "stretch",
        ...value,
    };

    const isColumn =
        current.direction === "column" || current.direction === "column-reverse";

    const justifyOptions = isColumn ? JUSTIFY_COLUMN : JUSTIFY_ROW;
    const alignOptions = isColumn ? ALIGN_COLUMN : ALIGN_ROW;

    const update = (field: string, fieldValue: string) => {
        // Toggle: if already selected → revert to fallback
        const newValue = current[field] === fieldValue ? fallback[field as keyof typeof fallback] : fieldValue;
        onChange({ ...current, [field]: newValue });
    };

    return (
        <div>
            {/* Direction */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-gray-700">Direction</span>
                    <div className="flex gap-0.5">
                        {DIRECTIONS.map((d) => (
                            <button
                                key={d.value}
                                type="button"
                                onClick={() => update("direction", d.value)}
                                className={`flex items-center justify-center w-7 h-7 rounded-[3px] border border-gray-200 cursor-pointer transition-colors ${current.direction === d.value ? "bg-gray-200" : "bg-white"
                                    }`}
                            >
                                <Icon icon={d.icon} width="15" className={current.direction === d.value ? "text-gray-900" : "text-gray-500"} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Justify Content */}
            <div className="mb-4">
                <span className="text-[13px] font-medium text-gray-700">Justify Content</span>
                <div className="grid grid-cols-6 border border-gray-200 rounded overflow-hidden">
                    {justifyOptions.map((j, i) => (
                        <button
                            key={j.value}
                            type="button"
                            onClick={() => update("justifyContent", j.value)}
                            className={`flex items-center justify-center h-8 cursor-pointer transition-colors border-none ${i > 0 ? "border-l border-gray-200" : ""
                                } ${current.justifyContent === j.value ? "bg-gray-100" : "bg-white"}`}
                            style={i > 0 ? { borderLeft: "1px solid #e5e7eb" } : undefined}
                        >
                            <Icon icon={j.icon} width="16" className={current.justifyContent === j.value ? "text-gray-900" : "text-gray-500"} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Align Items */}
            <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-gray-700">Align Items</span>
                    <div className="flex gap-0.5">
                        {alignOptions.map((a) => (
                            <button
                                key={a.value}
                                type="button"
                                onClick={() => update("alignItems", a.value)}
                                className={`flex items-center justify-center w-7 h-7 rounded-[3px] border border-gray-200 cursor-pointer transition-colors ${current.alignItems === a.value ? "bg-gray-200" : "bg-white"
                                    }`}
                            >
                                <Icon icon={a.icon} width="15" className={current.alignItems === a.value ? "text-gray-900" : "text-gray-500"} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
