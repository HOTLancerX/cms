"use client";

interface Option {
    value: string;
    label: string;
}

interface Props {
    value: any;
    onChange: (v: string) => void;
    label?: string;
    options: Option[];
    placeholder?: string;
    grid?: 1 | 2;
}

export default function Select({ value, onChange, label, options, placeholder, grid = 1 }: Props) {
    const isInline = grid === 2;

    return (
        <div className={isInline ? "flex items-center justify-between gap-3" : ""}>
            {label && (
                <span className={`text-sm font-medium text-gray-700 ${isInline ? "whitespace-nowrap" : "block mb-1.5"}`}>
                    {label}
                </span>
            )}
            <select
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                className={`px-2 py-1 border border-gray-200 rounded text-sm outline-none bg-white cursor-pointer ${isInline ? "min-w-0" : "w-full"}`}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
