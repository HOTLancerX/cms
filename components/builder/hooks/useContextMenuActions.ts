"use client";

import { useCallback } from "react";
import { Row, Column } from "../types";
import {
    uid,
    getColumnByPath,
    getElementDef,
    regenRowIds,
    regenColumnIds,
    regenElements,
    parentPathOf,
} from "../helpers";
import { ContextMenuTarget } from "../canvas/ContextMenu";
import rowElement from "../elements/row";
import columnElement from "../elements/column";

export function useContextMenuActions(
    rows: Row[],
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    contextMenu: ContextMenuTarget | null,
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuTarget | null>>,
    clipboard: { type: string; data: any } | null,
    setClipboard: React.Dispatch<React.SetStateAction<{ type: string; data: any } | null>>,
    selectRow: (rowId: string) => void,
    selectColumn: (rowId: string, path: number[]) => void,
    selectElement: (rowId: string, colPath: number[], elementId: string) => void,
    deleteRow: (rowId: string) => void,
    setShowStructure: React.Dispatch<React.SetStateAction<boolean>>,
    selectCarouselSlideElement?: (carouselElementId: string, slideIndex: number, childElementId: string) => void
) {
    const handleContextMenu = useCallback(
        (e: React.MouseEvent, target: Omit<ContextMenuTarget, "x" | "y">) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ ...target, x: e.clientX, y: e.clientY } as ContextMenuTarget);
        },
        [setContextMenu]
    );

    const handleDuplicate = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (!row) return;
            const clone = regenRowIds(JSON.parse(JSON.stringify(row)) as Row);
            const idx = rows.findIndex((r) => r.id === contextMenu.rowId);
            setRows((prev) => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]);
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (!row) return;
            const col = getColumnByPath(row, contextMenu.colPath);
            const clone = regenColumnIds(JSON.parse(JSON.stringify(col)) as Column);
            const path = contextMenu.colPath;
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    if (path.length === 1) {
                        updated.columns.splice(path[0] + 1, 0, clone);
                    } else {
                        const parent = getColumnByPath(updated, parentPathOf(path));
                        parent.columns.splice(path[path.length - 1] + 1, 0, clone);
                    }
                    return updated;
                })
            );
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    const idx = col.elements.findIndex((el) => el.id === contextMenu.elementId);
                    if (idx === -1) return updated;
                    const clone = regenElements([JSON.parse(JSON.stringify(col.elements[idx]))])[0];
                    col.elements.splice(idx + 1, 0, clone);
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [contextMenu, rows, setRows, setContextMenu]);

    const handleCopy = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (row) setClipboard({ type: "row", data: JSON.parse(JSON.stringify(row)) });
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (row) {
                const col = getColumnByPath(row, contextMenu.colPath);
                setClipboard({ type: "column", data: JSON.parse(JSON.stringify(col)) });
            }
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            const row = rows.find((r) => r.id === contextMenu.rowId);
            if (row) {
                const col = getColumnByPath(row, contextMenu.colPath);
                const el = col.elements.find((e) => e.id === contextMenu.elementId);
                if (el) setClipboard({ type: "element", data: JSON.parse(JSON.stringify(el)) });
            }
        }
        setContextMenu(null);
    }, [contextMenu, rows, setClipboard, setContextMenu]);

    const handlePaste = useCallback(() => {
        if (!clipboard || !contextMenu) { setContextMenu(null); return; }

        // Paste element into a container (or as sibling of element → parent container)
        if (clipboard.type === "element" && contextMenu.colPath) {
            const clone = regenElements([JSON.parse(JSON.stringify(clipboard.data))])[0];
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    if (!col.elements) col.elements = [];
                    col.elements.push(clone);
                    return updated;
                })
            );
        } else if (clipboard.type === "column" && contextMenu.colPath) {
            // Elementor: paste container as nested child of the target container
            const clone = regenColumnIds(JSON.parse(JSON.stringify(clipboard.data)) as Column);
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    if (contextMenu.type === "column") {
                        const col = getColumnByPath(updated, contextMenu.colPath!);
                        if (!col.columns) col.columns = [];
                        col.columns.push(clone);
                    } else {
                        // Pasting onto element context — nest into parent column
                        const col = getColumnByPath(updated, contextMenu.colPath!);
                        if (!col.columns) col.columns = [];
                        col.columns.push(clone);
                    }
                    return updated;
                })
            );
        } else if (clipboard.type === "column" && contextMenu.type === "row") {
            // Paste container as top-level column in the row
            const clone = regenColumnIds(JSON.parse(JSON.stringify(clipboard.data)) as Column);
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    updated.columns.push(clone);
                    return updated;
                })
            );
        } else if (clipboard.type === "row") {
            const clone = regenRowIds(JSON.parse(JSON.stringify(clipboard.data)) as Row);
            const idx = rows.findIndex((r) => r.id === contextMenu.rowId);
            setRows((prev) => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]);
        } else if (clipboard.type === "all") {
            const cloned = (JSON.parse(JSON.stringify(clipboard.data)) as Row[]).map(regenRowIds);
            setRows((prev) => [...prev, ...cloned]);
        }
        setContextMenu(null);
    }, [clipboard, contextMenu, rows, setRows, setContextMenu]);

    const handlePasteStyle = useCallback(() => {
        if (!clipboard || !contextMenu) { setContextMenu(null); return; }
        if (contextMenu.type === "element" && clipboard.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    const el = col.elements.find((e) => e.id === contextMenu.elementId);
                    if (el && el.type === clipboard.data.type) {
                        el.schema.style = JSON.parse(JSON.stringify(clipboard.data.schema.style));
                        el.schema.advanced = JSON.parse(JSON.stringify(clipboard.data.schema.advanced));
                    }
                    return updated;
                })
            );
        } else if (contextMenu.type === "row" && clipboard.type === "row") {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    updated.schema.style = JSON.parse(JSON.stringify(clipboard.data.schema.style));
                    updated.schema.advanced = JSON.parse(JSON.stringify(clipboard.data.schema.advanced));
                    return updated;
                })
            );
        } else if (contextMenu.type === "column" && clipboard.type === "column" && contextMenu.colPath) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    col.schema.style = JSON.parse(JSON.stringify(clipboard.data.schema.style));
                    col.schema.advanced = JSON.parse(JSON.stringify(clipboard.data.schema.advanced));
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [clipboard, contextMenu, setRows, setContextMenu]);

    const handleResetStyle = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    updated.schema.style = JSON.parse(JSON.stringify(rowElement.schema.style));
                    updated.schema.advanced = JSON.parse(JSON.stringify(rowElement.schema.advanced));
                    return updated;
                })
            );
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    col.schema.style = JSON.parse(JSON.stringify(columnElement.schema.style));
                    col.schema.advanced = JSON.parse(JSON.stringify(columnElement.schema.advanced));
                    return updated;
                })
            );
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    const el = col.elements.find((e) => e.id === contextMenu.elementId);
                    if (el) {
                        const def = getElementDef(el.type);
                        if (def) {
                            el.schema.style = JSON.parse(JSON.stringify(def.schema.style || {}));
                            el.schema.advanced = JSON.parse(JSON.stringify(def.schema.advanced || {}));
                        }
                    }
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [contextMenu, setRows, setContextMenu]);

    const handleContextEdit = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") selectRow(contextMenu.rowId);
        else if (contextMenu.type === "column" && contextMenu.colPath) selectColumn(contextMenu.rowId, contextMenu.colPath);
        else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) selectElement(contextMenu.rowId, contextMenu.colPath, contextMenu.elementId);
        else if (contextMenu.type === "carousel-slide-element" && contextMenu.carouselId && contextMenu.slideIndex != null && contextMenu.childElementId && selectCarouselSlideElement) {
            selectCarouselSlideElement(contextMenu.carouselId, contextMenu.slideIndex, contextMenu.childElementId);
        }
        setContextMenu(null);
    }, [contextMenu, selectRow, selectColumn, selectElement, selectCarouselSlideElement, setContextMenu]);

    const handleContextDelete = useCallback(() => {
        if (!contextMenu) return;
        if (contextMenu.type === "row") {
            deleteRow(contextMenu.rowId);
        } else if (contextMenu.type === "column" && contextMenu.colPath) {
            const path = contextMenu.colPath;
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    if (path.length === 1) {
                        updated.columns.splice(path[0], 1);
                    } else {
                        const parent = getColumnByPath(updated, parentPathOf(path));
                        parent.columns.splice(path[path.length - 1], 1);
                    }
                    return updated;
                })
            );
        } else if (contextMenu.type === "element" && contextMenu.colPath && contextMenu.elementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const col = getColumnByPath(updated, contextMenu.colPath!);
                    col.elements = col.elements.filter((e) => e.id !== contextMenu.elementId);
                    return updated;
                })
            );
        } else if (contextMenu.type === "carousel-slide-element" && contextMenu.carouselId && contextMenu.slideIndex != null && contextMenu.childElementId) {
            setRows((prev) =>
                prev.map((r) => {
                    if (r.id !== contextMenu.rowId) return r;
                    const updated = JSON.parse(JSON.stringify(r)) as Row;
                    const walk = (cols: Column[]) => {
                        for (const col of cols) {
                            const el = col.elements?.find((e: any) => e.id === contextMenu.carouselId);
                            if (el && el.type === "carousel") {
                                const slide = el.schema.content.slides[contextMenu.slideIndex!];
                                if (slide?.elements) {
                                    slide.elements = slide.elements.filter((e: any) => e.id !== contextMenu.childElementId);
                                }
                                return true;
                            }
                            if (col.columns?.length && walk(col.columns)) return true;
                        }
                        return false;
                    };
                    walk(updated.columns);
                    return updated;
                })
            );
        }
        setContextMenu(null);
    }, [contextMenu, deleteRow, setRows, setContextMenu]);

    const handleStructure = useCallback(() => {
        setShowStructure(true);
        setContextMenu(null);
    }, [setShowStructure, setContextMenu]);

    return {
        handleContextMenu,
        handleDuplicate,
        handleCopy,
        handlePaste,
        handlePasteStyle,
        handleResetStyle,
        handleContextEdit,
        handleContextDelete,
        handleStructure,
    };
}
