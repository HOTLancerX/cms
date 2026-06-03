"use client";

import { COLUMN_PRESETS, ColumnPreset, PresetColumn } from "../types";

interface Props {
    onSelect: (preset: PresetColumn[]) => void;
}

/** Recursive mini-thumbnail for a single preset column (supports nested children). */
function PresetColThumb({ col }: { col: PresetColumn }) {
    const w = col.widths.desktop;
    if (col.children && col.children.length > 0) {
        return (
            <div
                className="flex flex-col gap-[2px] h-7"
                style={{ flex: `0 0 ${w}%`, maxWidth: `${w}%` }}
            >
                {col.children.map((child, i) => (
                    <div
                        key={i}
                        className="rounded-sm bg-slate-300 flex-1"
                        style={{ width: "100%" }}
                    />
                ))}
            </div>
        );
    }
    return (
        <div
            className="h-7 rounded-sm bg-slate-300"
            style={{ flex: `0 0 ${w}%`, maxWidth: `${w}%` }}
        />
    );
}

/** Visual thumbnail for a full preset. */
function PresetThumb({ preset }: { preset: ColumnPreset }) {
    return (
        <div className="flex gap-[2px] w-full h-7">
            {preset.cols.map((col, i) => (
                <PresetColThumb key={i} col={col} />
            ))}
        </div>
    );
}

export default function ColumnsPanel({ onSelect }: Props) {
    return (
        <div>
            <h3 className="text-[13px] font-semibold text-gray-700 mb-3">
                Select Column Layout
            </h3>
            <div className="grid grid-cols-3 gap-2">
                {COLUMN_PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        type="button"
                        title={preset.label}
                        onClick={() => onSelect(preset.cols)}
                        className="flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                        <PresetThumb preset={preset} />
                    </button>
                ))}
            </div>
        </div>
    );
}
