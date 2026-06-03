"use client";

import { Icon } from "@iconify/react";

/**
 * Wrap control — No Wrap / Wrap with icon buttons.
 * Click to select, click again to deselect (revert to nowrap).
 */

const OPTIONS = [
    { value: "nowrap", icon: "tabler:arrow-bar-right" },
    { value: "wrap", icon: "tabler:text-wrap" },
];

export default function Wrap({ value, onChange }: any) {
    const toggle = (v: string) => {
        onChange(value === v ? "nowrap" : v);
    };

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Wrap</span>
            <div className="flex gap-1 justify-end">
                {OPTIONS.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => toggle(o.value)}
                        className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${value === o.value
                                ? "bg-neutral-200 border-neutral-400"
                                : "border-neutral-200 hover:border-neutral-400"
                            }`}
                    >
                        <Icon icon={o.icon} width="16" />
                    </button>
                ))}
            </div>
        </div>
    );
}
