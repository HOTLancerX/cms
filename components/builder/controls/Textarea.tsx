"use client";

import { Icon } from "@iconify/react";

interface Props {
    value: any;
    onChange: (v: string) => void;
    label?: string;
    placeholder?: string;
    rows?: number;
}

export default function Textarea({ value, onChange, label, placeholder, rows = 4 }: Props) {
    return (
        <div>
            {label && (
                <span className="text-[13px] font-medium text-gray-700">{label}</span>
            )}
            <textarea
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || ""}
                rows={rows}
                className="w-full px-2.5 py-2 border border-gray-200 rounded text-[13px] outline-none resize-y font-[inherit]"
            />
        </div>
    );
}
