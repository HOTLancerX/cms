"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { xFetch } from "@/lib/express";
import type { LoaderStyle } from "@/components/NavigationLoader";

interface LoaderSettingsTabProps {
    activePlugins: string[];
    initialValues: Record<string, any>;
    onSaved?: () => void;
}

export default function LoaderSettingsTab({
    initialValues,
    onSaved,
}: LoaderSettingsTabProps) {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    // Form values
    const [enabled, setEnabled] = useState<boolean>(
        initialValues.loader_enabled !== "false" && initialValues.loader_enabled !== false
    );
    const [style, setStyle] = useState<LoaderStyle>(
        (initialValues.loader_style as LoaderStyle) || "top_bar"
    );
    const [primaryColor, setPrimaryColor] = useState<string>(
        initialValues.loader_color || initialValues.color_main || "#00aaa6"
    );
    const [secondaryColor, setSecondaryColor] = useState<string>(
        initialValues.loader_secondary_color || initialValues.color_secondary || "#ffc800"
    );
    const [barHeight, setBarHeight] = useState<number>(
        parseInt(String(initialValues.loader_height || "3"), 10) || 3
    );
    const [showSpinner, setShowSpinner] = useState<boolean>(
        initialValues.loader_show_spinner !== "false" && initialValues.loader_show_spinner !== false
    );
    const [loadingText, setLoadingText] = useState<string>(
        initialValues.loader_text || "Loading page..."
    );
    const [scope, setScope] = useState<"all" | "public" | "admin">(
        (initialValues.loader_scope as any) || "all"
    );

    // Test loader button triggers a simulated route transition
    const handleTestLoader = () => {
        setIsTesting(true);
        window.dispatchEvent(new Event("cms:loader-start"));
        setTimeout(() => {
            window.dispatchEvent(new Event("cms:loader-stop"));
            setIsTesting(false);
        }, 2500);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const payload: Record<string, any> = {
            ...initialValues,
            loader_enabled: enabled ? "true" : "false",
            loader_style: style,
            loader_color: primaryColor,
            loader_secondary_color: secondaryColor,
            loader_height: String(barHeight),
            loader_show_spinner: showSpinner ? "true" : "false",
            loader_text: loadingText,
            loader_scope: scope,
        };

        try {
            let saved = false;
            try {
                const res = await xFetch("/settings", {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                if (res.ok) saved = true;
            } catch {
                // Ignore Express network errors, will sync with local route
            }

            // Always sync directly with Next.js /api/settings as well
            const localRes = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (localRes.ok || saved) {
                setMessage({ text: "Page loader settings saved successfully!", type: "success" });
                try {
                    localStorage.setItem("cms_settings_updated", Date.now().toString());
                    window.dispatchEvent(new Event("cms_settings_updated"));
                } catch { }
                onSaved?.();
                setTimeout(() => setMessage(null), 4000);
            } else {
                setMessage({ text: "Failed to save settings. Please try again.", type: "error" });
            }
        } catch (err: any) {
            setMessage({ text: err?.message || "Network error while saving settings", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const STYLE_OPTIONS: {
        id: LoaderStyle;
        label: string;
        desc: string;
        icon: string;
        previewElement: React.ReactNode;
    }[] = [
        {
            id: "top_bar",
            label: "Top Runner Bar",
            desc: "Slim progress bar across the top of viewport with glowing runner head",
            icon: "solar:compass-bold",
            previewElement: (
                <div className="w-full h-8 bg-gray-100 rounded-md p-1 relative overflow-hidden flex flex-col justify-start">
                    <div
                        className="w-3/4 h-1.5 rounded-full"
                        style={{
                            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                            boxShadow: `0 0 8px ${primaryColor}`,
                        }}
                    />
                    <div className="text-[10px] text-gray-400 mt-2 font-mono">Top of viewport</div>
                </div>
            ),
        },
        {
            id: "center_popup",
            label: "Center Popup / Modal",
            desc: "Frosted glass card in center of screen with animated multi-ring spinner",
            icon: "solar:widget-add-bold",
            previewElement: (
                <div className="w-full h-12 bg-gray-100/80 rounded-md p-2 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-xs border border-gray-200">
                        <Icon icon="svg-spinners:ring-resize" width={14} style={{ color: primaryColor }} />
                        <span className="text-[10px] font-bold text-gray-700">Loading...</span>
                    </div>
                </div>
            ),
        },
        {
            id: "bottom_bar",
            label: "Footer Indicator",
            desc: "Floating dark pill at bottom center with glowing spinner and mini bar",
            icon: "solar:footer-bold",
            previewElement: (
                <div className="w-full h-12 bg-gray-100/80 rounded-md p-2 flex items-end justify-center">
                    <div className="flex items-center gap-2 bg-gray-900 text-white px-2.5 py-1 rounded-full shadow-xs">
                        <Icon icon="svg-spinners:180-ring-with-bg" width={12} style={{ color: secondaryColor }} />
                        <span className="text-[9px] font-semibold">Navigating...</span>
                    </div>
                </div>
            ),
        },
        {
            id: "minimal_spinner",
            label: "Corner Minimal Spinner",
            desc: "Discreet floating spinner in the top-right corner of screen",
            icon: "solar:refresh-square-bold",
            previewElement: (
                <div className="w-full h-12 bg-gray-100/80 rounded-md p-2 flex items-start justify-end">
                    <div className="p-1 rounded-md bg-white shadow-xs border border-gray-200">
                        <Icon icon="svg-spinners:ring-resize" width={14} style={{ color: primaryColor }} />
                    </div>
                </div>
            ),
        },
        {
            id: "full_overlay",
            label: "Full Screen Curtain",
            desc: "Full viewport frosted overlay with elegant central orbital loader",
            icon: "solar:layers-minimalistic-bold",
            previewElement: (
                <div className="w-full h-12 bg-gray-200/90 rounded-md p-2 flex flex-col items-center justify-center gap-1">
                    <div
                        className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin"
                        style={{ borderTopColor: primaryColor }}
                    />
                    <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                </div>
            ),
        },
    ];

    return (
        <form onSubmit={handleSave} className="space-y-8">
            {/* Status Feedback */}
            {message && (
                <div
                    className={`p-4 rounded-xl text-sm font-semibold border flex items-center gap-2.5 animate-in fade-in ${
                        message.type === "error"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                >
                    <Icon
                        icon={message.type === "error" ? "solar:danger-circle-bold" : "solar:check-circle-bold"}
                        width={20}
                        className="shrink-0"
                    />
                    <span>{message.text}</span>
                </div>
            )}

            {/* Live Interactive Test Simulator Banner */}
            <div className="rounded-2xl border border-indigo-200 bg-linear-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white p-6 shadow-md flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase">
                        <Icon icon="solar:stars-bold" width={14} />
                        Live Interactive Simulator
                    </div>
                    <h3 className="text-base font-bold text-white">Test Page Navigation Transition</h3>
                    <p className="text-xs text-white/80 leading-relaxed">
                        Click the button to simulate an instant route navigation and watch your active loader animation running right now!
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleTestLoader}
                    disabled={isTesting}
                    className="px-5 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-75"
                >
                    {isTesting ? (
                        <>
                            <Icon icon="svg-spinners:ring-resize" width={18} />
                            Running Loader...
                        </>
                    ) : (
                        <>
                            <Icon icon="solar:play-circle-bold" width={18} className="text-indigo-600" />
                            Test Loader Now
                        </>
                    )}
                </button>
            </div>

            {/* General Toggles Block */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                        <Icon icon="solar:tuning-bold" width={20} className="text-indigo-600" />
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Loader Enable &amp; Scope</h3>
                            <p className="text-xs text-gray-500">Enable or disable transition animations on internal link clicks</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-3 text-xs font-bold text-gray-700">
                            {enabled ? "Active" : "Disabled"}
                        </span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:eye-bold" width={14} className="text-indigo-500" />
                            Active Pages Scope
                        </label>
                        <select
                            value={scope}
                            onChange={(e) => setScope(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="all">Entire Website &amp; Admin Panel (Recommended)</option>
                            <option value="public">Public Site Pages Only</option>
                            <option value="admin">Admin Panel Only</option>
                        </select>
                        <p className="text-[11px] text-gray-400">Controls which areas will show the loader during page transitions</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Icon icon="solar:text-bold" width={14} className="text-indigo-500" />
                            Loading Text (for Popups &amp; Indicators)
                        </label>
                        <input
                            type="text"
                            value={loadingText}
                            onChange={(e) => setLoadingText(e.target.value)}
                            placeholder="e.g. Loading page..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[11px] text-gray-400">Displayed inside the modal, footer pill, and full overlay</p>
                    </div>
                </div>
            </div>

            {/* Animation Style Selector Cards */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
                    <Icon icon="solar:palette-bold" width={20} className="text-indigo-600" />
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Select Animation Style</h3>
                        <p className="text-xs text-gray-500">Pick how the loading indicator appears when navigating</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {STYLE_OPTIONS.map((opt) => {
                        const isSelected = style === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setStyle(opt.id)}
                                className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                                    isSelected
                                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/25 shadow-xs"
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon
                                                icon={opt.icon}
                                                width={18}
                                                className={isSelected ? "text-indigo-600" : "text-gray-400"}
                                            />
                                            <span className="text-xs font-bold text-gray-900">{opt.label}</span>
                                        </div>
                                        {isSelected && (
                                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{opt.desc}</p>
                                </div>
                                <div className="pt-2 border-t border-gray-100/80">
                                    {opt.previewElement}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Styling & Customization Block */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
                    <Icon icon="solar:brush-bold" width={20} className="text-indigo-600" />
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Colors &amp; Dimension Styling</h3>
                        <p className="text-xs text-gray-500">Fine-tune the theme colors, gradient, and runner bar thickness</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Primary Color */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                            Primary Loader Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5 shrink-0 bg-white"
                            />
                            <input
                                type="text"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                placeholder="#00aaa6"
                                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Secondary Color (Gradient) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                            Secondary / Accent Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="w-10 h-10 rounded-xl border border-gray-300 cursor-pointer p-0.5 shrink-0 bg-white"
                            />
                            <input
                                type="text"
                                value={secondaryColor}
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                placeholder="#ffc800"
                                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Bar Height */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700">Top Runner Bar Height</label>
                            <span className="text-xs font-bold font-mono text-indigo-600">{barHeight}px</span>
                        </div>
                        <input
                            type="range"
                            min={2}
                            max={8}
                            value={barHeight}
                            onChange={(e) => setBarHeight(parseInt(e.target.value, 10))}
                            className="w-full cursor-pointer accent-indigo-600 mt-2"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>2px (Slim)</span>
                            <span>3px (Standard)</span>
                            <span>8px (Bold)</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div>
                        <span className="text-xs font-bold text-gray-800 block">Show Corner Spinner with Top Bar</span>
                        <span className="text-[11px] text-gray-500 block">
                            Adds an elegant spinning circular indicator at the top right alongside the running progress bar
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        checked={showSpinner}
                        onChange={(e) => setShowSpinner(e.target.checked)}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
            </div>

            {/* Save Button */}
            <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
                {saving ? (
                    <>
                        <Icon icon="svg-spinners:ring-resize" width={18} />
                        Saving Loader Settings...
                    </>
                ) : (
                    <>
                        <Icon icon="solar:disk-bold" width={18} />
                        Save Loader Settings
                    </>
                )}
            </button>
        </form>
    );
}
