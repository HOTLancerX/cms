"use client";

import type { FieldProps } from "@/hook";

export function Checkbox({ name, label, value, onChange, options = [] }: FieldProps) {
    const selected = value ? value.split(",").filter(Boolean) : [];

    const toggle = (val: string) => {
        const next = selected.includes(val)
            ? selected.filter((v) => v !== val)
            : [...selected, val];
        onChange(next.join(","));
    };

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">
                {label}
            </span>
            <div className="flex flex-wrap gap-3">
                {options.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                            type="checkbox"
                            name={name}
                            value={opt.value}
                            checked={selected.includes(opt.value)}
                            onChange={() => toggle(opt.value)}
                            className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                        />
                        {opt.label}
                    </label>
                ))}
            </div>
        </div>
    );
}
