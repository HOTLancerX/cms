"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useDroppable } from "@dnd-kit/react";
import { COLUMN_PRESETS, ColumnPreset, PresetColumn, PresetRowSchema, Row, Column } from "../types";
import { uid } from "../helpers";

interface Props {
    onAddRow: (preset: PresetColumn[], rowSchema?: PresetRowSchema) => void;
    clipboard?: { type: string; data: any } | null;
    onPasteRow?: (row: Row) => void;
    onCopyAll?: () => void;
    onDeleteAll?: () => void;
    onStructure?: () => void;
    onOpenSections?: () => void;
}

export default function AddRowDropZone({ onAddRow, clipboard, onPasteRow, onCopyAll, onDeleteAll, onStructure, onOpenSections }: Props) {
    const [showStructures, setShowStructures] = useState(false);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

    const { ref, isDropTarget } = useDroppable({
        id: "add-row-drop-zone",
        type: "add-row-zone",
        accept: ["catalog", "catalog-section"],
        data: { dndType: "add-row-zone" },
    });

    const handleAddRow = (preset: PresetColumn[], rowSchema?: PresetRowSchema) => {
        onAddRow(preset, rowSchema);
        setShowStructures(false);
    };

    const handlePaste = () => {
        if (!clipboard || clipboard.type !== "row" || !onPasteRow) return;
        const clone = JSON.parse(JSON.stringify(clipboard.data)) as Row;
        clone.id = uid();
        const reId = (col: Column): Column => ({
            ...col,
            id: uid(),
            elements: col.elements.map((el) => ({ ...el, id: uid() })),
            columns: col.columns.map(reId),
        });
        clone.columns = clone.columns.map(reId);
        onPasteRow(clone);
        setCtxMenu(null);
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY });
    };

    const hasCopiedRow = clipboard?.type === "row";

    // Initial view: 3 action buttons + "Drag widget here"
    if (!showStructures) {
        return (
            <>
                <div
                    ref={ref}
                    onContextMenu={handleRightClick}
                    className={`mt-6 border max-w-4xl mx-auto border-dashed rounded-md transition-all duration-200 ${isDropTarget
                        ? "border-blue-500 bg-blue-50/40"
                        : "border-neutral-300 bg-white"
                        }`}
                >
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="flex items-center gap-3 mb-2">
                            {/* Plus button — opens structure selector */}
                            <button
                                type="button"
                                onClick={() => setShowStructures(true)}
                                title="Add new section"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-200 hover:bg-neutral-300 cursor-pointer border-none transition-colors"
                            >
                                <Icon icon="mdi:plus" width="20" className="text-neutral-700" />
                            </button>

                            {/* Folder/template button — opens sections panel */}
                            <button
                                type="button"
                                onClick={onOpenSections}
                                title="Browse sections"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-200 hover:bg-neutral-300 cursor-pointer border-none transition-colors"
                            >
                                <Icon icon="mdi:folder" width="18" className="text-neutral-700" />
                            </button>

                            {/* Sparkle/AI button — placeholder for future */}
                            <button
                                type="button"
                                title="Generate with AI"
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-fuchsia-100 hover:bg-fuchsia-200 cursor-pointer border-none transition-colors"
                            >
                                <Icon icon="mdi:creation" width="18" className="text-fuchsia-600" />
                            </button>
                        </div>
                        <span className="text-[13px] text-neutral-400">Drag widget here</span>
                    </div>
                </div>

                {/* Right-click context menu */}
                {ctxMenu && (
                    <DropZoneContextMenu
                        x={ctxMenu.x}
                        y={ctxMenu.y}
                        hasCopied={hasCopiedRow}
                        onPaste={handlePaste}
                        onCopyAll={onCopyAll}
                        onDeleteAll={onDeleteAll}
                        onStructure={onStructure}
                        onClose={() => setCtxMenu(null)}
                    />
                )}
            </>
        );
    }

    // Structure selector view
    return (
        <>
            <div
                ref={ref}
                onContextMenu={handleRightClick}
                className={`mt-6 border max-w-4xl mx-auto border-dashed rounded-md transition-all duration-200 ${isDropTarget
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-neutral-300 bg-white"
                    }`}
            >
                {/* Header: back arrow, title, close */}
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setShowStructures(false)}
                        className="flex items-center justify-center w-7 h-7 rounded hover:bg-neutral-100 cursor-pointer border-none bg-transparent"
                    >
                        <Icon icon="mdi:chevron-left" width="20" className="text-neutral-500" />
                    </button>
                    <span className="text-[13px] font-medium text-neutral-500">Select your structure</span>
                    <button
                        type="button"
                        onClick={() => setShowStructures(false)}
                        className="flex items-center justify-center w-7 h-7 rounded hover:bg-neutral-100 cursor-pointer border-none bg-transparent"
                    >
                        <Icon icon="mdi:close" width="18" className="text-neutral-500" />
                    </button>
                </div>

                {/* Structure presets grid — 6 per row, 2 rows */}
                <div className="grid grid-cols-6 gap-3 px-6 pb-6 max-w-3xl mx-auto">
                    {COLUMN_PRESETS.map((preset) => (
                        <PresetThumb
                            key={preset.label}
                            preset={preset}
                            onClick={() => handleAddRow(preset.cols, preset.rowSchema)}
                        />
                    ))}
                </div>
            </div>

            {/* Right-click context menu */}
            {ctxMenu && (
                <DropZoneContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    hasCopied={hasCopiedRow}
                    onPaste={handlePaste}
                    onCopyAll={onCopyAll}
                    onDeleteAll={onDeleteAll}
                    onStructure={onStructure}
                    onClose={() => setCtxMenu(null)}
                />
            )}
        </>
    );
}

// ---- Preset thumbnail ----

function PresetThumb({ preset, onClick }: { preset: ColumnPreset; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={preset.label}
            className="flex items-center justify-center p-2 rounded border border-neutral-200 bg-neutral-100 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-neutral-400 hover:text-blue-400"
            style={{ aspectRatio: "4/3" }}
        >
            <svg
                viewBox="0 0 90 44"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: preset.icon }}
            />
        </button>
    );
}

// ---- Context menu for the drop zone ----

function DropZoneContextMenu({
    x,
    y,
    hasCopied,
    onPaste,
    onCopyAll,
    onDeleteAll,
    onStructure,
    onClose,
}: {
    x: number;
    y: number;
    hasCopied: boolean;
    onPaste: () => void;
    onCopyAll?: () => void;
    onDeleteAll?: () => void;
    onStructure?: () => void;
    onClose: () => void;
}) {
    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-1000" onClick={onClose} />

            {/* Menu */}
            <div
                className="fixed z-1001 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 min-w-[200px]"
                style={{ left: x, top: y }}
            >
                <CtxMenuItem
                    label="Paste"
                    shortcut="^+V"
                    onClick={() => { onPaste(); onClose(); }}
                    disabled={!hasCopied}
                />

                <CtxMenuItem
                    label="Paste from other site"
                    onClick={onClose}
                    disabled
                />

                <CtxMenuDivider />

                <CtxMenuItem
                    label="Copy All Content"
                    onClick={() => { onCopyAll?.(); onClose(); }}
                    disabled={!onCopyAll}
                />

                <CtxMenuItem
                    label="Delete All Content"
                    onClick={() => { onDeleteAll?.(); onClose(); }}
                    disabled={!onDeleteAll}
                />

                <CtxMenuDivider />

                <CtxMenuItem
                    label="Structure"
                    shortcut="^+I"
                    onClick={() => { onStructure?.(); onClose(); }}
                />
            </div>
        </>
    );
}

function CtxMenuItem({
    label,
    shortcut,
    onClick,
    disabled,
}: {
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            className={`w-full flex items-center justify-between px-4 py-2 text-[13px] border-none bg-transparent cursor-pointer text-left ${disabled
                ? "text-neutral-300 cursor-not-allowed"
                : "text-neutral-700 hover:bg-neutral-50"
                }`}
        >
            <span>{label}</span>
            {shortcut && <span className="text-[11px] text-neutral-400 ml-4">{shortcut}</span>}
        </button>
    );
}

function CtxMenuDivider() {
    return <div className="border-t border-neutral-100 my-0.5" />;
}
