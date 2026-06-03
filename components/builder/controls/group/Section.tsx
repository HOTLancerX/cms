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
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 w-full px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border-none cursor-pointer transition-colors"
            >
                <Icon
                    icon="mdi:chevron-right"
                    width="16"
                    className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                />
                <span className="text-[13px] font-medium text-gray-700">{label}</span>
            </button>
            {open && (
                <div className="p-3 space-y-3 border-t border-gray-200">
                    {children}
                </div>
            )}
        </div>
    );
}
