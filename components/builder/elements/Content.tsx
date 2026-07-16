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
  ColorPickerPopup,
  Tabs,
  Typography,
} from "../controls";
import ContentEditor from "../../Content";

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

function getDimensionsStyles(obj: any, property: "margin" | "padding") {
  if (!obj || typeof obj !== "object") return {};
  const u = obj.unit || "px";
  if (u === "auto") return { [property]: "auto" };
  const t = obj.top === "" || obj.top === undefined ? 0 : obj.top;
  const r = obj.right === "" || obj.right === undefined ? 0 : obj.right;
  const b = obj.bottom === "" || obj.bottom === undefined ? 0 : obj.bottom;
  const l = obj.left === "" || obj.left === undefined ? 0 : obj.left;
  if (t === 0 && r === 0 && b === 0 && l === 0) return {};
  return { [property]: `${t}${u} ${r}${u} ${b}${u} ${l}${u}` };
}

function ContentFrontend({ element }: { element: any }) {
  const s = element.schema;

  // Content config
  const contentHtml: string = s.content?.content || "";
  const dropCap: boolean = s.content?.dropCap || false;
  const columns: string = s.content?.columns || "default";
  const columnsGap: number = s.content?.columnsGap ?? 20;

  // Style config
  const alignment: string = s.style?.alignment || "left";
  const paragraphSpacing: number = s.style?.paragraphSpacing ?? 16;
  const textShadow = s.style?.textShadow;

  const textColor: string = s.style?.textColor || "";
  const hoverTextColor: string = s.style?.hoverTextColor || "";
  const linkColor: string = s.style?.linkColor || "";
  const hoverLinkColor: string = s.style?.hoverLinkColor || "";

  // Spacing
  const margin = s.advanced?.margin || {};
  const padding = s.advanced?.padding || {};
  const marginStyle = getDimensionsStyles(margin, "margin");
  const paddingStyle = getDimensionsStyles(padding, "padding");

  const elementId = `content-el-${element.id}`;

  // Resolve columns styling
  let columnStyle: React.CSSProperties = {};
  if (columns !== "default" && columns !== "1") {
    columnStyle = {
      columnCount: parseInt(columns, 10),
      columnGap: `${columnsGap}px`,
    };
  }

  // Text shadow string
  let textShadowStr = "";
  if (textShadow && (textShadow.x !== 0 || textShadow.y !== 0 || textShadow.blur !== 0)) {
    textShadowStr = `${textShadow.x ?? 0}px ${textShadow.y ?? 0}px ${textShadow.blur ?? 0}px ${textShadow.color || "rgba(0,0,0,0.15)"}`;
  }

  const typStyles = getTypographyStyles(s.style?.typography || {});

  return (
    <div
      className={`w-full box-border ${elementId}`}
      style={{
        ...marginStyle,
        ...paddingStyle,
      }}
    >
      <style>{`
        .${elementId} {
          display: block;
          width: 100%;
        }
        .${elementId} .content-inner-wrapper {
          display: block;
          width: 100%;
          text-align: ${alignment};
          color: ${textColor || "inherit"};
          text-shadow: ${textShadowStr || "none"};
          transition: all 0.3s ease;
        }
        ${hoverTextColor ? `
        .${elementId}:hover .content-inner-wrapper {
          color: ${hoverTextColor};
        }
        ` : ""}
        .${elementId} .content-inner-wrapper p {
          margin-top: 0;
          margin-bottom: ${paragraphSpacing}px;
        }
        .${elementId} .content-inner-wrapper p:last-child {
          margin-bottom: 0;
        }
        .${elementId} .content-inner-wrapper a {
          color: ${linkColor || "inherit"};
          transition: color 0.3s ease;
        }
        ${hoverLinkColor ? `
        .${elementId} .content-inner-wrapper a:hover {
          color: ${hoverLinkColor};
        }
        ` : ""}
        ${dropCap ? `
        .${elementId} .content-inner-wrapper p:first-of-type::first-letter {
          float: left;
          font-size: 3.2em;
          line-height: 0.85;
          margin: 0.05em 0.1em 0 0;
          font-weight: bold;
        }
        ` : ""}
      `}</style>
      <div
        className="content-inner-wrapper description w-full"
        style={{
          ...typStyles,
          ...columnStyle,
        }}
        dangerouslySetInnerHTML={{ __html: contentHtml || "<p>Start writing content...</p>" }}
      />
    </div>
  );
}

function TextShadowControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const shadow = value || { x: 0, y: 0, blur: 0, color: "rgba(0,0,0,0.15)" };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-700">Text Shadow</span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center justify-center w-7 h-7 border rounded cursor-pointer transition-colors ${open
              ? "border-blue-300 bg-blue-50 text-blue-500"
              : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
          }`}
        >
          <Icon icon="solar:pen-bold" width="13" />
        </button>
      </div>
      {open && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <NumberControl label="Offset X" value={shadow.x ?? 0} onChange={(v) => onChange({ ...shadow, x: v })} min={-50} max={50} />
          <NumberControl label="Offset Y" value={shadow.y ?? 0} onChange={(v) => onChange({ ...shadow, y: v })} min={-50} max={50} />
          <NumberControl label="Blur" value={shadow.blur ?? 0} onChange={(v) => onChange({ ...shadow, blur: v })} min={0} max={50} />
          <ColorPickerPopup label="Shadow Color" value={shadow.color || "rgba(0,0,0,0.15)"} onChange={(v) => onChange({ ...shadow, color: v })} />
        </div>
      )}
    </div>
  );
}

const contentElement = {
  type: "content-element",
  category: "Basic",
  label: "Text Editor",
  icon: "solar:document-text-bold-duotone",

  schema: {
    content: {
      content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.</p>",
      dropCap: false,
      columns: "default",
      columnsGap: 20,
    },

    style: {
      alignment: "left",
      paragraphSpacing: 16,
      textShadow: { x: 0, y: 0, blur: 0, color: "rgba(0,0,0,0.15)" },
      textColor: "#374151",
      hoverTextColor: "",
      linkColor: "",
      hoverLinkColor: "",
      typography: {
        fontSize: 16,
        fontSizeUnit: "px",
        fontWeight: "400",
        lineHeight: 1.6,
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
      section: "Text Editor",
      controls: [
        {
          name: "content",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ContentEditor content={value || ""} onChange={onChange} label="" />
          ),
        },
        {
          name: "dropCap",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Drop Cap" value={!!value} onChange={onChange} />
          ),
        },
        {
          name: "columns",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Select
              label="Columns"
              value={value ?? "default"}
              onChange={onChange}
              options={[
                { value: "default", label: "Default" },
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
              ]}
            />
          ),
        },
        {
          name: "columnsGap",
          responsive: true,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.content.columns !== "default" && schema.content.columns !== "1" ? (
              <NumberControl label="Columns Gap" value={value ?? 20} onChange={onChange} min={0} max={100} />
            ) : null
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ══════════════════
    {
      tab: "Style",
      section: "Text Editor Settings",
      controls: [
        {
          name: "alignment",
          responsive: true,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              label="Alignment"
              value={value ?? "left"}
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
          name: "typography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography label="Typography" value={value} onChange={onChange} />
          ),
        },
        {
          name: "textShadow",
          responsive: false,
          render: (value: any, onChange: any) => (
            <TextShadowControl value={value} onChange={onChange} />
          ),
        },
        {
          name: "paragraphSpacing",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Paragraph Spacing" value={value ?? 16} onChange={onChange} min={0} max={100} />
          ),
        },
        {
          name: "textColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal",
                  content: (
                    <div className="space-y-4 pt-2">
                      <ColorPickerPopup label="Text Color" value={value ?? "#374151"} onChange={onChange} />
                      <ColorPickerPopup
                        label="Link Color"
                        value={schema.style.linkColor || ""}
                        onChange={(v: string) => updateSchema("style", "linkColor", v)}
                      />
                    </div>
                  ),
                },
                {
                  label: "Hover",
                  content: (
                    <div className="space-y-4 pt-2">
                      <ColorPickerPopup
                        label="Text Hover Color"
                        value={schema.style.hoverTextColor || ""}
                        onChange={(v: string) => updateSchema("style", "hoverTextColor", v)}
                      />
                      <ColorPickerPopup
                        label="Link Hover Color"
                        value={schema.style.hoverLinkColor || ""}
                        onChange={(v: string) => updateSchema("style", "hoverLinkColor", v)}
                      />
                    </div>
                  ),
                },
              ]}
            />
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

  render: (element: any) => <ContentFrontend element={element} />,
};

export default contentElement;
