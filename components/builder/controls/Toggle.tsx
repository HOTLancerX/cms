"use client";

import { Icon } from "@iconify/react";

interface Props {
    value: any; // boolean
    onChange: (v: boolean) => void;
    label?: string;
}

export default function Toggle({ value, onChange, label }: Props) {
    const isOn = !!value;

    return (
        <div className="flex items-center justify-between">
            {label && (
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-gray-700">{label}</span>
                    <Icon icon="mdi:monitor" width="14" className="text-gray-400" />
                </div>
            )}
            <button
                type="button"
                onClick={() => onChange(!isOn)}
                className={`relative w-[38px] h-5 rounded-[10px] border-none cursor-pointer transition-colors ${isOn ? "bg-blue-500" : "bg-gray-300"}`}
            >
                <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-[left] ${isOn ? "left-5" : "left-0.5"}`}
                />
            </button>
        </div>
    );
}
