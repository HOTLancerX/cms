"use client";

import React, { useState } from "react";
import {
  Select,
  ButtonGroup,
  NumberControl,
  Dimensions,
  Border,
} from "../controls";

function getBorderStyles(borderVal: any, hovered: boolean) {
  if (!borderVal) return {};
  const normal = borderVal.normal || {};
  const hover = borderVal.hover || {};
  const active = hovered ? { ...normal, ...hover } : normal;
  
  const styles: React.CSSProperties = {
    borderStyle: active.type || "none",
    borderColor: active.color || "#e2e8f0",
  };
  
  const w = active.width;
  if (w && typeof w === "object") {
    const unit = w.unit || "px";
    styles.borderTopWidth = `${w.top ?? 0}${unit}`;
    styles.borderRightWidth = `${w.right ?? 0}${unit}`;
    styles.borderBottomWidth = `${w.bottom ?? 0}${unit}`;
    styles.borderLeftWidth = `${w.left ?? 0}${unit}`;
  }
  
  const r = active.radius;
  if (r && typeof r === "object") {
    const unit = r.unit || "px";
    styles.borderTopLeftRadius = `${r.top ?? 0}${unit}`;
    styles.borderTopRightRadius = `${r.right ?? 0}${unit}`;
    styles.borderBottomRightRadius = `${r.bottom ?? 0}${unit}`;
    styles.borderBottomLeftRadius = `${r.left ?? 0}${unit}`;
  }
  
  const shadow = borderVal.boxShadow;
  if (shadow) {
    const activeShadow = hovered ? shadow.hover : shadow.normal;
    if (activeShadow) {
      const inset = activeShadow.inset === true || activeShadow.inset === "true";
      const x = activeShadow.x ?? 0;
      const y = activeShadow.y ?? 0;
      const b = activeShadow.blur ?? 0;
      const s = activeShadow.spread ?? 0;
      const c = activeShadow.color || "rgba(0,0,0,0.15)";
      if (b !== 0 || s !== 0 || x !== 0 || y !== 0) {
        styles.boxShadow = `${inset ? "inset " : ""}${x}px ${y}px ${b}px ${s}px ${c}`;
      }
    }
  }

  const transition = borderVal.transition ?? 300;
  styles.transition = `all ${transition}ms ease`;

  return styles;
}

function getDimensionsStyles(obj: any, property: "margin" | "padding" | "borderRadius") {
  if (!obj || typeof obj !== "object") return {};
  const u = obj.unit || "px";
  if (u === "auto") return { [property]: "auto" };
  const t = obj.top === "" || obj.top === undefined ? 0 : obj.top;
  const r = obj.right === "" || obj.right === undefined ? 0 : obj.right;
  const b = obj.bottom === "" || obj.bottom === undefined ? 0 : obj.bottom;
  const l = obj.left === "" || obj.left === undefined ? 0 : obj.left;
  if (t === 0 && r === 0 && b === 0 && l === 0) return {};
  if (property === "borderRadius") {
    return { borderRadius: `${t}${u} ${r}${u} ${b}${u} ${l}${u}` };
  }
  return { [property]: `${t}${u} ${r}${u} ${b}${u} ${l}${u}` };
}

const blogImageElement = {
  type: "blog-image",
  category: "Blog Details",
  label: "Blog Image",
  icon: "solar:gallery-bold",

  schema: {
    style: {
      alignment: "center",
      width: 100,
      widthUnit: "%",
      height: 400,
      heightUnit: "px",
      objectFit: "cover",
      border: {
        normal: {
          type: "none",
          width: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
          color: "#e2e8f0",
          radius: { top: 16, right: 16, bottom: 16, left: 16, unit: "px" },
        },
        hover: {
          type: "none",
        },
        boxShadow: {
          normal: { x: 0, y: 4, blur: 12, spread: 0, color: "rgba(0,0,0,0.05)" },
          hover: { x: 0, y: 4, blur: 12, spread: 0, color: "rgba(0,0,0,0.05)" },
        },
        transition: 300,
      },
    },
    advanced: {
      margin: { top: 0, right: 0, bottom: 20, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    {
      tab: "Style",
      section: "Layout",
      controls: [
        {
          name: "alignment",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              value={value || "center"}
              onChange={onChange}
              label="Alignment"
              grid={2}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
          ),
        },
        {
          name: "width",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <NumberControl
                  value={value ?? 100}
                  onChange={onChange}
                  label="Width"
                  min={0}
                  max={2000}
                />
              </div>
              <div className="w-20">
                <Select
                  value={schema.style.widthUnit || "%"}
                  onChange={(v: string) => updateSchema("style", "widthUnit", v)}
                  label="Unit"
                  options={[
                    { value: "%", label: "%" },
                    { value: "px", label: "px" },
                    { value: "vw", label: "vw" },
                  ]}
                />
              </div>
            </div>
          ),
        },
        {
          name: "height",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <NumberControl
                  value={value ?? 400}
                  onChange={onChange}
                  label="Height"
                  min={0}
                  max={2000}
                />
              </div>
              <div className="w-20">
                <Select
                  value={schema.style.heightUnit || "px"}
                  onChange={(v: string) => updateSchema("style", "heightUnit", v)}
                  label="Unit"
                  options={[
                    { value: "px", label: "px" },
                    { value: "%", label: "%" },
                    { value: "vh", label: "vh" },
                    { value: "auto", label: "auto" },
                  ]}
                />
              </div>
            </div>
          ),
        },
        {
          name: "objectFit",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              value={value || "cover"}
              onChange={onChange}
              label="Object Fit"
              options={[
                { value: "cover", label: "Cover (Fill & Crop)" },
                { value: "contain", label: "Contain (Preserve Aspect)" },
                { value: "fill", label: "Fill (Stretch)" },
              ]}
            />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Border & Shadow",
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
    const align = s.style?.alignment || "center";
    const w = s.style?.width ?? 100;
    const wUnit = s.style?.widthUnit || "%";
    const h = s.style?.height ?? 400;
    const hUnit = s.style?.heightUnit || "px";
    const objectFit = s.style?.objectFit || "cover";

    const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
    const borderStyle = getBorderStyles(s.style?.border, false);
    const marginStyle = getDimensionsStyles(s.advanced?.margin, "margin");
    const paddingStyle = getDimensionsStyles(s.advanced?.padding, "padding");

    return (
      <div style={{ display: "flex", justifyContent: justify, width: "100%" }}>
        <img
          src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800"
          alt="Blog featured placeholder"
          style={{
            display: "block",
            width: wUnit === "auto" ? "auto" : `${w}${wUnit}`,
            height: hUnit === "auto" ? "auto" : `${h}${hUnit}`,
            objectFit: objectFit as any,
            boxSizing: "border-box",
            ...borderStyle,
            ...marginStyle,
            ...paddingStyle,
          }}
        />
      </div>
    );
  },
};

export default blogImageElement;
