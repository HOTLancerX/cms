"use client";

import type { FieldProps } from "@/hook";

export function Number({ name, label, value, onChange }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-xs font-semibold">
                {label}
            </label>
            <input
                id={name}
                name={name}
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                placeholder={label}
            />
        </div>
    );
}