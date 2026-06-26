"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { FormHooks } from "@/hook";
import { getHooks } from "@/hook";
import { xFetch } from "@/lib/express";
import Gallery from "@/components/Gallery";

export interface FormSettingsProps {
    type?: string;
    activePlugins: string[];
    initialValues?: Record<string, any>;
    /** Called after a successful save */
    onSuccess?: () => void;
    /** Called on every field change — useful for live previews */
    onChange?: (key: string, value: string) => void;
}

export default function FormSettings({
    type = "settings",
    activePlugins,
    initialValues = {},
    onSuccess,
    onChange,
}: FormSettingsProps) {
    // ── Plugin-injected fields ──────────────────────────────────────────────
    const [fields, setFields] = useState<FormHooks>([]);

    useEffect(() => {
        setFields(getHooks("setting.form", type));
    }, [type, activePlugins]);

    const leftFields  = fields.filter((f) => f.style === "left");
    const rightFields = fields.filter((f) => f.style === "right");

    // ── Form values — keyed by field.key, matches settings title ───────────
    const [values, setValues] = useState<Record<string, any>>(initialValues);

    // Sync when initialValues load (parent fetches async)
    useEffect(() => {
        setValues(initialValues);
    }, [initialValues]);

    const handleChange = (key: string, val: string) => {
        setValues((prev) => ({ ...prev, [key]: val }));
    };

    // ── Submit — bulk upsert via Express PUT /settings ──────────────────────
    const [saving, setSaving]   = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const res  = await xFetch("/settings", {
                method: "PUT",
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage(`Error: ${data.error ?? "Failed to save"}`);
            } else {
                setMessage("Settings saved!");
                // Signal AppearanceVars — same tab via custom event, other tabs via storage
                try {
                    localStorage.setItem("cms_settings_updated", Date.now().toString());
                    window.dispatchEvent(new Event("cms_settings_updated"));
                } catch { /* localStorage may be unavailable */ }
                onSuccess?.();
                setTimeout(() => setMessage(""), 3000);
            }
        } catch {
            setMessage("Network error");
        } finally {
            setSaving(false);
        }
    };

    // ── Render a single field ───────────────────────────────────────────────
    const renderField = (field: FormHooks[number]) => {
        const { key, label, fieldType, component: Component, options } = field;

        // ── single Gallery picker ──
        if (fieldType === "gallery") {
            return (
                <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold">{label}</label>
                    <Gallery
                        value={String(values[key] ?? "")}
                        onChange={(v) => handleChange(key, Array.isArray(v) ? v[0] ?? "" : v)}
                        placeholder={`Select ${label}`}
                    />
                </div>
            );
        }

        if (!Component) return null;
        return (
            <Component
                key={`${key}-${field.position}`}
                name={key}
                label={label}
                value={String(values[key] ?? "")}
                onChange={(v: string) => handleChange(key, v)}
                options={options}
            />
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            {message && (
                <div className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium border ${
                    message.startsWith("Error")
                        ? "bg-red-400/10 text-red-400 border-red-400/25"
                        : "bg-emerald-400/10 text-emerald-400 border-emerald-400/25"
                }`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

                {/* ── Left column ── */}
                <div className="flex flex-col gap-5">
                    {leftFields.map(renderField)}
                </div>

                {/* ── Right column ── */}
                <div className="flex flex-col gap-5">
                    {rightFields.map(renderField)}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving
                            ? <><Icon icon="svg-spinners:ring-resize" width={16} /> Saving…</>
                            : <><Icon icon="solar:check-circle-bold" width={16} /> Save Settings</>
                        }
                    </button>
                </div>

            </div>
        </form>
    );
}
