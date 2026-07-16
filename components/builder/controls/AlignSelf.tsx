"use client";

import { Icon } from "@iconify/react";

const OPTIONS = [
  { value: "auto", icon: "tabler:circle-dashed", label: "Auto" },
  { value: "flex-start", icon: "tabler:layout-align-top", label: "Start" },
  { value: "center", icon: "tabler:layout-align-middle", label: "Center" },
  { value: "flex-end", icon: "tabler:layout-align-bottom", label: "End" },
  { value: "stretch", icon: "tabler:arrows-vertical", label: "Stretch" },
];

export default function AlignSelf({ value, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">Align Self</span>
      <div className="flex gap-0.5 border border-gray-200 rounded p-0.5 bg-white">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(value === o.value ? "auto" : o.value)}
            title={o.label}
            className={`flex items-center justify-center w-7 h-7 rounded-[3px] cursor-pointer transition-colors ${
              value === o.value
                ? "bg-gray-200 text-gray-900"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Icon icon={o.icon} width="16" />
          </button>
        ))}
      </div>
    </div>
  );
}