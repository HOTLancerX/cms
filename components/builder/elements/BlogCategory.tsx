"use client";

import React from "react";
import {
  ButtonGroup,
  ColorPickerPopup,
  Dimensions,
  Typography,
  NumberControl,
} from "../controls";

const blogCategoryElement = {
  type: "blog-category",
  category: "Blog Details",
  label: "Blog Category",
  icon: "solar:folder-bold",

  schema: {
    style: {
      color: "#ffffff",
      badgeBg: "#6366f1",
      typography: {
        fontSize: 13,
        fontSizeUnit: "px",
        fontWeight: "600",
      },
      borderRadius: 9999,
      textAlign: "left",
    },
    advanced: {
      margin: { top: 0, right: 0, bottom: 12, left: 0, unit: "px" },
      padding: { top: 6, right: 14, bottom: 6, left: 14, unit: "px" },
    },
  },

  controls: [
    {
      tab: "Style",
      section: "Colours",
      controls: [
        {
          name: "color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Text Color" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "badgeBg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Badge Background Color" value={value ?? "#6366f1"} onChange={onChange} />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Typography & Shape",
      controls: [
        {
          name: "typography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography value={value} onChange={onChange} />
          ),
        },
        {
          name: "borderRadius",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl label="Border Radius (px)" value={value ?? 9999} onChange={onChange} min={0} max={100} />
          ),
        },
        {
          name: "textAlign",
          responsive: true,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              value={value}
              onChange={onChange}
              label="Alignment"
              defaultValue="left"
              grid={2}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
          ),
        },
      ],
    },
    {
      tab: "Advanced",
      section: "Spacing",
      controls: [
        {
          name: "margin",
          responsive: true,
          render: (value: any, onChange: any) => <Dimensions type="margin" value={value} onChange={onChange} />,
        },
        {
          name: "padding",
          responsive: true,
          render: (value: any, onChange: any) => <Dimensions type="padding" value={value} onChange={onChange} />,
        },
      ],
    },
  ],

  render: (element: any) => {
    const s = element.schema;
    const color = s.style?.color ?? "#ffffff";
    const bg = s.style?.badgeBg ?? "#6366f1";
    const radius = s.style?.borderRadius ?? 9999;
    const align = s.style?.textAlign ?? "left";

    const fontSize = s.style?.typography?.fontSize ?? 13;
    const fontWeight = s.style?.typography?.fontWeight ?? "600";

    const marginObj = s.advanced?.margin || {};
    const paddingObj = s.advanced?.padding || {};

    const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

    return (
      <div style={{ display: "flex", justifyContent: justify, width: "100%" }}>
        <span
          style={{
            display: "inline-block",
            color,
            backgroundColor: bg,
            borderRadius: `${radius}px`,
            fontSize: `${fontSize}px`,
            fontWeight,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            boxSizing: "border-box",
            marginTop: `${marginObj.top ?? 0}px`,
            marginRight: `${marginObj.right ?? 0}px`,
            marginBottom: `${marginObj.bottom ?? 12}px`,
            marginLeft: `${marginObj.left ?? 0}px`,
            paddingTop: `${paddingObj.top ?? 6}px`,
            paddingRight: `${paddingObj.right ?? 14}px`,
            paddingBottom: `${paddingObj.bottom ?? 6}px`,
            paddingLeft: `${paddingObj.left ?? 14}px`,
          }}
        >
          Technology
        </span>
      </div>
    );
  },
};

export default blogCategoryElement;
