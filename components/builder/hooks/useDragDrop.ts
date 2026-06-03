"use client";

import { useCallback } from "react";
import { Row, Column, BuilderElement } from "../types";
import { uid, makeColumns, getColumnByPath, getElementDef } from "../helpers";
import rowElement from "../elements/row";

/** Recursively regenerate all IDs in a row's columns and elements */
function regenRowIds(row: Row): Row {
    const regenCol = (col: Column): Column => ({
        ...col,
        id: uid(),
        elements: col.elements.map((el) => ({ ...el, id: uid() })),
        columns: col.columns.map(regenCol),
    });
    return {
        ...row,
        id: uid(),
        columns: row.columns.map(regenCol),
    };
}

export function useDragDrop(
    rows: Row[],
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    moveRow: (fromIndex: number, toIndex: number) => void,
    moveColumn: (rowId: string, fromIndex: number, toIndex: number) => void,
    moveElement: (rowId: string, colPath: number[], fromIdx: number, toIdx: number) => void,
    addElementToColumn: (rowId: string, colPath: number[], elementType: string) => void
) {
    const handleDragOver = useCallback((event: any) => {
        const { source, target } = event.operation;
        if (!source || !target) return;

        // Catalog items (from left panel) are only handled on dragEnd, skip during dragOver
        if (source.data?.elementType) return;

        // Row reorder
        if (source.data?.dndType === "row" && target.data?.dndType === "row") {
            const fromIdx = rows.findIndex((r) => r.id === source.id);
            const toIdx = rows.findIndex((r) => r.id === target.id);
            if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                moveRow(fromIdx, toIdx);
            }
            return;
        }

        // Column reorder within same row
        if (source.data?.dndType === "column" && target.data?.dndType === "column") {
            const srcRowId = source.data.rowId;
            const tgtRowId = target.data.rowId;
            if (srcRowId === tgtRowId) {
                const row = rows.find((r) => r.id === srcRowId);
                if (!row) return;
                const fromIdx = row.columns.findIndex((c) => c.id === source.id);
                const toIdx = row.columns.findIndex((c) => c.id === target.id);
                if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                    moveColumn(srcRowId, fromIdx, toIdx);
                }
            }
            return;
        }

        // Element reorder — same column or cross-column move
        if (source.data?.dndType === "element" && target.data?.dndType === "element") {
            const srcRowId = source.data.rowId;
            const tgtRowId = target.data.rowId;
            const srcColPath = source.data.colPath;
            const tgtColPath = target.data.colPath;
            const sameColumn =
                srcRowId === tgtRowId &&
                JSON.stringify(srcColPath) === JSON.stringify(tgtColPath);

            if (sameColumn) {
                const row = rows.find((r) => r.id === srcRowId);
                if (!row) return;
                const col = getColumnByPath(row, srcColPath);
                const fromIdx = col.elements.findIndex((e) => e.id === source.id);
                const toIdx = col.elements.findIndex((e) => e.id === target.id);
                if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                    moveElement(srcRowId, srcColPath, fromIdx, toIdx);
                }
            } else {
                // Cross-column move
                setRows((prev) => {
                    const updated = JSON.parse(JSON.stringify(prev)) as Row[];
                    const srcRow = updated.find((r) => r.id === srcRowId);
                    if (!srcRow) return prev;
                    const srcCol = getColumnByPath(srcRow, srcColPath);
                    const srcIdx = srcCol.elements.findIndex((e) => e.id === source.id);
                    if (srcIdx === -1) return prev;
                    const [movedEl] = srcCol.elements.splice(srcIdx, 1);

                    const tgtRow = updated.find((r) => r.id === tgtRowId);
                    if (!tgtRow) return prev;
                    const tgtCol = getColumnByPath(tgtRow, tgtColPath);
                    const tgtIdx = tgtCol.elements.findIndex((e) => e.id === target.id);
                    if (tgtIdx === -1) {
                        tgtCol.elements.push(movedEl);
                    } else {
                        tgtCol.elements.splice(tgtIdx, 0, movedEl);
                    }
                    return updated;
                });
            }
            return;
        }

        // Element dropped onto a column (cross-column move to empty or end of column)
        if (source.data?.dndType === "element" && target.data?.dndType === "column") {
            const srcRowId = source.data.rowId;
            const srcColPath = source.data.colPath;
            const tgtRowId = target.data.rowId;
            const tgtColPath = target.data.colPath;
            if (srcRowId === tgtRowId && JSON.stringify(srcColPath) === JSON.stringify(tgtColPath)) return;

            setRows((prev) => {
                const updated = JSON.parse(JSON.stringify(prev)) as Row[];
                const srcRow = updated.find((r) => r.id === srcRowId);
                if (!srcRow) return prev;
                const srcCol = getColumnByPath(srcRow, srcColPath);
                const srcIdx = srcCol.elements.findIndex((e) => e.id === source.id);
                if (srcIdx === -1) return prev;
                const [movedEl] = srcCol.elements.splice(srcIdx, 1);

                const tgtRow = updated.find((r) => r.id === tgtRowId);
                if (!tgtRow) return prev;
                const tgtCol = getColumnByPath(tgtRow, tgtColPath);
                tgtCol.elements.push(movedEl);
                return updated;
            });
            return;
        }
    }, [rows, moveRow, moveColumn, moveElement, setRows]);

    const handleDragEnd = useCallback((event: any) => {
        if (event.canceled) return;
        const { source, target } = event.operation;
        if (!target || !source) return;

        // Handle section drops — insert section content as rows
        const sectionContent = source.data?.sectionContent;
        if (sectionContent && Array.isArray(sectionContent)) {
            const cloned = (JSON.parse(JSON.stringify(sectionContent)) as Row[]).map(regenRowIds);
            // If dropped on a specific row, insert after it
            if (target.data?.dndType === "row") {
                const targetRowId = target.id;
                setRows((prev) => {
                    const idx = prev.findIndex((r) => r.id === targetRowId);
                    if (idx === -1) return [...prev, ...cloned];
                    return [...prev.slice(0, idx + 1), ...cloned, ...prev.slice(idx + 1)];
                });
            } else {
                // Dropped on AddRowDropZone or anywhere else — append at end
                setRows((prev) => [...prev, ...cloned]);
            }
            return;
        }

        // Only handle catalog items being dropped (new element from left panel)
        const elementType = source.data?.elementType;
        if (!elementType) return;

        // Dropped onto the "Add Row" zone — create a new row with 1 column + the element
        if (target.data?.dndType === "add-row-zone") {
            const def = getElementDef(elementType);
            if (!def) return;
            const newEl: BuilderElement = {
                id: uid(),
                type: elementType,
                schema: JSON.parse(JSON.stringify(def.schema)),
            };
            const newRow: Row = {
                id: uid(),
                columns: makeColumns([{ widths: { desktop: 100, tablet: 100, mobile: 100 } }]),
                schema: JSON.parse(JSON.stringify(rowElement.schema)),
            };
            newRow.columns[0].elements.push(newEl);
            setRows((prev) => [...prev, newRow]);
            return;
        }

        const rowId = target.data?.rowId;
        const colPath = target.data?.colPath;
        if (!rowId || !colPath) return;

        // If dropped onto an element, insert at that element's position
        if (target.data?.dndType === "element") {
            const def = getElementDef(elementType);
            if (!def) return;
            const newEl: BuilderElement = {
                id: uid(),
                type: elementType,
                schema: JSON.parse(JSON.stringify(def.schema)),
            };
            setRows((prev) =>
                prev.map((row) => {
                    if (row.id !== rowId) return row;
                    const updated = JSON.parse(JSON.stringify(row)) as Row;
                    const col = getColumnByPath(updated, colPath);
                    const targetIdx = col.elements.findIndex((e) => e.id === target.id);
                    if (targetIdx !== -1) {
                        col.elements.splice(targetIdx + 1, 0, newEl);
                    } else {
                        col.elements.push(newEl);
                    }
                    return updated;
                })
            );
        } else {
            // Dropped onto a column — append to end
            addElementToColumn(rowId, colPath, elementType);
        }
    }, [setRows, addElementToColumn]);

    return { handleDragOver, handleDragEnd };
}
