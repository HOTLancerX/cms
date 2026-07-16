"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Row, Device } from "../types";
import { getDeviceValue, setDeviceValue } from "../device";
import rowElement from "../elements/row";
import { mergeControls } from "../controls/common";
import Section from "../controls/group/Section";

interface Props {
    row: Row;
    device: Device;
    onChange: (row: Row) => void;
}

export default function RowControls({ row, device, onChange }: Props) {
    const [activeTab, setActiveTab] = useState("Layout");

    const allControls = mergeControls(rowElement.controls);

    const tabs = [...new Set(allControls.map((c) => c.tab))];
    const sections = allControls.filter((c) => c.tab === activeTab);

    const getValue = (name: string): any => {
        const schema = row.schema as any;
        if (schema.style && name in schema.style) {
            return getDeviceValue(schema.style[name], device);
        }
        if (schema.advanced && name in schema.advanced) {
            return getDeviceValue(schema.advanced[name], device);
        }
        for (const key of ["layout", "style", "advanced"]) {
            if (schema[key] && name in schema[key]) {
                return getDeviceValue(schema[key][name], device);
            }
        }
        return undefined;
    };

    const updateValue = (name: string, value: any, responsive: boolean) => {
        const updated = JSON.parse(JSON.stringify(row)) as Row;
        const schema = updated.schema as any;

        // Fallback for common style controls to ensure they are always written under style group
        const isStyleField = ["background", "backgroundOverlay", "border"].includes(name);
        if (isStyleField) {
            if (!schema.style) schema.style = {};
            schema.style[name] = responsive
                ? setDeviceValue(schema.style[name], device, value)
                : setDeviceValue(schema.style[name], "desktop", value);
            onChange(updated);
            return;
        }

        // Fallback for common advanced controls to ensure they are always written under advanced group
        let isAdvancedField = false;
        for (const section of allControls) {
            if (section.tab === "Advanced") {
                if (section.controls.some((c) => c.name === name)) {
                    isAdvancedField = true;
                    break;
                }
            }
        }
        if (isAdvancedField) {
            if (!schema.advanced) schema.advanced = {};
            schema.advanced[name] = responsive
                ? setDeviceValue(schema.advanced[name], device, value)
                : setDeviceValue(schema.advanced[name], "desktop", value);
            onChange(updated);
            return;
        }

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

    return (
        <div>
            {/* Tabs */}
            <div className="grid grid-cols-3 border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 p-2 text-xs font-medium border-b-2 bg-transparent cursor-pointer ${activeTab === tab
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Sections */}
            <div className="p-2 space-y-1">
                {sections.map((section) => (
                    <Section key={section.section} label={section.section} defaultOpen={true}>
                        {section.controls.map((ctrl) => {
                            if (ctrl.condition && !ctrl.condition(row.schema)) return null;
                            const value = getValue(ctrl.name);
                            const isResponsive = ctrl.responsive === true;
                            return (
                                <div key={ctrl.name} className="mb-3">
                                    {isResponsive && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Icon icon="mdi:monitor" width="12" className="text-gray-400" />
                                        </div>
                                    )}
                                    {ctrl.render(value, (v: any) => updateValue(ctrl.name, v, isResponsive))}
                                </div>
                            );
                        })}
                    </Section>
                ))}
            </div>
        </div>
    );
}
