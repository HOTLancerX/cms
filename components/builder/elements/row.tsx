"use client";

import {
  ContentWidth,
  Width,
  MinHeight,
  Flex,
  Gaps,
  Wrap,
  Background,
  BackgroundOverlay,
  Border,
  ShapeDivider,
  Dimensions,
  AlignSelf,
} from "../controls";

const rowElement = {
  type: "row",

  // ====================================
  // DEFAULT SCHEMA
  // ====================================
  schema: {
    layout: {
      contentWidth: "boxed",

      width: { value: 1200, unit: "px" },

      minHeight: { value: 0, unit: "px" },

      flex: {
        direction: "row",

        justifyContent: "flex-start",

        alignItems: "stretch",
      },

      gap: { column: 20, row: 20, unit: "px" },

      wrap: "nowrap",
    },

    style: {
      background: {
        normal: {
          type: "none",
          color: "transparent",
          image: "",
          gradient: { color1: "#ffffff", location1: 0, color2: "#ff0000", location2: 100, type: "linear", angle: 180, angleUnit: "deg" },
          video: { url: "", startTime: 0, endTime: 0, playOnce: false, playOnMobile: false, privacyMode: false, fallbackImage: "" },
          scrollingEffects: false,
          mouseEffects: false,
        },
        hover: {
          type: "none",
          color: "transparent",
          image: "",
          gradient: { color1: "#ffffff", location1: 0, color2: "#ff0000", location2: 100, type: "linear", angle: 180, angleUnit: "deg" },
          video: { url: "", startTime: 0, endTime: 0, playOnce: false, playOnMobile: false, privacyMode: false, fallbackImage: "" },
          scrollingEffects: false,
          mouseEffects: false,
        },
        transition: 300,
      },

      backgroundOverlay: {
        enabled: false,
        normal: { type: "color", color: "rgba(0,0,0,0.5)", image: "", opacity: 0.5, gradient: { color1: "#000000", location1: 0, color2: "#000000", location2: 100, type: "linear", angle: 180 } },
        hover: { type: "color", color: "rgba(0,0,0,0.5)", image: "", opacity: 0.5, gradient: { color1: "#000000", location1: 0, color2: "#000000", location2: 100, type: "linear", angle: 180 } },
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

      shapeDivider: {
        enabled: false,

        position: "bottom",

        shape: "wave",
      },
    },

    advanced: {
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },

      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },

      alignSelf: "auto",
    },

    columns: [],
  },

  controls: [
    // LAYOUT
    {
      tab: "Layout",
      section: "Layout",
      controls: [
        {
          name: "contentWidth",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ContentWidth value={value} onChange={onChange} />
          ),
        },
        {
          name: "width",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Width value={value} onChange={onChange} />
          ),
          condition: (values: any) => values.layout.contentWidth === "boxed",
        },
        {
          name: "minHeight",
          responsive: true,
          render: (value: any, onChange: any) => (
            <MinHeight value={value} onChange={onChange} />
          ),
        },
      ],
    },

    // FLEX
    {
      tab: "Layout",
      section: "Flex",
      controls: [
        {
          name: "flex",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Flex
              value={value}
              onChange={onChange}
              defaults={{ direction: "", justifyContent: "", alignItems: "" }}
            />
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

    // STYLE
    {
      tab: "Style",
      section: "Background",
      controls: [
        {
          name: "background",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Background value={value} onChange={onChange} />
          ),
        },
        {
          name: "backgroundOverlay",
          responsive: false,
          render: (value: any, onChange: any) => (
            <BackgroundOverlay value={value} onChange={onChange} />
          ),
          condition: (values: any) => {
            const bg = values.style.background;
            const normal = bg?.normal || bg;
            return normal?.type === "image";
          },
        },
      ],
    },

    {
      tab: "Style",
      section: "Border",
      controls: [
        {
          name: "border",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Border value={value} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Shape Divider",
      controls: [
        {
          name: "shapeDivider",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ShapeDivider value={value} onChange={onChange} />
          ),
        },
      ],
    },

    // ADVANCED
    {
      tab: "Advanced",
      section: "Spacing",
      controls: [
        {
          name: "margin",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="margin" value={value} onChange={onChange} />
          ),
        },
        {
          name: "padding",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" value={value} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Advanced",
      section: "Position",
      controls: [
        {
          name: "alignSelf",
          responsive: true,
          render: (value: any, onChange: any) => (
            <AlignSelf value={value} onChange={onChange} />
          ),
        },
      ],
    },
  ],

  // ====================================
  // RENDER (front-end output — uses .brow-{id} class from CanvasStyles)
  // ====================================
  render: (row: any) => {
    const overlay = row.style?.backgroundOverlay;
    const overlayNormal = overlay?.normal || overlay;
    const overlayEnabled = overlay?.enabled;

    return (
      <section className={`brow-${row.id || ""}`}>
        {/* Overlay */}
        {overlayEnabled && overlayNormal && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: overlayNormal.color || "rgba(0,0,0,0.5)",
              opacity: overlayNormal.opacity ?? 0.5,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Columns */}
        {row.columns?.map((column: any) => (
          <div
            key={column.id}
            style={{ width: `${column.width}%` }}
          >
            {column.elements?.map((element: any) => (
              <div key={element.id}>
                {element.content?.text}
              </div>
            ))}
          </div>
        ))}

        {/* Shape Divider */}
        {row.style?.shapeDivider?.enabled && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              [row.style.shapeDivider.position]: 0,
              height: "60px",
              background: "linear-gradient(to right, transparent, #000, transparent)",
            }}
          />
        )}
      </section>
    );
  },
};

export default rowElement;