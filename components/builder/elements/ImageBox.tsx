"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import {
  Text,
  Textarea,
  Select,
  ButtonGroup,
  Toggle,
  NumberControl,
  Dimensions,
  ImageGallery,
  Url,
  ColorPickerPopup,
  Tabs,
  Typography,
} from "../controls";

function getTypographyStyles(value: any) {
  if (!value || typeof value !== "object") return {};
  const styles: React.CSSProperties = {};
  if (value.fontFamily) styles.fontFamily = value.fontFamily;
  if (value.fontSize) styles.fontSize = `${value.fontSize}${value.fontSizeUnit || "px"}`;
  if (value.fontWeight) styles.fontWeight = value.fontWeight;
  if (value.textTransform) styles.textTransform = value.textTransform as any;
  if (value.fontStyle) styles.fontStyle = value.fontStyle;
  if (value.textDecoration) styles.textDecoration = value.textDecoration;
  if (value.lineHeight && value.lineHeight > 0)
    styles.lineHeight = `${value.lineHeight}${value.lineHeightUnit || "px"}`;
  if (value.letterSpacing !== undefined && value.letterSpacing !== 0)
    styles.letterSpacing = `${value.letterSpacing}${value.letterSpacingUnit || "px"}`;
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

function ImageBoxFrontend({ element }: { element: any }) {
  const s = element.schema;
  const [hovered, setHovered] = useState(false);

  // Content configurations
  const image: string = s.content?.image || "";
  const title: string = s.content?.title || "";
  const description: string = s.content?.description || "";
  const link: any = s.content?.link || {};
  const titleTag: string = s.content?.titleTag || "h3";

  // Check if link is configured
  const hasLink = !!(link && link.url);

  // Box configurations
  const imagePosition: "left" | "top" | "right" = s.style?.imagePosition || "top";
  const alignment: "left" | "center" | "right" | "justify" = s.style?.alignment || "center";
  const imageSpacing: number = s.style?.imageSpacing ?? 15;
  const contentSpacing: number = s.style?.contentSpacing ?? 8;

  // Image configurations
  const imageWidth: number = s.style?.imageWidth ?? 100;
  const imageWidthUnit: string = s.style?.imageWidthUnit || "%";
  const imageHeight: number = s.style?.imageHeight ?? 200;
  const imageHeightUnit: string = s.style?.imageHeightUnit || "px";

  const borderType: string = s.style?.borderType || "none";
  const borderColor: string = s.style?.borderColor || "#e2e8f0";
  const borderWidth: number = s.style?.borderWidth ?? 1;
  const borderRadius = s.style?.borderRadius || {};

  const opacity: number = s.style?.opacity ?? 1;
  const hoverOpacity: number = s.style?.hoverOpacity ?? 1;

  // Image CSS filters
  const blur: number = s.style?.blur ?? 0;
  const brightness: number = s.style?.brightness ?? 100;
  const contrast: number = s.style?.contrast ?? 100;
  const grayscale: number = s.style?.grayscale ?? 0;

  const hoverBlur: number = s.style?.hoverBlur ?? 0;
  const hoverBrightness: number = s.style?.hoverBrightness ?? 100;
  const hoverContrast: number = s.style?.hoverContrast ?? 100;
  const hoverGrayscale: number = s.style?.hoverGrayscale ?? 0;

  // Text colors
  const titleNormalColor: string = s.style?.titleNormalColor || "#111827";
  const titleHoverColor: string = s.style?.titleHoverColor || "#4f46e5";
  const titleTyp = getTypographyStyles(s.style?.titleTypography || {});

  const descNormalColor: string = s.style?.descNormalColor || "#4b5563";
  const descHoverColor: string = s.style?.descHoverColor || "#374151";
  const descTyp = getTypographyStyles(s.style?.descTypography || {});

  const margin = s.advanced?.margin || {};
  const padding = s.advanced?.padding || {};
  const marginStyle = getDimensionsStyles(margin, "margin");
  const paddingStyle = getDimensionsStyles(padding, "padding");
  const radiusStyle = getDimensionsStyles(borderRadius, "borderRadius");

  // Flex alignment configurations
  let flexDir = "flex-col";
  if (imagePosition === "left") flexDir = "flex-row";
  else if (imagePosition === "right") flexDir = "flex-row-reverse";

  let textAlign: "left" | "center" | "right" | "justify" = "center";
  if (alignment === "left") textAlign = "left";
  else if (alignment === "right") textAlign = "right";
  else if (alignment === "justify") textAlign = "justify";

  let crossAlign = "items-center";
  if (alignment === "left") crossAlign = "items-start";
  else if (alignment === "right") crossAlign = "items-end";

  // Build filter strings
  const currentBlur = hovered ? hoverBlur : blur;
  const currentBrightness = hovered ? hoverBrightness : brightness;
  const currentContrast = hovered ? hoverContrast : contrast;
  const currentGrayscale = hovered ? hoverGrayscale : grayscale;
  const filterStyle = `blur(${currentBlur}px) brightness(${currentBrightness}%) contrast(${currentContrast}%) grayscale(${currentGrayscale}%)`;

  const imgStyle: React.CSSProperties = {
    width: imageWidth > 0 ? `${imageWidth}${imageWidthUnit}` : "100%",
    height: imageHeight > 0 ? `${imageHeight}${imageHeightUnit}` : "auto",
    opacity: hovered ? hoverOpacity : opacity,
    filter: filterStyle,
    border: borderType !== "none" ? `${borderWidth}px ${borderType} ${borderColor}` : "none",
    ...radiusStyle,
    transition: "all 0.3s ease",
  };

  const imageNode = image ? (
    <div
      className="shrink-0 overflow-hidden"
      style={{
        width: imagePosition !== "top" ? `${imageWidth}${imageWidthUnit}` : "100%",
        marginBottom: imagePosition === "top" ? `${imageSpacing}px` : 0,
        marginRight: imagePosition === "left" ? `${imageSpacing}px` : 0,
        marginLeft: imagePosition === "right" ? `${imageSpacing}px` : 0,
      }}
    >
      <img
        src={image}
        alt={title || "Image box visual"}
        style={imgStyle}
        className="w-full h-full object-cover block"
      />
    </div>
  ) : null;

  const TitleComponent = titleTag as any;

  const textNode = (
    <div
      className={`flex flex-col ${crossAlign} w-full`}
      style={{ textAlign }}
    >
      {title && (
        <TitleComponent
          className="m-0 transition-all duration-300"
          style={{
            color: hovered && titleHoverColor ? titleHoverColor : titleNormalColor || "inherit",
            marginBottom: `${contentSpacing}px`,
            ...titleTyp,
          }}
        >
          {title}
        </TitleComponent>
      )}
      {description && (
        <p
          className="m-0 transition-all duration-300"
          style={{
            color: hovered && descHoverColor ? descHoverColor : descNormalColor || "inherit",
            ...descTyp,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );

  const innerBlock = (
    <div className={`flex w-full ${flexDir} items-center`}>
      {imageNode}
      {textNode}
    </div>
  );

  return (
    <div
      className="w-full box-border"
      style={{
        ...marginStyle,
        ...paddingStyle,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hasLink ? (
        <a
          href={link.url}
          target={link.target || undefined}
          rel={link.nofollow ? "nofollow" : undefined}
          className="w-full block no-underline text-inherit"
        >
          {innerBlock}
        </a>
      ) : (
        innerBlock
      )}
    </div>
  );
}

const imageBoxElement = {
  type: "image-box-element",
  category: "Basic",
  label: "Image Box",
  icon: "solar:album-bold-duotone",

  schema: {
    content: {
      image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1024&auto=format&fit=crop",
      title: "This is the Heading",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.",
      link: { url: "" },
      titleTag: "h3",
    },

    style: {
      imagePosition: "top",
      alignment: "center",
      imageSpacing: 15,
      contentSpacing: 8,
      imageWidth: 100,
      imageWidthUnit: "%",
      imageHeight: 200,
      imageHeightUnit: "px",
      borderType: "none",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      borderRadius: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
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
      titleNormalColor: "#111827",
      titleHoverColor: "#4f46e5",
      descNormalColor: "#4b5563",
      descHoverColor: "#374151",
      titleTypography: {
        fontSize: 20,
        fontSizeUnit: "px",
        fontWeight: "600",
      },
      descTypography: {
        fontSize: 14,
        fontSizeUnit: "px",
        fontWeight: "400",
      },
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
      section: "Box Content",
      controls: [
        {
          name: "image",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ImageGallery label="Select Image" value={value} onChange={onChange} />
          ),
        },
        {
          name: "title",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="Title" value={value || ""} onChange={onChange} />
          ),
        },
        {
          name: "description",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Textarea label="Description" value={value || ""} onChange={onChange} rows={4} />
          ),
        },
        {
          name: "link",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Url label="Link Destination" value={value || { url: "" }} onChange={onChange} />
          ),
        },
        {
          name: "titleTag",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Title HTML Tag"
              value={value ?? "h3"}
              onChange={onChange}
              options={[
                { value: "h1", label: "H1" },
                { value: "h2", label: "H2" },
                { value: "h3", label: "H3" },
                { value: "h4", label: "H4" },
                { value: "h5", label: "H5" },
                { value: "h6", label: "H6" },
                { value: "div", label: "div" },
                { value: "span", label: "span" },
                { value: "p", label: "p" },
              ]}
            />
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ══════════════════
    {
      tab: "Style",
      section: "Box Settings",
      controls: [
        {
          name: "imagePosition",
          responsive: true,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              label="Image Position"
              value={value ?? "top"}
              onChange={onChange}
              options={[
                { value: "left", icon: "mdi:align-horizontal-left" },
                { value: "top", icon: "mdi:align-vertical-top" },
                { value: "right", icon: "mdi:align-horizontal-right" },
              ]}
            />
          ),
        },
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
                { value: "justify", icon: "mdi:format-align-justify" },
              ]}
            />
          ),
        },
        {
          name: "imageSpacing",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Image Spacing (px)" value={value ?? 15} onChange={onChange} min={0} max={100} />
          ),
        },
        {
          name: "contentSpacing",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Content Spacing (px)" value={value ?? 8} onChange={onChange} min={0} max={100} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Image Settings",
      controls: [
        {
          name: "imageWidth",
          responsive: true,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Width</span>
                <select
                  value={schema.style.imageWidthUnit || "%"}
                  onChange={(e) => updateSchema("style", "imageWidthUnit", e.target.value)}
                  className="bg-gray-800 text-white text-[11px] border border-gray-700 rounded px-1.5 py-0.5"
                >
                  <option value="%">%</option>
                  <option value="px">px</option>
                </select>
              </div>
              <NumberControl value={value ?? 100} onChange={onChange} min={5} max={1000} />
            </div>
          ),
        },
        {
          name: "imageHeight",
          responsive: true,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Height</span>
                <select
                  value={schema.style.imageHeightUnit || "px"}
                  onChange={(e) => updateSchema("style", "imageHeightUnit", e.target.value)}
                  className="bg-gray-800 text-white text-[11px] border border-gray-700 rounded px-1.5 py-0.5"
                >
                  <option value="px">px</option>
                  <option value="vh">vh</option>
                </select>
              </div>
              <NumberControl value={value ?? 200} onChange={onChange} min={0} max={1000} />
            </div>
          ),
        },
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
                      <NumberControl label="Blur (px)" value={schema.style.blur ?? 0} onChange={(v) => updateSchema("style", "blur", v)} min={0} max={20} />
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
      section: "Content Settings",
      controls: [
        {
          name: "titleNormalColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Title Normal",
                  content: <ColorPickerPopup label="Title Color" value={value ?? "#111827"} onChange={onChange} />,
                },
                {
                  label: "Title Hover",
                  content: (
                    <ColorPickerPopup
                      label="Title Hover Color"
                      value={schema.style.titleHoverColor || ""}
                      onChange={(v: string) => updateSchema("style", "titleHoverColor", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "titleTypography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography label="Title Typography" value={value} onChange={onChange} />
          ),
        },
        {
          name: "descNormalColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Desc Normal",
                  content: <ColorPickerPopup label="Description Color" value={value ?? "#4b5563"} onChange={onChange} />,
                },
                {
                  label: "Desc Hover",
                  content: (
                    <ColorPickerPopup
                      label="Description Hover Color"
                      value={schema.style.descHoverColor || ""}
                      onChange={(v: string) => updateSchema("style", "descHoverColor", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "descTypography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography label="Description Typography" value={value} onChange={onChange} />
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

  render: (element: any) => <ImageBoxFrontend element={element} />,
};

export default imageBoxElement;
