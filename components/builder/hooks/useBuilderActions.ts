"use client";

import { useCallback } from "react";
import { Row, Column, Selection, BuilderElement, PresetColumn, PresetRowSchema } from "../types";
import {
    uid,
    makeColumns,
    makeEmptyColumn,
    getColumnByPath,
    getElementDef,
    isContainerType,
    parentPathOf,
} from "../helpers";
import rowElement from "../elements/row";

/** Deep-merge a PresetRowSchema into a cloned row schema. */
function applyRowSchema(schema: any, preset: PresetRowSchema): any {
    if (preset.layout) {
        if (preset.layout.flex) Object.assign(schema.layout.flex, preset.layout.flex);
        if (preset.layout.wrap !== undefined) schema.layout.wrap = preset.layout.wrap;
        if (preset.layout.gap) Object.assign(schema.layout.gap, preset.layout.gap);
    }
    if (preset.advanced) {
        if (preset.advanced.padding) Object.assign(schema.advanced.padding, preset.advanced.padding);
        if (preset.advanced.margin) Object.assign(schema.advanced.margin, preset.advanced.margin);
    }
    return schema;
}

export function useBuilderActions(
    rows: Row[],
    setRows: React.Dispatch<React.SetStateAction<Row[]>>,
    selected: Selection | null,
    setSelected: React.Dispatch<React.SetStateAction<Selection | null>>,
    setLeftPanel: React.Dispatch<React.SetStateAction<any>>,
    targetCol: { rowId: string; path: number[] } | null,
    setTargetCol: React.Dispatch<React.SetStateAction<{ rowId: string; path: number[] } | null>>
) {
    const addRow = useCallback((preset: PresetColumn[], rowSchema?: PresetRowSchema) => {
        const schema = JSON.parse(JSON.stringify(rowElement.schema));
        if (rowSchema) applyRowSchema(schema, rowSchema);
        setRows((prev) => [
            ...prev,
            {
                id: uid(),
                columns: makeColumns(preset),
                schema,
            },
        ]);
    }, [setRows]);

    /**
     * Apply a column structure preset as nested containers inside the target container.
     * Elementor: structure becomes child containers (unlimited depth).
     */
    const addNestedColumns = useCallback(
        (preset: PresetColumn[]) => {
            if (!targetCol) return;
            setRows((prev) =>
                prev.map((row) => {
                    if (row.id !== targetCol.rowId) return row;
                    const updated = JSON.parse(JSON.stringify(row)) as Row;
                    const col = getColumnByPath(updated, targetCol.path);
                    // Append structure as nested containers (keep existing elements)
                    const kids = makeColumns(preset);
                    col.columns = [...(col.columns || []), ...kids];
                    return updated;
                })
            );
            setLeftPanel(null);
            setTargetCol(null);
        },
        [targetCol, setRows, setLeftPanel, setTargetCol]
    );

    /**
     * Add a widget OR nest a Container into a column.
     * Elementor: Container from the panel becomes a nested column, never a leaf element.
     */
    const addElementToColumn = useCallback(
        (rowId: string, colPath: number[], elementType: string) => {
            // Container widget → nested structural column (unlimited nesting)
            if (isContainerType(elementType)) {
                setRows((prev) =>
                    prev.map((row) => {
                        if (row.id !== rowId) return row;
                        const updated = JSON.parse(JSON.stringify(row)) as Row;
                        const col = getColumnByPath(updated, colPath);
                        if (!col.columns) col.columns = [];
                        col.columns.push(makeEmptyColumn());
                        return updated;
                    })
                );
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
                    if (!col.elements) col.elements = [];
                    col.elements.push(newEl);
                    return updated;
                })
            );
        },
        [setRows]
    );

    const updateElement = useCallback(
        (rowId: string, colPath: number[], elementId: string, newSchema: Record<string, any>) => {
            setRows((prev) =>
                prev.map((row) => {
                    if (row.id !== rowId) return row;
                    const updated = JSON.parse(JSON.stringify(row)) as Row;
                    const col = getColumnByPath(updated, colPath);
                    const el = col.elements.find((e) => e.id === elementId);
                    if (el) el.schema = newSchema;
                    return updated;
                })
            );
        },
        [setRows]
    );

    const updateColumn = useCallback(
        (rowId: string, colPath: number[], updatedCol: Column) => {
            setRows((prev) =>
                prev.map((row) => {
                    if (row.id !== rowId) return row;
                    const updated = JSON.parse(JSON.stringify(row)) as Row;
                    if (colPath.length === 1) {
                        updated.columns[colPath[0]] = updatedCol;
                    } else {
                        let parent = updated.columns[colPath[0]];
                        for (let i = 1; i < colPath.length - 1; i++) {
                            parent = parent.columns[colPath[i]];
                        }
                        parent.columns[colPath[colPath.length - 1]] = updatedCol;
                    }
                    return updated;
                })
            );
        },
        [setRows]
    );

    const moveRow = useCallback((fromIndex: number, toIndex: number) => {
        setRows((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            return updated;
        });
    }, [setRows]);

    /** Reorder top-level columns in a row (legacy / structure panel). */
    const moveColumn = useCallback((rowId: string, fromIndex: number, toIndex: number) => {
        setRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                const updated = JSON.parse(JSON.stringify(row)) as Row;
                const [moved] = updated.columns.splice(fromIndex, 1);
                updated.columns.splice(toIndex, 0, moved);
                return updated;
            })
        );
    }, [setRows]);

    /**
     * Reorder sibling containers at any nest depth (Elementor).
     * fromPath / toPath must share the same parent.
     */
    const moveColumnByPath = useCallback((rowId: string, fromPath: number[], toPath: number[]) => {
        if (fromPath.length !== toPath.length) return;
        const parentA = parentPathOf(fromPath);
        const parentB = parentPathOf(toPath);
        if (JSON.stringify(parentA) !== JSON.stringify(parentB)) return;
        const fromIdx = fromPath[fromPath.length - 1];
        const toIdx = toPath[toPath.length - 1];
        if (fromIdx === toIdx) return;

        setRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                const updated = JSON.parse(JSON.stringify(row)) as Row;
                const siblings =
                    parentA.length === 0
                        ? updated.columns
                        : getColumnByPath(updated, parentA).columns;
                const [moved] = siblings.splice(fromIdx, 1);
                siblings.splice(toIdx, 0, moved);
                return updated;
            })
        );
    }, [setRows]);

    const deleteRow = useCallback(
        (rowId: string) => {
            setRows((prev) => prev.filter((r) => r.id !== rowId));
            if (selected?.type === "row" && selected.id === rowId) {
                setSelected(null);
                setLeftPanel(null);
            }
        },
        [selected, setRows, setSelected, setLeftPanel]
    );

    const moveElement = useCallback(
        (rowId: string, colPath: number[], fromIdx: number, toIdx: number) => {
            setRows((prev) =>
                prev.map((row) => {
                    if (row.id !== rowId) return row;
                    const updated = JSON.parse(JSON.stringify(row)) as Row;
                    const col = getColumnByPath(updated, colPath);
                    const [moved] = col.elements.splice(fromIdx, 1);
                    col.elements.splice(toIdx, 0, moved);
                    return updated;
                })
            );
        },
        [setRows]
    );

    const moveElementCross = useCallback(
        (srcRowId: string, srcColPath: number[], elementId: string, tgtRowId: string, tgtColPath: number[], tgtIdx: number) => {
            setRows((prev) => {
                const updated = JSON.parse(JSON.stringify(prev)) as Row[];
                const srcRow = updated.find((r) => r.id === srcRowId);
                if (!srcRow) return prev;
                const srcCol = getColumnByPath(srcRow, srcColPath);
                const srcIdx = srcCol.elements.findIndex((e) => e.id === elementId);
                if (srcIdx === -1) return prev;
                const [movedEl] = srcCol.elements.splice(srcIdx, 1);

                const tgtRow = updated.find((r) => r.id === tgtRowId);
                if (!tgtRow) return prev;
                const tgtCol = getColumnByPath(tgtRow, tgtColPath);
                tgtCol.elements.splice(tgtIdx, 0, movedEl);
                return updated;
            });
        },
        [setRows]
    );

    return {
        addRow,
        addNestedColumns,
        addElementToColumn,
        updateElement,
        updateColumn,
        moveRow,
        moveColumn,
        moveColumnByPath,
        deleteRow,
        moveElement,
        moveElementCross,
    };
}
