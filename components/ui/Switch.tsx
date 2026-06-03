"use client";

import type { FieldProps } from "@/hook";

export function Switch({ name, label, value, onChange }: FieldProps) {
    const checked = value === "true";

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={name} className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                    <input
                        id={name}
                        name={name}
                        type="checkbox"
                        role="switch"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
                        className="sr-only peer"
                    />
                    <div className="w-10 h-6 rounded-full bg-[#2e3450] border border-[#2e3450] transition peer-checked:bg-indigo-500 peer-checked:border-indigo-500 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40" />
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-400 transition peer-checked:translate-x-4 peer-checked:bg-white" />
                </div>
                <span className="text-xs font-semibold">
                    {label}
                </span>
            </label>
        </div>
    );
}
