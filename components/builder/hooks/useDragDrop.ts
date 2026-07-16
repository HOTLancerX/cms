"use client";

import { useCallback } from "react";
import { Row, BuilderElement } from "../types";
import {
    uid,
    makeColumns,
    makeEmptyColumn,
    getColumnByPath,
    getElementDef,
    regenRowIds,
    isContainerType,
    parentPathOf,
} from "../helpers";
import rowElement from "../elements/row";

export function useDragDrop(
    rows: Row[],
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    moveRow: (fromIndex: number, toIndex: number) => void,
    moveColumn: (rowId: string, fromIndex: number, toIndex: number) => void,
    moveColumnByPath: (rowId: string, fromPath: number[], toPath: number[]) => void,
    moveElement: (rowId: string, colPath: number[], fromIdx: number, toIdx: number) => void,
    addElementToColumn: (rowId: string, colPath: number[], elementType: string) => void
) {
    const handleDragOver = useCallback((event: any) => {
        const { source, target } = event.operation;
        if (!source || !target) return;

        // Catalog items (from left panel) are only handled on dragEnd, skip during dragOver
        if (source.data?.elementType) return;

        setTimeout(() => {
            // Row reorder
            if (source.data?.dndType === "row" && target.data?.dndType === "row") {
                const fromIdx = rows.findIndex((r) => r.id === source.id);
                const toIdx = rows.findIndex((r) => r.id === target.id);
                if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                    moveRow(fromIdx, toIdx);
                }
                return;
            }

            // Column/Container reorder — any nest depth, same parent only
            if (source.data?.dndType === "column" && target.data?.dndType === "column") {
                const srcRowId = source.data.rowId as string;
                const tgtRowId = target.data.rowId as string;
                if (srcRowId !== tgtRowId) return;

                const srcPath = source.data.colPath as number[] | undefined;
                const tgtPath = target.data.colPath as number[] | undefined;

                if (srcPath && tgtPath && srcPath.length > 0 && tgtPath.length > 0) {
                    // Nested-aware reorder
                    if (
                        srcPath.length === tgtPath.length &&
                        JSON.stringify(parentPathOf(srcPath)) === JSON.stringify(parentPathOf(tgtPath)) &&
                        srcPath[srcPath.length - 1] !== tgtPath[tgtPath.length - 1]
                    ) {
                        moveColumnByPath(srcRowId, srcPath, tgtPath);
                    }
                    return;
                }

                // Legacy top-level only
                const row = rows.find((r) => r.id === srcRowId);
                if (!row) return;
                const fromIdx = row.columns.findIndex((c) => c.id === source.id);
                const toIdx = row.columns.findIndex((c) => c.id === target.id);
                if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                    moveColumn(srcRowId, fromIdx, toIdx);
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
                    if (!tgtCol.elements) tgtCol.elements = [];
                    tgtCol.elements.push(movedEl);
                    return updated;
                });
                return;
            }
        }, 0);
    }, [rows, moveRow, moveColumn, moveColumnByPath, moveElement, setRows]);

    const handleDragEnd = useCallback((event: any) => {
        if (event.canceled) return;
        const { source, target } = event.operation;
        if (!target || !source) return;

        setTimeout(() => {
            // Handle section drops — insert section content as rows
            const sectionContent = source.data?.sectionContent;
            if (sectionContent && Array.isArray(sectionContent)) {
                const cloned = (JSON.parse(JSON.stringify(sectionContent)) as Row[]).map(regenRowIds);
                if (target.data?.dndType === "row") {
                    const targetRowId = target.id;
                    setRows((prev) => {
                        const idx = prev.findIndex((r) => r.id === targetRowId);
                        if (idx === -1) return [...prev, ...cloned];
                        return [...prev.slice(0, idx + 1), ...cloned, ...prev.slice(idx + 1)];
                    });
                } else {
                    setRows((prev) => [...prev, ...cloned]);
                }
                return;
            }

            // Only handle catalog items being dropped (new element from left panel)
            const elementType = source.data?.elementType as string | undefined;
            if (!elementType) return;

            // Dropped onto a carousel slide — containers not allowed inside slides as structure
            if (target.data?.dndType === "carousel-slide") {
                if (isContainerType(elementType)) return;
                const { carouselId, slideIndex, rowId: tgtRowId, colPath: tgtColPath } = target.data;
                const def = getElementDef(elementType);
                if (!def) return;
                const newEl: BuilderElement = {
                    id: uid(),
                    type: elementType,
                    schema: JSON.parse(JSON.stringify(def.schema)),
                };
                setRows((prev) =>
                    prev.map((row) => {
                        if (row.id !== tgtRowId) return row;
                        const updated = JSON.parse(JSON.stringify(row)) as Row;
                        const col = getColumnByPath(updated, tgtColPath);
                        const carousel = col.elements.find((e) => e.id === carouselId);
                        if (carousel && carousel.type === "carousel") {
                            if (!carousel.schema.content.slides[slideIndex].elements) {
                                carousel.schema.content.slides[slideIndex].elements = [];
                            }
                            carousel.schema.content.slides[slideIndex].elements.push(newEl);
                        }
                        return updated;
                    })
                );
                return;
            }

            // Dropped onto the "Add Row" zone
            if (target.data?.dndType === "add-row-zone") {
                const newRow: Row = {
                    id: uid(),
                    columns: makeColumns([{ widths: { desktop: 100, tablet: 100, mobile: 100 } }]),
                    schema: JSON.parse(JSON.stringify(rowElement.schema)),
                };
                if (isContainerType(elementType)) {
                    // Extra nested container inside the new section (Elementor-style)
                    newRow.columns[0].columns.push(makeEmptyColumn());
                } else {
                    const def = getElementDef(elementType);
                    if (!def) return;
                    newRow.columns[0].elements.push({
                        id: uid(),
                        type: elementType,
                        schema: JSON.parse(JSON.stringify(def.schema)),
                    });
                }
                setRows((prev) => [...prev, newRow]);
                return;
            }

            const rowId = target.data?.rowId as string | undefined;
            const colPath = target.data?.colPath as number[] | undefined;
            if (!rowId || !colPath) return;

            // Dropped onto an element → insert after that element (or nest container into parent)
            if (target.data?.dndType === "element") {
                if (isContainerType(elementType)) {
                    addElementToColumn(rowId, colPath, elementType);
                    return;
                }
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
                return;
            }

            // Dropped onto a column/container — append widget or nest container
            addElementToColumn(rowId, colPath, elementType);
        }, 0);
    }, [setRows, addElementToColumn]);

    return { handleDragOver, handleDragEnd };
}