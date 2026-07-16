"use client";

import {
    MinHeight,
    Flex,
    Gaps,
    Wrap,
} from "../controls";

/**
 * Elementor-style Container definition.
 *
 * Used for:
 *  1. Schema + controls of every structural Column (nestable)
 *  2. Widget panel entry "Container" — adding it nests a new Column
 *     into the target container (columns[]), never as a leaf element.
 *
 * Tree model at every depth:
 *   Column { columns: Column[], elements: BuilderElement[] }
 */
const columnElement = {
    type: "column",
    category: "Basic",
    label: "Container",
    icon: "solar:box-minimalistic-bold",

    // ====================================
    // DEFAULT SCHEMA
    // ====================================
    schema: {
        layout: {
            width: { value: 100, unit: "%" },

            minHeight: { value: 0, unit: "auto" },

            flex: {
                direction: "column",
                justifyContent: "flex-start",
                alignItems: "stretch",
            },

            gap: { column: 0, row: 0, unit: "px" },

            wrap: "nowrap",
        },

        style: {
            background: {
                normal: { type: "none", color: "transparent", image: "", gradient: { color1: "#ffffff", location1: 0, color2: "#ff0000", location2: 100, type: "linear", angle: 180, angleUnit: "deg" }, scrollingEffects: false, mouseEffects: false },
                hover: { type: "none", color: "transparent", image: "", gradient: { color1: "#ffffff", location1: 0, color2: "#ff0000", location2: 100, type: "linear", angle: 180, angleUnit: "deg" }, scrollingEffects: false, mouseEffects: false },
                transition: 300,
            },

            border: {
                normal: {
                    type: "",
                    width: 1,
                    color: "#000000",
                    radius: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
                },
                hover: {
                    type: "",
                    width: 1,
                    color: "#000000",
                    radius: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
                },
                boxShadow: {
                    normal: { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.15)", inset: false },
                    hover: { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.15)", inset: false },
                    transition: 300,
                },
                transition: 300,
            },
        },

        advanced: {
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            padding: { top: 10, right: 10, bottom: 10, left: 10 },
            alignSelf: "auto",
        },
    },

    // ====================================
    // CONTROLS
    // ====================================
    controls: [
        // LAYOUT
        {
            tab: "Layout",
            section: "Size",
            controls: [
                {
                    name: "minHeight",
                    responsive: true,
                    render: (value: any, onChange: any) => (
                        <MinHeight value={value} onChange={onChange} />
                    ),
                },
            ],
        },
        {
            tab: "Layout",
            section: "Flex",
            controls: [
                {
                    name: "flex",
                    responsive: true,
                    render: (value: any, onChange: any) => (
                        <Flex value={value} onChange={onChange} defaults={{ direction: "", justifyContent: "", alignItems: "" }} />
                    ),
                },
                {
                    name: "gap",
                    responsive: true,
                    render: (value: any, onChange: any) => (
                        <Gaps value={value} onChange={onChange} />
                    ),
                },
                {
                    name: "wrap",
                    responsive: true,
                    render: (value: any, onChange: any) => (
                        <Wrap value={value} onChange={onChange} />
                    ),
                },
            ],
        },

    ],

    // =========================
    // RENDER (uses .bcol-{id} class from CanvasStyles)
    // =========================
    render: (element: any) => {
        return (
            <div className={`bcol-${element.id || ""}`} />
        );
    },
};

export default columnElement;
