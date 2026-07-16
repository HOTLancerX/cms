"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

interface Props {
    label: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

/**
 * Collapsible section control — use inside element control render functions
 * to group multiple sub-controls under a clickable accordion header.
 *
 * Usage in an element definition:
 * ```
 * {
 *   name: "spacing",
 *   render: (value, onChange) => (
 *     <Section label="Spacing" defaultOpen={false}>
 *       <Margin value={value.margin} onChange={(v) => onChange({ ...value, margin: v })} />
 *       <Padding value={value.padding} onChange={(v) => onChange({ ...value, padding: v })} />
 *     </Section>
 *   ),
 * }
 * ```
 */
export default function Section({ label, defaultOpen = false, children }: Props) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-100 bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:border-gray-200/80 mb-3">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between w-full px-4 py-3 bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50/50 border-none cursor-pointer transition-all duration-200 select-none text-left"
            >
                <span className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase">{label}</span>
                <Icon
                    icon="mdi:chevron-down"
                    width="18"
                    className={`text-gray-400 transition-transform duration-300 ${open ? "rotate-180 text-fuchsia-500" : ""}`}
                />
            </button>
            {open && (
                <div className="p-4 space-y-4 border-t border-gray-100 bg-white animate-[fadeSlideIn_0.2s_ease-out]">
                    {children}
                </div>
            )}
        </div>
    );
}
