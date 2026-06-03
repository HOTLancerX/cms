"use client";

import { useState } from "react";
import { BuilderElement, Device } from "../types";
import { getDeviceValue, setDeviceValue } from "../device";
import { getElementDef } from "../helpers";

interface Props {
    element: BuilderElement;
    device: Device;
    onChange: (schema: Record<string, any>) => void;
}

export default function ElementControls({ element, device, onChange }: Props) {
    const def = getElementDef(element.type);

    if (!def) return <div className="p-4 text-red-500">Unknown element type</div>;

    const tabs = [...new Set(def.controls.map((c) => c.tab))];
    const [activeTab, setActiveTab] = useState(tabs[0] || "Layout");
    const sections = def.controls.filter((c) => c.tab === activeTab);

    const updateValue = (controlName: string, value: any) => {
        const updated = JSON.parse(JSON.stringify(element.schema));

        // Find which group this control belongs to
        const writeValue = (schema: any, key: string) => {
            // Check if the control is marked responsive in the element definition
            let isResponsive = false;
            for (const section of def!.controls) {
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

            {sections.map((section) => (
                <div key={section.section} className="p-2">
                    <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        {section.section}
                    </h4>
                    {section.controls.map((ctrl) => {
                        let value: any;
                        for (const key of Object.keys(element.schema)) {
                            const group = element.schema[key];
                            if (typeof group === "object" && group !== null && ctrl.name in group) {
                                value = getDeviceValue(group[ctrl.name], device);
                                break;
                            }
                        }
                        return (
                            <div key={ctrl.name} className="mb-3">
                                {(ctrl.render as any)(value, (v: any) => updateValue(ctrl.name, v), { schema: element.schema, updateSchema })}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
