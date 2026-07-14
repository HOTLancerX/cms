"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import {
  Text,
  Select,
  ButtonGroup,
  Toggle,
  NumberControl,
  Dimensions,
  ImageGallery,
  Url,
  ColorPickerPopup,
  Tabs,
} from "../controls";

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

function ImageFrontend({ element }: { element: any }) {
  const s = element.schema;
  const [hovered, setHovered] = useState(false);

  // Content configurations
  const image: string = s.content?.image || "";
  const captionType: "none" | "custom" = s.content?.captionType || "none";
  const captionText: string = s.content?.captionText || "";
  const linkType: "none" | "custom" = s.content?.linkType || "none";
  const link: any = s.content?.link || {};

  // If no image is provided, do not render it in the frontend view
  if (!image) {
    return null;
  }

  // Styles configuration
  const alignment: "left" | "center" | "right" = s.style?.alignment || "center";
  const widthVal: number = s.style?.width ?? 100;
  const widthUnit: string = s.style?.widthUnit || "%";
  const maxWidthVal: number = s.style?.maxWidth ?? 100;
  const maxWidthUnit: string = s.style?.maxWidthUnit || "%";
  const heightVal: number = s.style?.height ?? 0;
  const heightUnit: string = s.style?.heightUnit || "px";

  const opacity: number = s.style?.opacity ?? 1;
  const hoverOpacity: number = s.style?.hoverOpacity ?? 1;

  // CSS filter settings
  const blur: number = s.style?.blur ?? 0;
  const brightness: number = s.style?.brightness ?? 100;
  const contrast: number = s.style?.contrast ?? 100;
  const grayscale: number = s.style?.grayscale ?? 0;

  const hoverBlur: number = s.style?.hoverBlur ?? 0;
  const hoverBrightness: number = s.style?.hoverBrightness ?? 100;
  const hoverContrast: number = s.style?.hoverContrast ?? 100;
  const hoverGrayscale: number = s.style?.hoverGrayscale ?? 0;

  const borderType: string = s.style?.borderType || "none";
  const borderColor: string = s.style?.borderColor || "#e2e8f0";
  const borderWidth: number = s.style?.borderWidth ?? 1;
  const borderRadius = s.style?.borderRadius || {};

  const margin = s.advanced?.margin || {};
  const padding = s.advanced?.padding || {};
  const marginStyle = getDimensionsStyles(margin, "margin");
  const paddingStyle = getDimensionsStyles(padding, "padding");
  const radiusStyle = getDimensionsStyles(borderRadius, "borderRadius");

  // Aligner wrapper rules
  let alignClass = "justify-center";
  if (alignment === "left") alignClass = "justify-start";
  else if (alignment === "right") alignClass = "justify-end";

  // Build filter strings
  const currentBlur = hovered ? hoverBlur : blur;
  const currentBrightness = hovered ? hoverBrightness : brightness;
  const currentContrast = hovered ? hoverContrast : contrast;
  const currentGrayscale = hovered ? hoverGrayscale : grayscale;

  const filterStyle = `blur(${currentBlur}px) brightness(${currentBrightness}%) contrast(${currentContrast}%) grayscale(${currentGrayscale}%)`;

  const imgStyle: React.CSSProperties = {
    width: widthVal > 0 ? `${widthVal}${widthUnit}` : "auto",
    maxWidth: maxWidthVal > 0 ? `${maxWidthVal}${maxWidthUnit}` : "100%",
    height: heightVal > 0 ? `${heightVal}${heightUnit}` : "auto",
    opacity: hovered ? hoverOpacity : opacity,
    filter: filterStyle,
    border: borderType !== "none" ? `${borderWidth}px ${borderType} ${borderColor}` : "none",
    ...radiusStyle,
    transition: "all 0.3s ease",
  };

  const imageNode = (
    <img
      src={image}
      alt={captionType === "custom" ? captionText : "Image"}
      style={imgStyle}
      className="object-cover max-w-full block"
    />
  );

  const finalNode =
    linkType === "custom" && link?.url ? (
      <a
        href={link.url}
        target={link.target || undefined}
        rel={link.nofollow ? "nofollow" : undefined}
        className="inline-block no-underline"
        style={{ fontSize: 0 }}
      >
        {imageNode}
      </a>
    ) : (
      imageNode
    );

  return (
    <div
      className={`w-full flex flex-col items-center ${alignClass}`}
      style={{
        ...marginStyle,
        ...paddingStyle,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-col max-w-full">
        {finalNode}
        {captionType === "custom" && captionText && (
          <span className="text-xs text-gray-500 mt-2 text-center block w-full italic">
            {captionText}
          </span>
        )}
      </div>
    </div>
  );
}

const imageElement = {
  type: "single-image",
  category: "Basic",
  label: "Image",
  icon: "solar:gallery-wide-bold-duotone",

  schema: {
    content: {
      image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1024&auto=format&fit=crop",
      captionType: "none",
      captionText: "",
      linkType: "none",
      link: { url: "" },
    },

    style: {
      alignment: "center",
      width: 100,
      widthUnit: "%",
      maxWidth: 100,
      maxWidthUnit: "%",
      height: 0,
      heightUnit: "px",
      opacity: 1,
      hoverOpacity: 1,
      blur: 0,
      brightness: 100,
      contrast: 100,
      grayscale: 0,
      hoverBlur: 0,
      hoverBrightness: 100,
      hoverContrast: 100,
      hoverGrayscale: 0,
      borderType: "none",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      borderRadius: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },

    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    // ═══════════════════ CONTENT TAB ════════════════
    {
      tab: "Content",
      section: "Image Options",
      controls: [
        {
          name: "image",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ImageGallery label="Select Image" value={value} onChange={onChange} />
          ),
        },
        {
          name: "captionType",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Caption"
              value={value ?? "none"}
              onChange={onChange}
              options={[
                { value: "none", label: "None" },
                { value: "custom", label: "Custom Caption" },
              ]}
            />
          ),
        },
        {
          name: "captionText",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.content.captionType === "custom" ? (
              <Text label="Caption Text" value={value || ""} onChange={onChange} />
            ) : null
          ),
        },
        {
          name: "linkType",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Link redirect type"
              value={value ?? "none"}
              onChange={onChange}
              options={[
                { value: "none", label: "None" },
                { value: "custom", label: "Custom URL" },
              ]}
            />
          ),
        },
        {
          name: "link",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.content.linkType === "custom" ? (
              <Url label="Destination Link" value={value || { url: "" }} onChange={onChange} />
            ) : null
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ══════════════════
    {
      tab: "Style",
      section: "Layout Dimensions",
      controls: [
        {
          name: "alignment",
          responsive: true,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              label="Alignment"
              value={value ?? "center"}
              onChange={onChange}
              options={[
                { value: "left", icon: "mdi:format-align-left" },
                { value: "center", icon: "mdi:format-align-center" },
                { value: "right", icon: "mdi:format-align-right" },
              ]}
            />
          ),
        },
        {
          name: "width",
          responsive: true,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Width</span>
                <select
                  value={schema.style.widthUnit || "%"}
                  onChange={(e) => updateSchema("style", "widthUnit", e.target.value)}
                  className="bg-gray-800 text-white text-[11px] border border-gray-700 rounded px-1.5 py-0.5"
                >
                  <option value="%">%</option>
                  <option value="px">px</option>
                  <option value="vw">vw</option>
                </select>
              </div>
              <NumberControl value={value ?? 100} onChange={onChange} min={0} max={1600} />
            </div>
          ),
        },
        {
          name: "maxWidth",
          responsive: true,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Max Width</span>
                <select
                  value={schema.style.maxWidthUnit || "%"}
                  onChange={(e) => updateSchema("style", "maxWidthUnit", e.target.value)}
                  className="bg-gray-800 text-white text-[11px] border border-gray-700 rounded px-1.5 py-0.5"
                >
                  <option value="%">%</option>
                  <option value="px">px</option>
                  <option value="vw">vw</option>
                </select>
              </div>
              <NumberControl value={value ?? 100} onChange={onChange} min={0} max={1600} />
            </div>
          ),
        },
        {
          name: "height",
          responsive: true,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Height</span>
                <select
                  value={schema.style.heightUnit || "px"}
                  onChange={(e) => updateSchema("style", "heightUnit", e.target.value)}
                  className="bg-gray-800 text-white text-[11px] border border-gray-700 rounded px-1.5 py-0.5"
                >
                  <option value="px">px</option>
                  <option value="vh">vh</option>
                </select>
              </div>
              <NumberControl value={value ?? 0} onChange={onChange} min={0} max={1200} />
            </div>
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Visual Adjustments",
      controls: [
        {
          name: "opacity",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal",
                  content: (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Opacity</span>
                        <span>{Math.round((value ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={value ?? 1}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="w-full cursor-pointer accent-indigo-500"
                      />
                      <NumberControl label="Blur Filter (px)" value={schema.style.blur ?? 0} onChange={(v) => updateSchema("style", "blur", v)} min={0} max={20} />
                      <NumberControl label="Brightness (%)" value={schema.style.brightness ?? 100} onChange={(v) => updateSchema("style", "brightness", v)} min={0} max={200} />
                      <NumberControl label="Contrast (%)" value={schema.style.contrast ?? 100} onChange={(v) => updateSchema("style", "contrast", v)} min={0} max={200} />
                      <NumberControl label="Grayscale (%)" value={schema.style.grayscale ?? 0} onChange={(v) => updateSchema("style", "grayscale", v)} min={0} max={100} />
                    </div>
                  ),
                },
                {
                  label: "Hover",
                  content: (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Hover Opacity</span>
                        <span>{Math.round((schema.style.hoverOpacity ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={schema.style.hoverOpacity ?? 1}
                        onChange={(e) => updateSchema("style", "hoverOpacity", parseFloat(e.target.value))}
                        className="w-full cursor-pointer accent-indigo-500"
                      />
                      <NumberControl label="Hover Blur (px)" value={schema.style.hoverBlur ?? 0} onChange={(v) => updateSchema("style", "hoverBlur", v)} min={0} max={20} />
                      <NumberControl label="Hover Brightness (%)" value={schema.style.hoverBrightness ?? 100} onChange={(v) => updateSchema("style", "hoverBrightness", v)} min={0} max={200} />
                      <NumberControl label="Hover Contrast (%)" value={schema.style.hoverContrast ?? 100} onChange={(v) => updateSchema("style", "hoverContrast", v)} min={0} max={200} />
                      <NumberControl label="Hover Grayscale (%)" value={schema.style.hoverGrayscale ?? 0} onChange={(v) => updateSchema("style", "hoverGrayscale", v)} min={0} max={100} />
                    </div>
                  ),
                },
              ]}
            />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Border Settings",
      controls: [
        {
          name: "borderType",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Border Type"
              value={value ?? "none"}
              onChange={onChange}
              options={[
                { value: "none", label: "None" },
                { value: "solid", label: "Solid" },
                { value: "dashed", label: "Dashed" },
                { value: "dotted", label: "Dotted" },
                { value: "double", label: "Double" },
                { value: "groove", label: "Groove" },
              ]}
            />
          ),
        },
        {
          name: "borderWidth",
          responsive: true,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.style.borderType !== "none" ? (
              <NumberControl label="Border Width (px)" value={value ?? 1} onChange={onChange} min={1} max={16} />
            ) : null
          ),
        },
        {
          name: "borderColor",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.style.borderType !== "none" ? (
              <ColorPickerPopup label="Border Color" value={value ?? "#e2e8f0"} onChange={onChange} />
            ) : null
          ),
        },
        {
          name: "borderRadius",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" label="Border Radius" value={value} onChange={onChange} />
          ),
        },
      ],
    },

    // ═══════════════════ ADVANCED TAB ═══════════════
    {
      tab: "Advanced",
      section: "Spacing Bounds",
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
  ],

  render: (element: any) => <ImageFrontend element={element} />,
};

export default imageElement;
