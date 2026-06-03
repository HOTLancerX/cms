"use client";

import { useState, useRef } from "react";
import { Icon } from "@iconify/react";

const SECTION_TYPE_OPTIONS = [
    "header",
    "footer",
    "hero",
    "category",
    "cta",
    "testimonial",
    "faq",
    "contact",
    "pricing",
    "team",
    "general",
];

interface Props {
    onClose: () => void;
    onSave: (data: { title: string; type: string; image: string }) => Promise<void>;
}

export default function SaveSectionPopup({ onClose, onSave }: Props) {
    const [title, setTitle] = useState("");
    const [type, setType] = useState("general");
    const [typeInput, setTypeInput] = useState("general");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [image, setImage] = useState("");
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const filteredSuggestions = SECTION_TYPE_OPTIONS.filter((t) =>
        t.toLowerCase().includes(typeInput.toLowerCase())
    );

    const handleTypeSelect = (val: string) => {
        setType(val);
        setTypeInput(val);
        setShowSuggestions(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        setSaving(true);
        const finalType = typeInput.trim() || "general";
        await onSave({ title: title.trim(), type: finalType, image });
        setSaving(false);
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-1100 bg-black/40" onClick={onClose} />

            {/* Popup */}
            <div className="fixed z-1101 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white rounded-xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                    <h3 className="text-sm font-semibold text-neutral-800">Save as Section</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center justify-center w-7 h-7 rounded hover:bg-neutral-100 cursor-pointer border-none bg-transparent"
                    >
                        <Icon icon="mdi:close" width="18" className="text-neutral-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Hero Section Dark"
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-blue-400"
                        />
                    </div>

                    {/* Type — auto-suggest */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
                        <input
                            type="text"
                            value={typeInput}
                            onChange={(e) => {
                                setTypeInput(e.target.value);
                                setType(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            placeholder="header, footer, hero..."
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-blue-400"
                        />
                        {/* Suggestions dropdown */}
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                                {filteredSuggestions.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onMouseDown={() => handleTypeSelect(s)}
                                        className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-600 border-none bg-transparent cursor-pointer capitalize"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Image upload */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Preview Image (optional)</label>
                        <div
                            onClick={() => fileRef.current?.click()}
                            className="border border-dashed border-neutral-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-colors"
                        >
                            {image ? (
                                <img src={image} alt="Preview" className="max-h-24 rounded object-contain" />
                            ) : (
                                <>
                                    <Icon icon="mdi:cloud-upload-outline" width="28" className="text-neutral-300 mb-1" />
                                    <span className="text-xs text-neutral-400">Click to upload</span>
                                </>
                            )}
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer border-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        className={`px-4 py-2 text-xs font-medium text-white rounded-lg border-none cursor-pointer ${saving ? "bg-neutral-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                            }`}
                    >
                        {saving ? "Saving..." : "Save Section"}
                    </button>
                </div>
            </div>
        </>
    );
}
