"use client";

import { Icon } from "@iconify/react";

interface Props {
    value: any;
    onChange: (v: string) => void;
    label?: string;
    placeholder?: string;
}

export default function Text({ value, onChange, label, placeholder }: Props) {
    return (
        <div>
            {label && (
                <span className="text-sm font-medium text-gray-700">{label}</span>
            )}
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || ""}
                className="w-full px-2.5 py-2 border border-gray-200 rounded text-[13px] outline-none"
            />
        </div>
    );
}
