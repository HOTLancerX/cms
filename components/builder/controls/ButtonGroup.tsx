"use client";

import { Icon } from "@iconify/react";

interface Option {
    value: string;
    label?: string;
    icon?: string;
}

interface Props {
    value: any;
    onChange: (v: string) => void;
    label?: string;
    options: Option[];
    /** If true, clicking the selected option deselects it (reverts to defaultValue or "") */
    deselectable?: boolean;
    defaultValue?: string;
    grid?: 1 | 2;
}

export default function ButtonGroup({ value, onChange, label, options, deselectable = true, defaultValue = "", grid = 1 }: Props) {
    const handleClick = (v: string) => {
        if (deselectable && value === v) {
            onChange(defaultValue);
        } else {
            onChange(v);
        }
    };

    const isInline = grid === 2;

    return (
        <div className={isInline ? "flex items-center justify-between gap-3" : ""}>
            {label && (
                <span className={`text-sm font-medium text-gray-700 ${isInline ? "whitespace-nowrap" : "block mb-1.5"}`}>
                    {label}
                </span>
            )}
            <div className="flex gap-0.5">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleClick(opt.value)}
                        className={`flex items-center justify-center gap-1 h-7 border border-gray-200 rounded-[3px] cursor-pointer text-[11px] font-medium transition-colors ${value === opt.value ? "bg-gray-200 text-gray-900" : "bg-white text-gray-500"
                            } ${opt.icon && !opt.label ? "w-7 p-0" : "px-2.5 py-1"}`}
                        title={opt.label || opt.value}
                    >
                        {opt.icon && <Icon icon={opt.icon} width="15" />}
                        {opt.label && !opt.icon && opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
