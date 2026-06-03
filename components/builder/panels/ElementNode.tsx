"use client";

import { Icon } from "@iconify/react";
import { BuilderElement } from "../types";
import { getDragItem, setDragItem } from "./structureDrag";

interface Props {
    element: BuilderElement;
    rowId: string;
    colPath: number[];
    elIdx: number;
    onSelectElement: (rowId: string, colPath: number[], elementId: string) => void;
    onMoveElement: (rowId: string, colPath: number[], fromIdx: number, toIdx: number) => void;
    onMoveElementCross: (srcRowId: string, srcColPath: number[], elementId: string, tgtRowId: string, tgtColPath: number[], tgtIdx: number) => void;
    selectedId?: string | null;
    dropTarget: string | null;
    setDropTarget: (id: string | null) => void;
}

export default function ElementNode({
    element,
    rowId,
    colPath,
    elIdx,
    onSelectElement,
    onMoveElement,
    onMoveElementCross,
    selectedId,
    dropTarget,
    setDropTarget,
}: Props) {
    const isActive = selectedId === element.id;
    const dropKey = `el-${element.id}`;
    const isDropHere = dropTarget === dropKey;

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        setDragItem({ type: "element", rowId, colPath, elementId: element.id, elementIdx: elIdx });
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        const dragItem = getDragItem();
        if (!dragItem || dragItem.type !== "element") return;
        if (dragItem.elementId === element.id) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(dropKey);
    };

    const handleDragLeave = () => {
        if (dropTarget === dropKey) setDropTarget(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(null);
        const dragItem = getDragItem();
        if (!dragItem || dragItem.type !== "element" || !dragItem.elementId) return;
        if (dragItem.elementId === element.id) return;

        const srcRowId = dragItem.rowId;
        const srcColPath = dragItem.colPath!;
        const sameColumn = srcRowId === rowId && JSON.stringify(srcColPath) === JSON.stringify(colPath);

        if (sameColumn) {
            const fromIdx = dragItem.elementIdx!;
            if (fromIdx !== elIdx) onMoveElement(rowId, colPath, fromIdx, elIdx);
        } else {
            onMoveElementCross(srcRowId, srcColPath, dragItem.elementId, rowId, colPath, elIdx);
        }
        setDragItem(null);
    };

    const handleDragEnd = () => {
        setDragItem(null);
        setDropTarget(null);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-1 px-2 py-1 cursor-grab group ${isDropHere
                    ? "bg-blue-100 border-t-2 border-blue-400"
                    : isActive
                        ? "bg-blue-50"
                        : "hover:bg-neutral-50"
                }`}
        >
            <button
                type="button"
                onClick={() => onSelectElement(rowId, colPath, element.id)}
                className="flex items-center gap-1.5 flex-1 bg-transparent border-none cursor-pointer text-left"
            >
                <Icon icon="mdi:cube-outline" width="12" className="text-blue-400" />
                <span className="text-[11px] text-neutral-600 capitalize">{element.type}</span>
            </button>
        </div>
    );
}
