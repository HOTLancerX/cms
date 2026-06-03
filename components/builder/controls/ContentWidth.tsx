"use client";

import { Icon } from "@iconify/react";

export default function ContentWidth({ value, onChange }: any) {
    const options = [
        { label: "Boxed", value: "boxed", icon: "mdi:monitor" },
        { label: "Full Width", value: "full", icon: "mdi:arrow-expand" },
    ];

    return (
        <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium text-gray-700">Content Width</span>
            <div className="flex gap-0.5">
                {options.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onChange(value === item.value ? "" : item.value)}
                        className={`flex items-center justify-center w-7 h-7 border rounded cursor-pointer transition-colors ${value === item.value
                                ? "border-gray-300 bg-gray-100"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                        title={item.label}
                    >
                        <Icon
                            icon={item.icon}
                            width="16"
                            className={value === item.value ? "text-gray-900" : "text-gray-500"}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
