"use client";

import { Icon } from "@iconify/react";

interface Option {
    value: string;
    label: string;
}

interface Props {
    value: any; // string[] array of selected values
    onChange: (v: string[]) => void;
    label?: string;
    options: Option[];
}

export default function CheckboxGroup({ value, onChange, label, options }: Props) {
    const selected: string[] = Array.isArray(value) ? value : [];

    const toggle = (v: string) => {
        if (selected.includes(v)) {
            onChange(selected.filter((s) => s !== v));
        } else {
            onChange([...selected, v]);
        }
    };

    return (
        <div>
            {label && (
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[13px] font-medium text-gray-700">{label}</span>
                    <Icon icon="mdi:monitor" width="14" className="text-gray-400" />
                </div>
            )}
            <div className="flex flex-col gap-1.5">
                {options.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                        <label
                            key={opt.value}
                            className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-700"
                        >
                            <div
                                onClick={() => toggle(opt.value)}
                                className={`w-4 h-4 rounded-[3px] border-2 flex items-center justify-center cursor-pointer transition-colors ${checked ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
                                    }`}
                            >
                                {checked && <Icon icon="mdi:check" width="12" className="text-white" />}
                            </div>
                            <span onClick={() => toggle(opt.value)}>{opt.label}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
