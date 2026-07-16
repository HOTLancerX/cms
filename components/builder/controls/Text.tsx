"use client";

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
                <span className="text-sm text-gray-500">{label}</span>
            )}
            <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || ""}
                className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
            />
        </div>
    );
}
