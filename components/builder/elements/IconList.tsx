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
  Typography,
  Section,
  Url,
  IconPicker,
  ColorPickerPopup,
  Tabs,
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

interface IconListItem {
  title: string;
  content: string;
  icon?: string;
  link?: {
    url: string;
    target?: string;
    nofollow?: boolean;
    customAttributes?: string;
  };
}

function ListItemComponent({
  item,
  idx,
  layout,
  space,
  align,
  divider,
  dividerColor,
  dividerStyle,
  iconSize,
  iconGap,
  iconVAlign,
  iconOffset,
  iconColor,
  iconHoverColor,
  titleNormalColor,
  titleHoverColor,
  titleTyp,
  contentNormalColor,
  contentHoverColor,
  contentTyp,
  hoverAnimation,
  isLast,
}: {
  item: IconListItem;
  idx: number;
  layout: "vertical" | "horizontal";
  space: number;
  align: string;
  divider: boolean;
  dividerColor: string;
  dividerStyle: string;
  iconSize: number;
  iconGap: number;
  iconVAlign: "top" | "center" | "bottom";
  iconOffset: number;
  iconColor: string;
  iconHoverColor: string;
  titleNormalColor: string;
  titleHoverColor: string;
  titleTyp: React.CSSProperties;
  contentNormalColor: string;
  contentHoverColor: string;
  contentTyp: React.CSSProperties;
  hoverAnimation: string;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const hasLink = !!(item.link && item.link.url);

  // Vertical alignment
  let alignClass = "items-center";
  if (iconVAlign === "top") alignClass = "items-start";
  else if (iconVAlign === "bottom") alignClass = "items-end";

  // Icon Node
  const iconNode = item.icon ? (
    <span
      className="inline-flex shrink-0 transition-all duration-300"
      style={{
        fontSize: `${iconSize}px`,
        color: hovered && iconHoverColor ? iconHoverColor : iconColor || "inherit",
        marginRight: `${iconGap}px`,
        marginTop: `${iconOffset}px`,
        transform: hovered && hoverAnimation === "rotate-icon" ? "rotate(15deg)" : "none",
      }}
    >
      <Icon icon={item.icon} width={iconSize} height={iconSize} />
    </span>
  ) : null;

  // Text details block containing title & content description
  const textDetails = (
    <div className="flex flex-col text-left">
      <h4
        className="m-0 transition-all duration-300"
        style={{
          color: hovered && titleHoverColor ? titleHoverColor : titleNormalColor || "inherit",
          ...titleTyp,
        }}
      >
        {item.title || `Item Title #${idx + 1}`}
      </h4>
      {item.content && (
        <p
          className="m-0 mt-1 transition-all duration-300"
          style={{
            color: hovered && contentHoverColor ? contentHoverColor : contentNormalColor || "inherit",
            ...contentTyp,
          }}
        >
          {item.content}
        </p>
      )}
    </div>
  );

  // Outer layout wrap
  const contentNode = (
    <div className={`flex ${alignClass} ${layout === "vertical" ? "w-full" : "w-auto"}`}>
      {iconNode}
      {textDetails}
    </div>
  );

  // Hover animation
  let animStyle: React.CSSProperties = {};
  if (hovered) {
    if (hoverAnimation === "shift-right") {
      animStyle.transform = "translateX(6px)";
    } else if (hoverAnimation === "scale") {
      animStyle.transform = "scale(1.03)";
    } else if (hoverAnimation === "bounce") {
      animStyle.transform = "translateY(-3px)";
    }
  }

  const itemInner = (
    <div
      className={`flex items-center ${layout === "vertical" ? "w-full" : "w-auto"} transition-all duration-300`}
      style={animStyle}
    >
      {hasLink ? (
        <a
          href={item.link?.url}
          target={item.link?.target || undefined}
          rel={item.link?.nofollow ? "nofollow" : undefined}
          className={`${layout === "vertical" ? "w-full" : "w-auto"} flex items-center no-underline`}
          style={{ color: "inherit" }}
        >
          {contentNode}
        </a>
      ) : (
        contentNode
      )}
    </div>
  );

  // Dividers calculation
  let dividerStyleObj: React.CSSProperties = {};
  if (divider && !isLast) {
    const borderVal = `1px ${dividerStyle} ${dividerColor || "#e2e8f0"}`;
    if (layout === "vertical") {
      dividerStyleObj.borderBottom = borderVal;
      dividerStyleObj.paddingBottom = `${space / 2}px`;
      dividerStyleObj.marginBottom = `${space / 2}px`;
    } else {
      dividerStyleObj.borderRight = borderVal;
      dividerStyleObj.paddingRight = `${space}px`;
      dividerStyleObj.marginRight = `${space}px`;
    }
  } else if (!isLast) {
    if (layout === "vertical") {
      dividerStyleObj.marginBottom = `${space}px`;
    } else {
      dividerStyleObj.marginRight = `${space}px`;
    }
  }

  return (
    <li
      className={`list-none flex items-center box-border ${layout === "vertical" ? "w-full" : "w-auto shrink-0"}`}
      style={{
        ...dividerStyleObj,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {itemInner}
    </li>
  );
}

function IconListFrontend({ element }: { element: any }) {
  const s = element.schema;

  const layout: "vertical" | "horizontal" = s.content?.layout || "vertical";
  const items: IconListItem[] = s.content?.items || [];

  const space: number = s.style?.space ?? 16;
  const alignment: string = s.style?.alignment || "left";
  const divider: boolean = s.style?.divider ?? false;
  const dividerColor: string = s.style?.dividerColor || "#e2e8f0";
  const dividerStyle: string = s.style?.dividerStyle || "solid";

  const iconColor: string = s.style?.iconColor || "#4f46e5";
  const iconHoverColor: string = s.style?.iconHoverColor || "#6366f1";
  const iconSize: number = s.style?.iconSize ?? 18;
  const iconGap: number = s.style?.iconGap ?? 12;
  const iconVAlign: "top" | "center" | "bottom" = s.style?.iconVAlign || "top";
  const iconOffset: number = s.style?.iconOffset ?? 0;

  const titleNormalColor: string = s.style?.titleNormalColor || "#111827";
  const titleHoverColor: string = s.style?.titleHoverColor || "#4f46e5";
  const hoverAnimation: string = s.style?.hoverAnimation || "shift-right";
  const titleTyp = getTypographyStyles(s.style?.titleTypography || {});

  const contentNormalColor: string = s.style?.contentNormalColor || "#4b5563";
  const contentHoverColor: string = s.style?.contentHoverColor || "#374151";
  const contentTyp = getTypographyStyles(s.style?.contentTypography || {});

  const margin = s.advanced?.margin || {};
  const padding = s.advanced?.padding || {};
  const marginStyle = getDimensionsStyles(margin, "margin");
  const paddingStyle = getDimensionsStyles(padding, "padding");

  let alignCls = "justify-start";
  if (alignment === "center") alignCls = "justify-center";
  else if (alignment === "right") alignCls = "justify-end";

  return (
    <ul
      className={`p-0 m-0 box-border flex ${
        layout === "vertical" ? "flex-col w-full" : "flex-row flex-wrap"
      } ${alignCls}`}
      style={{
        ...marginStyle,
        ...paddingStyle,
      }}
    >
      {items.map((item, idx) => (
        <ListItemComponent
          key={idx}
          item={item}
          idx={idx}
          layout={layout}
          space={space}
          align={alignment}
          divider={divider}
          dividerColor={dividerColor}
          dividerStyle={dividerStyle}
          iconSize={iconSize}
          iconGap={iconGap}
          iconVAlign={iconVAlign}
          iconOffset={iconOffset}
          iconColor={iconColor}
          iconHoverColor={iconHoverColor}
          titleNormalColor={titleNormalColor}
          titleHoverColor={titleHoverColor}
          titleTyp={titleTyp}
          contentNormalColor={contentNormalColor}
          contentHoverColor={contentHoverColor}
          contentTyp={contentTyp}
          hoverAnimation={hoverAnimation}
          isLast={idx === items.length - 1}
        />
      ))}
    </ul>
  );
}

const iconListElement = {
  type: "icon-lists",
  category: "Basic",
  label: "Icon Lists",
  icon: "solar:playlist-2-bold-duotone",

  schema: {
    content: {
      layout: "vertical",
      items: [
        {
          title: "Feature Item One",
          content: "Describe the key value of this special product feature briefly.",
          icon: "solar:star-bold",
          link: { url: "" },
        },
        {
          title: "Feature Item Two",
          content: "Provide client benefits or outline details of user success guarantees.",
          icon: "solar:check-circle-bold",
          link: { url: "" },
        },
      ],
    },

    style: {
      space: 16,
      alignment: "left",
      divider: false,
      dividerColor: "#e2e8f0",
      dividerStyle: "solid",
      iconColor: "#4f46e5",
      iconHoverColor: "#6366f1",
      iconSize: 18,
      iconGap: 12,
      iconVAlign: "top",
      iconOffset: 0,
      titleNormalColor: "#111827",
      titleHoverColor: "#4f46e5",
      contentNormalColor: "#4b5563",
      contentHoverColor: "#374151",
      hoverAnimation: "shift-right",
      titleTypography: {
        fontSize: 16,
        fontSizeUnit: "px",
        fontWeight: "600",
      },
      contentTypography: {
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
    {
      tab: "Content",
      section: "Layout",
      controls: [
        {
          name: "layout",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              label="Layout"
              value={value ?? "vertical"}
              onChange={onChange}
              options={[
                { value: "vertical", icon: "mdi:format-list-bulleted" },
                { value: "horizontal", icon: "mdi:drag-horizontal" },
              ]}
            />
          ),
        },
      ],
    },

    {
      tab: "Content",
      section: "List Details",
      controls: [
        {
          name: "items",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div className="space-y-4">
              {(value || []).map((item: any, idx: number) => (
                <Section key={idx} label={`Item #${idx + 1}: ${item.title || ""}`}>
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-end gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const u = [...value];
                          u.splice(idx + 1, 0, { ...item });
                          onChange(u);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-indigo-200 bg-white text-gray-500 hover:text-indigo-500 cursor-pointer transition-colors shadow-sm"
                        title="Duplicate Item"
                      >
                        <Icon icon="solar:copy-linear" width="15" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange((value || []).filter((_: any, i: number) => i !== idx))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:border-red-200 bg-white text-gray-500 hover:text-red-500 cursor-pointer transition-colors shadow-sm"
                        title="Remove Item"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" width="15" />
                      </button>
                    </div>

                    <Text
                      label="Title"
                      value={item.title || ""}
                      onChange={(v: string) => {
                        const u = [...value]; u[idx] = { ...u[idx], title: v }; onChange(u);
                      }}
                    />

                    <Textarea
                      label="Content"
                      value={item.content || ""}
                      onChange={(v: string) => {
                        const u = [...value]; u[idx] = { ...u[idx], content: v }; onChange(u);
                      }}
                      rows={2}
                    />

                    <div className="flex flex-col gap-1.5 relative">
                      <IconPicker
                        label="Item Icon"
                        value={item.icon || ""}
                        onChange={(v: string) => {
                          const u = [...value]; u[idx] = { ...u[idx], icon: v }; onChange(u);
                        }}
                      />
                      {item.icon && (
                        <button
                          type="button"
                          onClick={() => {
                            const u = [...value]; u[idx] = { ...u[idx], icon: "" }; onChange(u);
                          }}
                          className="absolute right-0 top-0 text-[11px] text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer border-none bg-transparent"
                        >
                          <Icon icon="solar:close-circle-bold" width="14" />
                          Remove Icon
                        </button>
                      )}
                    </div>

                    <Url
                      label="Link"
                      value={item.link || { url: "" }}
                      onChange={(v: any) => {
                        const u = [...value]; u[idx] = { ...u[idx], link: v }; onChange(u);
                      }}
                    />
                  </div>
                </Section>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newItem: IconListItem = {
                    title: "New Item Title",
                    content: "Feature item description placeholder content text.",
                    icon: "solar:star-bold",
                    link: { url: "" },
                  };
                  onChange([...(value || []), newItem]);
                }}
                className="w-full flex items-center justify-center gap-1 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded text-[13px] font-semibold cursor-pointer transition-colors"
              >
                + Add Item
              </button>
            </div>
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ══════════════════
    {
      tab: "Style",
      section: "List Settings",
      controls: [
        {
          name: "space",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Space Between Items (px)" value={value ?? 16} onChange={onChange} min={0} max={64} />
          ),
        },
        {
          name: "alignment",
          responsive: true,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              label="Horizontal Alignment"
              value={value ?? "left"}
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
          name: "divider",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-[13px] font-medium text-gray-300">Show Dividers</span>
              <Toggle value={value ?? false} onChange={onChange} />
            </div>
          ),
        },
        {
          name: "dividerColor",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.style.divider ? (
              <ColorPickerPopup label="Divider Color" value={value ?? "#e2e8f0"} onChange={onChange} />
            ) : null
          ),
        },
        {
          name: "dividerStyle",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            schema.style.divider ? (
              <Select
                label="Divider Style"
                value={value ?? "solid"}
                onChange={onChange}
                options={[
                  { value: "solid", label: "Solid" },
                  { value: "dashed", label: "Dashed" },
                  { value: "dotted", label: "Dotted" },
                ]}
              />
            ) : null
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Icon Settings",
      controls: [
        {
          name: "iconColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal",
                  content: <ColorPickerPopup label="Icon Color" value={value ?? "#4f46e5"} onChange={onChange} />,
                },
                {
                  label: "Hover",
                  content: (
                    <ColorPickerPopup
                      label="Icon Hover Color"
                      value={schema.style.iconHoverColor || ""}
                      onChange={(v: string) => updateSchema("style", "iconHoverColor", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "iconSize",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Icon Size (px)" value={value ?? 18} onChange={onChange} min={8} max={64} />
          ),
        },
        {
          name: "iconGap",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Gap (Icon to Text)" value={value ?? 12} onChange={onChange} min={0} max={32} />
          ),
        },
        {
          name: "iconVAlign",
          responsive: true,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              label="Vertical Alignment"
              value={value ?? "top"}
              onChange={onChange}
              options={[
                { value: "top", icon: "mdi:align-vertical-top" },
                { value: "center", icon: "mdi:align-vertical-center" },
                { value: "bottom", icon: "mdi:align-vertical-bottom" },
              ]}
            />
          ),
        },
        {
          name: "iconOffset",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Adjust Vertical Position (px)" value={value ?? 0} onChange={onChange} min={-20} max={20} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Title Settings",
      controls: [
        {
          name: "titleNormalColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal",
                  content: <ColorPickerPopup label="Title Color" value={value ?? "#111827"} onChange={onChange} />,
                },
                {
                  label: "Hover",
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
          name: "hoverAnimation",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Hover Animation Style"
              value={value ?? "shift-right"}
              onChange={onChange}
              options={[
                { value: "none", label: "None" },
                { value: "shift-right", label: "Shift Right (Translate X)" },
                { value: "bounce", label: "Bounce Up (Translate Y)" },
                { value: "scale", label: "Scale Up (Size Zoom)" },
                { value: "rotate-icon", label: "Rotate Icon slightly" },
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
      ],
    },

    {
      tab: "Style",
      section: "Content Settings",
      controls: [
        {
          name: "contentNormalColor",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal",
                  content: <ColorPickerPopup label="Content Color" value={value ?? "#4b5563"} onChange={onChange} />,
                },
                {
                  label: "Hover",
                  content: (
                    <ColorPickerPopup
                      label="Content Hover Color"
                      value={schema.style.contentHoverColor || ""}
                      onChange={(v: string) => updateSchema("style", "contentHoverColor", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "contentTypography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography label="Content Typography" value={value} onChange={onChange} />
          ),
        },
      ],
    },

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

  render: (element: any) => <IconListFrontend element={element} />,
};

export default iconListElement;
