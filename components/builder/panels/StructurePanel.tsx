"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Row } from "../types";
import { useFloatingPanelDrag } from "./FloatingPanel";
import RowNode from "./RowNode";

interface Props {
    rows: Row[];
    onSelectRow: (rowId: string) => void;
    onSelectColumn: (rowId: string, path: number[]) => void;
    onSelectElement: (rowId: string, colPath: number[], elementId: string) => void;
    onMoveRow: (fromIndex: number, toIndex: number) => void;
    onMoveColumn: (rowId: string, fromIndex: number, toIndex: number) => void;
    onMoveElement: (rowId: string, colPath: number[], fromIdx: number, toIdx: number) => void;
    onMoveElementCross: (
        srcRowId: string,
        srcColPath: number[],
        elementId: string,
        tgtRowId: string,
        tgtColPath: number[],
        tgtIdx: number
    ) => void;
    onClose: () => void;
    selectedId?: string | null;
}

export default function StructurePanel({
    rows,
    onSelectRow,
    onSelectColumn,
    onSelectElement,
    onMoveRow,
    onMoveColumn,
    onMoveElement,
    onMoveElementCross,
    onClose,
    selectedId,
}: Props) {
    const { onDragStart: onPanelDrag } = useFloatingPanelDrag();
    const [dropTarget, setDropTarget] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full">
            {/* Header — draggable for panel move */}
            <div
                onMouseDown={onPanelDrag}
                className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 shrink-0 cursor-move"
            >
                <div className="flex items-center gap-2">
                    <Icon icon="mdi:file-tree" width="14" className="text-neutral-500" />
                    <span className="text-[13px] font-semibold text-neutral-700">Structure</span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-neutral-400 hover:text-neutral-700"
                >
                    <Icon icon="mdi:close" width="14" />
                </button>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-1">
                {rows.map((row, rowIdx) => (
                    <RowNode
                        key={row.id}
                        row={row}
                        rowIdx={rowIdx}
                        onSelectRow={onSelectRow}
                        onSelectColumn={onSelectColumn}
                        onSelectElement={onSelectElement}
                        onMoveRow={onMoveRow}
                        onMoveColumn={onMoveColumn}
                        onMoveElement={onMoveElement}
                        onMoveElementCross={onMoveElementCross}
                        selectedId={selectedId}
                        dropTarget={dropTarget}
                        setDropTarget={setDropTarget}
                    />
                ))}

                {rows.length === 0 && (
                    <p className="text-[12px] text-neutral-400 italic text-center py-6">Empty</p>
                )}
            </div>
        </div>
    );
}
