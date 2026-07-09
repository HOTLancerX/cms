"use client";

import { Icon } from "@iconify/react";

export interface ContextMenuTarget {
    type: "row" | "column" | "element" | "carousel-slide-element";
    rowId: string;
    colPath?: number[];
    elementId?: string;
    carouselId?: string;
    slideIndex?: number;
    childElementId?: string;
    x: number;
    y: number;
}

interface Props {
    target: ContextMenuTarget;
    onClose: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onPasteStyle: () => void;
    onResetStyle: () => void;
    onDelete: () => void;
    onStructure: () => void;
    onSaveSection?: () => void;
    hasCopied: boolean;
}

export default function ContextMenu({
    target,
    onClose,
    onEdit,
    onDuplicate,
    onCopy,
    onPaste,
    onPasteStyle,
    onResetStyle,
    onDelete,
    onStructure,
    onSaveSection,
    hasCopied,
}: Props) {
    const label =
        target.type === "row"
            ? "Edit Flexbox"
            : target.type === "column"
                ? "Edit Column"
                : target.type === "carousel-slide-element"
                    ? "Edit Slide Element"
                    : "Edit Element";

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-1000" onClick={onClose} />

            {/* Menu */}
            <div
                className="fixed z-1001 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 min-w-[200px]"
                style={{ left: target.x, top: target.y }}
            >
                <MenuItem label={label} onClick={onEdit} />

                <Divider />

                <MenuItem label="Duplicate" shortcut="Ctrl+D" onClick={onDuplicate} />

                <Divider />

                <MenuItem label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
                <MenuItem label="Paste" shortcut="Ctrl+V" onClick={onPaste} disabled={!hasCopied} />
                <MenuItem label="Paste style" shortcut="Ctrl+Shift+V" onClick={onPasteStyle} disabled={!hasCopied} />

                <Divider />

                <MenuItem label="Reset style" onClick={onResetStyle} />

                <Divider />

                {target.type === "row" && onSaveSection && (
                    <>
                        <MenuItem label="Save as Section" icon="mdi:content-save-outline" onClick={onSaveSection} />
                        <Divider />
                    </>
                )}

                <MenuItem label="Structure" shortcut="Ctrl+I" onClick={onStructure} />

                <Divider />

                <MenuItem label="Delete" icon="mdi:delete-outline" onClick={onDelete} danger />
            </div>
        </>
    );
}

function MenuItem({
    label,
    shortcut,
    icon,
    onClick,
    disabled,
    danger,
}: {
    label: string;
    shortcut?: string;
    icon?: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            className={`w-full flex items-center justify-between px-4 py-2 text-[13px] border-none bg-transparent cursor-pointer text-left ${disabled
                ? "text-neutral-300 cursor-not-allowed"
                : danger
                    ? "text-red-500 hover:bg-red-50"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
        >
            <span className="flex items-center gap-2">
                {icon && <Icon icon={icon} width="14" />}
                {label}
            </span>
            {shortcut && <span className="text-[11px] text-neutral-400">{shortcut}</span>}
        </button>
    );
}

function Divider() {
    return <div className="border-t border-neutral-100 my-0.5" />;
}
