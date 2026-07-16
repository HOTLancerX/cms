"use client";

import { useState } from "react";
import { BuilderElement, Device } from "../types";
import { getDeviceValue, setDeviceValue } from "../device";
import { getElementDef } from "../helpers";
import { commonAdvancedControls, mergeControls } from "../controls/common";
import Section from "../controls/group/Section";

interface Props {
    element: BuilderElement;
    device: Device;
    onChange: (schema: Record<string, any>) => void;
}

export default function ElementControls({ element, device, onChange }: Props) {
    const def = getElementDef(element.type);

    if (!def) return <div className="p-4 text-red-500">Unknown element type</div>;

    const allControls = mergeControls(def.controls);

    const tabs = [...new Set(allControls.map((c) => c.tab))];
    const [activeTab, setActiveTab] = useState(tabs[0] || "Layout");
    const sections = allControls.filter((c) => c.tab === activeTab);

    const updateValue = (controlName: string, value: any) => {
        const updated = JSON.parse(JSON.stringify(element.schema));

        // Find which group this control belongs to
        const writeValue = (schema: any, key: string) => {
            // Check if the control is marked responsive in the element definition
            let isResponsive = false;
            for (const section of allControls) {
                for (const ctrl of section.controls) {
                    if (ctrl.name === controlName) {
                        isResponsive = ctrl.responsive === true;
                        break;
                    }
                }
            }
            schema[key][controlName] = isResponsive
                ? setDeviceValue(schema[key][controlName], device, value)
                : value; // non-responsive: write flat, no device wrapper
            onChange(schema);
        };

        // Fallback for common style controls to ensure they are always written under style group
        const isStyleField = ["background", "backgroundOverlay", "border"].includes(controlName);
        if (isStyleField) {
            if (!updated.style) updated.style = {};
            writeValue(updated, "style");
            return;
        }

        // Fallback for common advanced controls to ensure they are always written under advanced group
        let isAdvancedField = false;
        for (const section of allControls) {
            if (section.tab === "Advanced") {
                if (section.controls.some((c) => c.name === controlName)) {
                    isAdvancedField = true;
                    break;
                }
            }
        }
        if (isAdvancedField) {
            if (!updated.advanced) updated.advanced = {};
            writeValue(updated, "advanced");
            return;
        }

        for (const key of Object.keys(updated)) {
            if (typeof updated[key] === "object" && updated[key] !== null && controlName in updated[key]) {
                writeValue(updated, key);
                return;
            }
        }
        if (def) {
            for (const key of Object.keys(def.schema)) {
                const group = def.schema[key];
                if (typeof group === "object" && group !== null && controlName in group) {
                    if (!updated[key]) updated[key] = {};
                    writeValue(updated, key);
                    return;
                }
            }
        }
    };

    const updateSchema = (group: string, field: string, value: any) => {
        const updated = JSON.parse(JSON.stringify(element.schema));
        if (!updated[group]) updated[group] = {};
        updated[group][field] = value;
        onChange(updated);
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

            <div className="p-2 space-y-1">
                {sections.map((section) => (
                    <Section key={section.section} label={section.section} defaultOpen={true}>
                        {section.controls.map((ctrl) => {
                            let value: any;
                            if (element.schema.style && ctrl.name in element.schema.style) {
                                value = getDeviceValue(element.schema.style[ctrl.name], device);
                            } else if (element.schema.advanced && ctrl.name in element.schema.advanced) {
                                value = getDeviceValue(element.schema.advanced[ctrl.name], device);
                            } else {
                                for (const key of Object.keys(element.schema)) {
                                    const group = element.schema[key];
                                    if (typeof group === "object" && group !== null && ctrl.name in group) {
                                        value = getDeviceValue(group[ctrl.name], device);
                                        break;
                                    }
                                }
                            }
                            return (
                                <div key={ctrl.name} className="mb-3">
                                    {(ctrl.render as any)(value, (v: any) => updateValue(ctrl.name, v), { schema: element.schema, updateSchema })}
                                </div>
                            );
                        })}
                    </Section>
                ))}
            </div>
        </div>
    );
}
