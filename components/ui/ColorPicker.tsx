"use client";

import type { FieldProps } from "@/hook";

/** Inline colour swatch + hex input — value is a CSS colour string */
export function ColorPicker({ name, label, value, onChange }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={`${name}-text`} className="text-xs font-semibold">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    id={name}
                    type="color"
                    value={value || "#000000"}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-9 h-9 rounded-lg border cursor-pointer p-0.5 shrink-0"
                    title={label}
                />
                <input
                    id={`${name}-text`}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000 or rgba(...)"
                    className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-indigo-500 font-mono"
                />
            </div>
        </div>
    );
}
