"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Column, Device } from "../types";
import { getDeviceValue, setDeviceValue, getColumnWidth } from "../device";
import columnElement from "../elements/column";

interface Props {
    column: Column;
    device: Device;
    onChange: (column: Column) => void;
}

export default function ColumnControls({ column, device, onChange }: Props) {
    const [activeTab, setActiveTab] = useState("Layout");

    const tabs = [...new Set(columnElement.controls.map((c) => c.tab))];
    const sections = columnElement.controls.filter((c) => c.tab === activeTab);

    const getValue = (name: string): any => {
        const schema = column.schema as any;
        for (const key of ["layout", "style", "advanced"]) {
            if (schema[key] && name in schema[key]) {
                return getDeviceValue(schema[key][name], device);
            }
        }
        return undefined;
    };

    const updateValue = (name: string, value: any, responsive: boolean) => {
        const updated = JSON.parse(JSON.stringify(column)) as Column;
        const schema = updated.schema as any;
        for (const key of ["layout", "style", "advanced"]) {
            if (schema[key] && name in schema[key]) {
                // Responsive controls write per-device; non-responsive always write desktop
                schema[key][name] = responsive
                    ? setDeviceValue(schema[key][name], device, value)
                    : setDeviceValue(schema[key][name], "desktop", value);
                onChange(updated);
                return;
            }
        }
    };

    /** Write column width for the active device into col.widths */
    const updateColumnWidth = (w: number) => {
        const updated = JSON.parse(JSON.stringify(column)) as Column;
        if (!updated.widths) {
            // Migrate legacy flat width to widths object
            updated.widths = { desktop: updated.width, tablet: updated.width, mobile: 100 };
        }
        updated.widths[device] = w;
        // Keep legacy width in sync with desktop
        if (device === "desktop") updated.width = w;
        onChange(updated);
    };

    // Current width for the active device
    const currentWidth = getColumnWidth(column, device);

    return (
        <div>
            {/* Tabs */}
            <div className="grid grid-cols-3 border-b border-neutral-200">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`p-2 text-xs font-medium border-b-2 bg-transparent cursor-pointer ${activeTab === tab
                                ? "border-emerald-500 text-emerald-600"
                                : "border-transparent text-neutral-500"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="p-3">
                {/* Column Width — device-aware */}
                {activeTab === "Layout" && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-neutral-700">Width</span>
                                {/* Device indicator — always shown since width is always responsive */}
                                <Icon icon={device === "mobile" ? "mdi:cellphone" : device === "tablet" ? "mdi:tablet" : "mdi:monitor"} width="13" className="text-neutral-400" />
                            </div>
                            <span className="text-[11px] font-semibold text-fuchsia-500">%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min={5}
                                max={100}
                                step={0.5}
                                value={currentWidth}
                                onChange={(e) => updateColumnWidth(Number(e.target.value))}
                                className="flex-1 accent-neutral-700"
                            />
                            <input
                                type="number"
                                min={5}
                                max={100}
                                step={0.5}
                                value={currentWidth}
                                onChange={(e) => updateColumnWidth(Number(e.target.value))}
                                className="w-16 px-2 py-1 text-center text-sm border border-neutral-200 rounded outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Sections from element definition */}
                {sections.map((section) => (
                    <div key={section.section} className="mb-2">
                        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                            {section.section}
                        </h4>
                        {section.controls.map((ctrl) => {
                            const value = getValue(ctrl.name);
                            const isResponsive = ctrl.responsive === true;
                            return (
                                <div key={ctrl.name} className="mb-3">
                                    {/* Device indicator badge for responsive controls */}
                                    {isResponsive && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Icon icon={device === "mobile" ? "mdi:cellphone" : device === "tablet" ? "mdi:tablet" : "mdi:monitor"} width="12" className="text-neutral-400" />
                                        </div>
                                    )}
                                    {ctrl.render(value, (v: any) => updateValue(ctrl.name, v, isResponsive))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
