"use client";

/**
 * cms/components/admin/SpecificationBulkModal.tsx
 *
 * Popup modal component for bulk importing specification boxes and fields.
 * Parses pasted text lists (with sections, numbers, brackets, colons, or standard keywords)
 * and generates structured SpecificationBox[] with dynamic fields.
 */

import React, { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import type { SpecificationBox } from "./CategorySpecification";

interface SpecificationBulkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (boxes: SpecificationBox[], mode: "append" | "replace") => void;
    existingCount: number;
}

// Known common specification section keywords for auto-detection
const KNOWN_BOX_KEYWORDS = new Set([
    "general",
    "general info",
    "basic info",
    "design",
    "body",
    "display",
    "performance",
    "performance benchmarks",
    "benchmarks",
    "platform",
    "hardware",
    "processor",
    "camera",
    "main camera",
    "rear camera",
    "front camera",
    "selfie camera",
    "cameras",
    "battery",
    "battery & charging",
    "connectivity",
    "network",
    "network & connectivity",
    "sound",
    "audio",
    "sound & audio",
    "features",
    "multimedia",
    "security",
    "operating system",
    "software",
    "package contents",
    "in the box",
    "warranty",
    "specifications",
    "technical specifications",
    "overview",
]);
function cleanBoxTitle(str: string, stripNumbers: boolean): string {
    let t = str.trim();
    // Strip markdown hashes if any
    t = t.replace(/^#+\s*/, "").trim();
    // Strip brackets if any
    t = t.replace(/^\[\s*(.*?)\s*\]$/, "$1").trim();
    // Strip trailing colon
    t = t.replace(/:$/, "").trim();
    // Strip leading numbers if requested: e.g. "1. General" -> "General"
    if (stripNumbers) {
        t = t.replace(/^\d+[\.\)]\s*/, "").trim();
    }
    return t;
}

/** Parse raw text into structured SpecificationBox[] */
export function parseSpecificationText(text: string, stripNumbers: boolean = true): SpecificationBox[] {
    const rawLines = text.split(/\r?\n/);
    const lines = rawLines
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    // Check if the input contains bulleted lines
    const hasBullets = lines.some((l) => /^[-*+•]\s+/.test(l));

    const boxes: SpecificationBox[] = [];
    let currentBox: SpecificationBox | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Any line starting with bullet (- , * , + , • ) is ALWAYS A FIELD (never a box header)
        const isBullet = /^[-*+•]\s+/.test(line);

        if (isBullet) {
            if (!currentBox) {
                currentBox = { title: "General", fields: [] };
                boxes.push(currentBox);
            }

            // Strip leading bullet
            const content = line.replace(/^[-*+•]\s+/, "").trim();
            if (!content) continue;

            let fieldTitle = content;
            let fieldDesc = "";

            if (content.includes(":") && !content.endsWith(":")) {
                const parts = content.split(":");
                fieldTitle = parts[0].trim();
                fieldDesc = parts.slice(1).join(":").trim();
            } else if (content.includes("\t")) {
                const parts = content.split("\t");
                fieldTitle = parts[0].trim();
                fieldDesc = parts.slice(1).join(" ").trim();
            }

            currentBox.fields.push({
                title: fieldTitle,
                description: fieldDesc,
            });
            continue;
        }

        // 2. Markdown Header: e.g. "## 1. General", "# Display", "### Audio"
        const mdMatch = line.match(/^#+\s*(.+)$/);
        if (mdMatch) {
            const title = cleanBoxTitle(mdMatch[1], stripNumbers);
            currentBox = {
                title: title || "General",
                fields: [],
            };
            boxes.push(currentBox);
            continue;
        }

        // 3. Bracketed Header: e.g. "[1. General]" or "[Design]"
        const bracketMatch = line.match(/^\[\s*(.+?)\s*\]$/);
        if (bracketMatch) {
            const title = cleanBoxTitle(bracketMatch[1], stripNumbers);
            currentBox = {
                title: title || "General",
                fields: [],
            };
            boxes.push(currentBox);
            continue;
        }

        // 4. Colon Header: e.g. "General:" or "2. Design:"
        const colonMatch = line.match(/^([A-Za-z0-9\s\.\-_&/()]+):$/);
        if (colonMatch) {
            const title = cleanBoxTitle(colonMatch[1], stripNumbers);
            currentBox = {
                title: title || "General",
                fields: [],
            };
            boxes.push(currentBox);
            continue;
        }

        // 5. Numbered Section Header: e.g. "1. General" or "2. Design"
        const numMatch = line.match(/^\s*(\d+)[\.\)]\s*(.+)$/);
        if (numMatch) {
            const title = stripNumbers ? numMatch[2].trim() : line;
            currentBox = {
                title: title || "General",
                fields: [],
            };
            boxes.push(currentBox);
            continue;
        }

        // 6. If the document has bullet items, any remaining non-bullet line is considered a section title
        if (hasBullets) {
            const title = cleanBoxTitle(line, stripNumbers);
            currentBox = {
                title: title,
                fields: [],
            };
            boxes.push(currentBox);
            continue;
        }

        // 7. Fallback for un-bulleted plain text: Check keyword match
        const lower = line.toLowerCase().replace(/^[0-9\.\)\s]+/, "").trim();
        if (KNOWN_BOX_KEYWORDS.has(lower)) {
            const title = cleanBoxTitle(line, stripNumbers);
            currentBox = {
                title: title,
                fields: [],
            };
            boxes.push(currentBox);
            continue;
        }

        // 8. Fallback for the very first line of plain text
        if (i === 0 && line.length <= 40) {
            const title = cleanBoxTitle(line, stripNumbers);
            currentBox = {
                title: title,
                fields: [],
            };
            boxes.push(currentBox);
            continue;
        }

        // Otherwise, in plain text without bullets or headers, treat line as a field
        if (!currentBox) {
            currentBox = { title: "General", fields: [] };
            boxes.push(currentBox);
        }

        let fieldTitle = line;
        let fieldDesc = "";

        if (line.includes(":") && !line.endsWith(":")) {
            const parts = line.split(":");
            fieldTitle = parts[0].trim();
            fieldDesc = parts.slice(1).join(":").trim();
        } else if (line.includes("\t")) {
            const parts = line.split("\t");
            fieldTitle = parts[0].trim();
            fieldDesc = parts.slice(1).join(" ").trim();
        }

        currentBox.fields.push({
            title: fieldTitle,
            description: fieldDesc,
        });
    }

    // Filter out boxes with empty title and empty fields
    return boxes.filter((b) => b.title.trim() !== "" || b.fields.length > 0);
}

const SAMPLE_SPEC_TEXT = `
## 1. General
- Brand
- Model
- Announced

## 2. Design
- Dimensions
- Height
- Width
- SEO Label
- Database Field Key
`;

export default function SpecificationBulkModal({
    isOpen,
    onClose,
    onImport,
    existingCount,
}: SpecificationBulkModalProps) {
    const [rawText, setRawText] = useState<string>("");
    const [stripNumbers, setStripNumbers] = useState<boolean>(true);
    const [importMode, setImportMode] = useState<"append" | "replace">("append");
    const [expandedBox, setExpandedBox] = useState<number | null>(0);

    // Live parsed boxes
    const parsedBoxes = useMemo(() => {
        return parseSpecificationText(rawText, stripNumbers);
    }, [rawText, stripNumbers]);

    const totalFields = useMemo(() => {
        return parsedBoxes.reduce((acc, b) => acc + b.fields.length, 0);
    }, [parsedBoxes]);

    if (!isOpen) return null;

    const handleApply = () => {
        if (parsedBoxes.length === 0) return;
        onImport(parsedBoxes, importMode);
    };

    const handleLoadSample = () => {
        setRawText(SAMPLE_SPEC_TEXT);
    };

    const handleClear = () => {
        setRawText("");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Modal Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                            <Icon icon="solar:document-add-bold" width={22} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900">
                                Bulk Import Specifications
                            </h2>
                            <p className="text-xs text-gray-500">
                                Paste markdown headers (<code>## 1. General</code>) with bullets (<code>- Brand</code>) to generate boxes & fields instantly.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition cursor-pointer"
                        title="Close modal"
                    >
                        <Icon icon="solar:close-circle-bold" width={20} />
                    </button>
                </div>

                {/* ── Modal Body: 2 Columns on desktop ── */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input Textarea & Controls */}
                    <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                            <label htmlFor="bulk-spec-textarea" className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                Paste Specification Text
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleLoadSample}
                                    className="text-xs font-medium text-emerald-600 hover:underline cursor-pointer"
                                >
                                    Load Sample (19 Categories)
                                </button>
                                {rawText && (
                                    <>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            type="button"
                                            onClick={handleClear}
                                            className="text-xs font-medium text-red-500 hover:underline cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <textarea
                            id="bulk-spec-textarea"
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder={`## 1. General\n- Brand\n- Model\n- Announced\n\n## 2. Design\n- Dimensions\n- Height\n- Width`}
                            rows={15}
                            className="w-full flex-1 p-3.5 text-xs sm:text-sm font-mono bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none transition leading-relaxed text-gray-800"
                        />

                        {/* Formatting Options */}
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stripNumbers}
                                        onChange={(e) => setStripNumbers(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>Clean box titles (e.g. "## 1. General" → "General")</span>
                                </label>
                            </div>

                            <p className="text-[11px] text-gray-500 leading-normal">
                                <span className="font-semibold text-gray-700">Supported syntax:</span> Use <code>## 1. Category</code> for Box headers, and <code>- Field Name</code> for dynamic fields under each box.
                            </p>
                        </div>
                    </div>

                    {/* Right: Live Parsed Preview */}
                    <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                Live Parsed Preview
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {parsedBoxes.length} {parsedBoxes.length === 1 ? "Box" : "Boxes"}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {totalFields} {totalFields === 1 ? "Field" : "Fields"}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-95 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                            {parsedBoxes.length === 0 ? (
                                <div className="h-full min-h-55 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                    <Icon icon="solar:notes-minimalistic-linear" width={40} className="mb-2 text-gray-300" />
                                    <p className="text-sm font-medium text-gray-500">No specifications detected</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                                        Type or paste specification text on the left to see the boxes generated live.
                                    </p>
                                </div>
                            ) : (
                                parsedBoxes.map((box, bIdx) => {
                                    const isExpanded = expandedBox === bIdx;
                                    return (
                                        <div
                                            key={bIdx}
                                            className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden transition"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setExpandedBox(isExpanded ? null : bIdx)}
                                                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left bg-gray-50/80 hover:bg-gray-100/80 transition cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                                                        {bIdx + 1}
                                                    </span>
                                                    <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                                        {box.title}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-gray-400 shrink-0">
                                                        ({box.fields.length} {box.fields.length === 1 ? "field" : "fields"})
                                                    </span>
                                                </div>
                                                <Icon
                                                    icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                                                    width={16}
                                                    className="text-gray-400 shrink-0"
                                                />
                                            </button>

                                            {isExpanded && (
                                                <div className="p-3 border-t border-gray-100 space-y-1.5 max-h-52 overflow-y-auto bg-white">
                                                    {box.fields.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">No fields in this box</p>
                                                    ) : (
                                                        box.fields.map((field, fIdx) => (
                                                            <div
                                                                key={fIdx}
                                                                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-gray-50 border border-gray-100"
                                                            >
                                                                <span className="font-semibold text-gray-800">
                                                                    {field.title}
                                                                </span>
                                                                {field.description ? (
                                                                    <span className="text-gray-500 truncate max-w-[50%]">
                                                                        {field.description}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-400 italic">
                                                                        empty description
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Import Mode Options (when existing boxes exist) */}
                        {existingCount > 0 && (
                            <div className="flex items-center gap-4 pt-1 text-xs text-gray-700">
                                <span className="font-semibold text-gray-600">Action:</span>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="import_mode"
                                        value="append"
                                        checked={importMode === "append"}
                                        onChange={() => setImportMode("append")}
                                        className="text-main focus:ring-main"
                                    />
                                    <span>Append ({existingCount} existing + {parsedBoxes.length} new)</span>
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="import_mode"
                                        value="replace"
                                        checked={importMode === "replace"}
                                        onChange={() => setImportMode("replace")}
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-red-600">Replace all existing</span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modal Footer ── */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={parsedBoxes.length === 0}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Icon icon="solar:check-circle-bold" width={18} />
                        <span>
                            Import {parsedBoxes.length} {parsedBoxes.length === 1 ? "Box" : "Boxes"} ({totalFields} {totalFields === 1 ? "Field" : "Fields"})
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
