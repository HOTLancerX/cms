"use client";

import type { FieldProps } from "@/hook";

export function Select({ name, label, value, onChange, options = [] }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={name} className="text-xs font-semibold">
                {label}
            </label>
            <select
                id={name}
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
            >
                <option value="">{`Select ${label}`}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
