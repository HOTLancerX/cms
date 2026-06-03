"use client";

import { useState } from "react";

interface Tab {
    label: string;
    content: React.ReactNode;
}

interface Props {
    tabs: Tab[];
    defaultTab?: number;
}

/**
 * Tabs group control — renders a NORMAL/HOVER style tab switcher
 * that shows different content per tab.
 *
 * Usage in an element definition:
 * ```
 * <Tabs tabs={[
 *   { label: "NORMAL", content: <ColorPickerPopup ... /> },
 *   { label: "HOVER", content: <ColorPickerPopup ... /> },
 * ]} />
 * ```
 */
export default function Tabs({ tabs, defaultTab = 0 }: Props) {
    const [active, setActive] = useState(defaultTab);

    return (
        <div>
            {/* Tab headers */}
            <div className="flex border border-gray-200 rounded overflow-hidden mb-3">
                {tabs.map((tab, idx) => (
                    <button
                        key={tab.label}
                        type="button"
                        onClick={() => setActive(idx)}
                        className={`flex-1 py-2 text-xs font-medium border-none cursor-pointer text-gray-700 transition-colors ${active === idx
                                ? "bg-gray-100"
                                : "bg-white hover:bg-gray-50"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="space-y-3">
                {tabs[active]?.content}
            </div>
        </div>
    );
}
