"use client";

import { Icon } from "@iconify/react";

interface Option {
    value: string;
    label: string;
}

interface Props {
    value: any;
    onChange: (v: string) => void;
    label?: string;
    options: Option[];
}

export default function RadioGroup({ value, onChange, label, options }: Props) {
    return (
        <div>
            {label && (
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[13px] font-medium text-gray-700">{label}</span>
                    <Icon icon="mdi:monitor" width="14" className="text-gray-400" />
                </div>
            )}
            <div className="flex flex-col gap-1.5">
                {options.map((opt) => (
                    <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-700"
                    >
                        <div
                            onClick={() => onChange(opt.value)}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${value === opt.value ? "border-blue-500" : "border-gray-300"
                                }`}
                        >
                            {value === opt.value && (
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                        </div>
                        <span onClick={() => onChange(opt.value)}>{opt.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
