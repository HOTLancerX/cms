"use client";

import React from "react";
import { Icon } from "@iconify/react";
import {
  ColorPickerPopup,
  Dimensions,
  Typography,
  ButtonGroup,
  Toggle,
  Section,
} from "../controls";

const blogMetaElement = {
  type: "blog-meta",
  category: "Blog Details",
  label: "Blog Metadata",
  icon: "solar:calendar-bold",

  schema: {
    content: {
      showDate: true,
      showStatus: true,
      showSlug: true,
      showAuthor: true,
    },
    style: {
      color: "#6b7280",
      typography: {
        fontSize: 14,
        fontSizeUnit: "px",
        fontWeight: "400",
      },
      textAlign: "left",
    },
    advanced: {
      margin: { top: 0, right: 0, bottom: 16, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    {
      tab: "Layout",
      section: "Metadata Fields",
      controls: [
        {
          name: "showDate",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Section label="Display Options" defaultOpen>
              <Toggle label="Show Published Date" value={value !== false} onChange={onChange} />
              <Toggle label="Show Post Status" value={schema.content.showStatus !== false} onChange={(v) => updateSchema("content", "showStatus", v)} />
              <Toggle label="Show Post Slug" value={schema.content.showSlug !== false} onChange={(v) => updateSchema("content", "showSlug", v)} />
              <Toggle label="Show Author Name" value={schema.content.showAuthor !== false} onChange={(v) => updateSchema("content", "showAuthor", v)} />
            </Section>
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Typography",
      controls: [
        {
          name: "color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Text Color" value={value ?? "#6b7280"} onChange={onChange} />
          ),
        },
        {
          name: "typography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography value={value} onChange={onChange} />
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
    const color = s.style?.color ?? "#6b7280";
    const align = s.style?.textAlign ?? "left";

    const fontSize = s.style?.typography?.fontSize ?? 14;
    const fontWeight = s.style?.typography?.fontWeight ?? "400";

    const marginObj = s.advanced?.margin || {};
    const paddingObj = s.advanced?.padding || {};

    const showDate = s.content?.showDate !== false;
    const showStatus = s.content?.showStatus !== false;
    const showSlug = s.content?.showSlug !== false;
    const showAuthor = s.content?.showAuthor !== false;

    const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

    return (
      <div
        style={{
          display: "flex",
          justifyContent: justify as any,
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          color,
          fontSize: `${fontSize}px`,
          fontWeight,
          boxSizing: "border-box",
          marginTop: `${marginObj.top ?? 0}px`,
          marginRight: `${marginObj.right ?? 0}px`,
          marginBottom: `${marginObj.bottom ?? 16}px`,
          marginLeft: `${marginObj.left ?? 0}px`,
          paddingTop: `${paddingObj.top ?? 0}px`,
          paddingRight: `${paddingObj.right ?? 0}px`,
          paddingBottom: `${paddingObj.bottom ?? 0}px`,
          paddingLeft: `${paddingObj.left ?? 0}px`,
        }}
      >
        {showAuthor && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Icon icon="mdi:account" />
            Admin
          </span>
        )}
        {showDate && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Icon icon="mdi:calendar" />
            October 24, 2026
          </span>
        )}
        {showStatus && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", textTransform: "capitalize" }}>
            <Icon icon="mdi:check-circle" />
            published
          </span>
        )}
        {showSlug && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "monospace" }}>
            <Icon icon="mdi:link-variant" />
            example-blog-post
          </span>
        )}
      </div>
    );
  },
};

export default blogMetaElement;
