"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Row } from "../types";
import { getDragItem, setDragItem } from "./structureDrag";
import ColumnNode from "./ColumnNode";

interface Props {
    row: Row;
    rowIdx: number;
    onSelectRow: (rowId: string) => void;
    onSelectColumn: (rowId: string, path: number[]) => void;
    onSelectElement: (rowId: string, colPath: number[], elementId: string) => void;
    onMoveRow: (fromIndex: number, toIndex: number) => void;
    onMoveColumn: (rowId: string, fromIndex: number, toIndex: number) => void;
    onMoveElement: (rowId: string, colPath: number[], fromIdx: number, toIdx: number) => void;
    onMoveElementCross: (srcRowId: string, srcColPath: number[], elementId: string, tgtRowId: string, tgtColPath: number[], tgtIdx: number) => void;
    selectedId?: string | null;
    dropTarget: string | null;
    setDropTarget: (id: string | null) => void;
}

export default function RowNode({
    row,
    rowIdx,
    onSelectRow,
    onSelectColumn,
    onSelectElement,
    onMoveRow,
    onMoveColumn,
    onMoveElement,
    onMoveElementCross,
    selectedId,
    dropTarget,
    setDropTarget,
}: Props) {
    const [expanded, setExpanded] = useState(true);
    const isActive = selectedId === row.id;
    const isDropHere = dropTarget === `row-${row.id}`;

    const handleDragStart = (e: React.DragEvent) => {
        setDragItem({ type: "row", rowId: row.id, rowIdx });
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        const dragItem = getDragItem();
        if (!dragItem || dragItem.type !== "row") return;
        if (dragItem.rowId === row.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(`row-${row.id}`);
    };

    const handleDragLeave = () => {
        if (dropTarget === `row-${row.id}`) setDropTarget(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDropTarget(null);
        const dragItem = getDragItem();
        if (!dragItem || dragItem.type !== "row") return;
        if (dragItem.rowIdx !== undefined && dragItem.rowIdx !== rowIdx) {
            onMoveRow(dragItem.rowIdx, rowIdx);
        }
        setDragItem(null);
    };

    const handleDragEnd = () => {
        setDragItem(null);
        setDropTarget(null);
    };

    return (
        <div>
            <div
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1 px-2 py-1.5 cursor-grab group ${isDropHere ? "bg-blue-100 border-t-2 border-blue-400" : isActive ? "bg-blue-50" : "hover:bg-neutral-50"
                    }`}
            >
                {/* Expand toggle */}
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="w-4 h-4 flex items-center justify-center bg-transparent border-none cursor-pointer text-neutral-500"
                >
                    <Icon icon={expanded ? "mdi:chevron-down" : "mdi:chevron-right"} width="14" />
                </button>

                {/* Icon + Label */}
                <button
                    type="button"
                    onClick={() => onSelectRow(row.id)}
                    className="flex items-center gap-1.5 flex-1 bg-transparent border-none cursor-pointer text-left"
                >
                    <Icon icon="mdi:view-sequential" width="14" className="text-purple-500" />
                    <span className="text-[12px] text-neutral-700">Flexbox</span>
                </button>
            </div>

            {/* Children */}
            {expanded && (
                <div className="ml-3">
                    {row.columns.map((col, colIdx) => (
                        <ColumnNode
                            key={col.id}
                            column={col}
                            colIdx={colIdx}
                            rowId={row.id}
                            path={[colIdx]}
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
                </div>
            )}
        </div>
    );
}
