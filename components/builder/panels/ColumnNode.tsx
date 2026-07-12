"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Column } from "../types";
import { getDragItem, setDragItem } from "./structureDrag";
import ElementNode from "./ElementNode";

interface Props {
    column: Column;
    colIdx: number;
    rowId: string;
    path: number[];
    onSelectColumn: (rowId: string, path: number[]) => void;
    onSelectElement: (rowId: string, colPath: number[], elementId: string) => void;
    onMoveColumn: (rowId: string, fromIndex: number, toIndex: number) => void;
    onMoveElement: (rowId: string, colPath: number[], fromIdx: number, toIdx: number) => void;
    onMoveElementCross: (srcRowId: string, srcColPath: number[], elementId: string, tgtRowId: string, tgtColPath: number[], tgtIdx: number) => void;
    selectedId?: string | null;
    dropTarget: string | null;
    setDropTarget: (id: string | null) => void;
}

export default function ColumnNode({
    column,
    colIdx,
    rowId,
    path,
    onSelectColumn,
    onSelectElement,
    onMoveColumn,
    onMoveElement,
    onMoveElementCross,
    selectedId,
    dropTarget,
    setDropTarget,
}: Props) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = column.columns.length > 0 || column.elements.length > 0;
    const isActive = selectedId === column.id;
    const dropKey = `col-${column.id}`;
    const isDropHere = dropTarget === dropKey;

    const handleColumnDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        setDragItem({ type: "column", rowId, colIdx, colPath: path });
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        const dragItem = getDragItem();
        if (!dragItem) return;
        if (dragItem.type === "column") {
            if (dragItem.rowId !== rowId) return;
            if (dragItem.colIdx === colIdx) return;
            if (path.length !== 1 || (dragItem.colPath && dragItem.colPath.length !== 1)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            setDropTarget(dropKey);
        } else if (dragItem.type === "element") {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            setDropTarget(dropKey);
        }
    };

    const handleDragLeave = () => {
        if (dropTarget === dropKey) setDropTarget(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(null);

        const dragItem = getDragItem();
        if (!dragItem) return;

        if (dragItem.type === "column") {
            if (dragItem.rowId === rowId && dragItem.colIdx !== undefined && dragItem.colIdx !== colIdx) {
                onMoveColumn(rowId, dragItem.colIdx, colIdx);
            }
            setDragItem(null);
            return;
        }

        if (dragItem.type === "element" && dragItem.elementId) {
            const srcRowId = dragItem.rowId;
            const srcColPath = dragItem.colPath!;
            const sameColumn = srcRowId === rowId && JSON.stringify(srcColPath) === JSON.stringify(path);

            if (sameColumn) {
                const fromIdx = dragItem.elementIdx!;
                const toIdx = column.elements.length - 1;
                if (fromIdx !== toIdx) onMoveElement(rowId, path, fromIdx, toIdx);
            } else {
                onMoveElementCross(srcRowId, srcColPath, dragItem.elementId, rowId, path, column.elements.length);
            }
            setDragItem(null);
        }
    };

    const handleDragEnd = () => {
        setDragItem(null);
        setDropTarget(null);
    };

    return (
        <div>
            <div
                draggable
                onDragStart={handleColumnDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1 px-2 py-1 cursor-grab ${isDropHere ? "bg-blue-50 border border-blue-300 rounded" : isActive ? "bg-emerald-50" : "hover:bg-neutral-50"
                    }`}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="w-4 h-4 flex items-center justify-center bg-transparent border-none cursor-pointer text-neutral-400"
                    >
                        <Icon icon={expanded ? "mdi:chevron-down" : "mdi:chevron-right"} width="12" />
                    </button>
                ) : (
                    <span className="w-4" />
                )}

                <button
                    type="button"
                    onClick={() => onSelectColumn(rowId, path)}
                    className="flex items-center gap-1.5 flex-1 bg-transparent border-none cursor-pointer text-left"
                >
                    <Icon icon="mdi:diamond-outline" width="12" className="text-emerald-500" />
                    <span className="text-[11px] text-neutral-600">Container</span>
                </button>
            </div>

            {expanded && (
                <div className="ml-8">
                    {/* Nested columns */}
                    {column.columns.map((nested, idx) => (
                        <ColumnNode
                            key={nested.id}
                            column={nested}
                            colIdx={idx}
                            rowId={rowId}
                            path={[...path, idx]}
                            onSelectColumn={onSelectColumn}
                            onSelectElement={onSelectElement}
                            onMoveColumn={onMoveColumn}
                            onMoveElement={onMoveElement}
                            onMoveElementCross={onMoveElementCross}
                            selectedId={selectedId}
                            dropTarget={dropTarget}
                            setDropTarget={setDropTarget}
                        />
                    ))}

                    {/* Elements */}
                    {column.elements.map((el, elIdx) => (
                        <ElementNode
                            key={el.id}
                            element={el}
                            rowId={rowId}
                            colPath={path}
                            elIdx={elIdx}
                            onSelectElement={onSelectElement}
                            onMoveElement={onMoveElement}
                            onMoveElementCross={onMoveElementCross}
                            selectedId={selectedId}
                            dropTarget={dropTarget}
                            setDropTarget={setDropTarget}
                        />
                    ))}

                    {/* Empty state — drop target for elements */}
                    {!hasChildren && (
                        <div
                            onDragOver={(e) => {
                                const dragItem = getDragItem();
                                if (!dragItem || dragItem.type !== "element") return;
                                e.preventDefault();
                                e.stopPropagation();
                                setDropTarget(dropKey);
                            }}
                            onDrop={handleDrop}
                            className={`text-[11px] italic pl-6 py-1 rounded ${isDropHere ? "text-blue-500 bg-blue-50" : "text-neutral-400"
                                }`}
                        >
                            Empty
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
