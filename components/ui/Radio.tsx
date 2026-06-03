"use client";

import type { FieldProps } from "@/hook";

export function Radio({ name, label, value, onChange, options = [] }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">
                {label}
            </span>
            <div className="flex flex-wrap gap-3">
                {options.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                            type="radio"
                            name={name}
                            value={opt.value}
                            checked={value === opt.value}
                            onChange={() => onChange(opt.value)}
                            className="w-4 h-4 accent-indigo-500 cursor-pointer"
                        />
                        {opt.label}
                    </label>
                ))}
            </div>
        </div>
    );
}
