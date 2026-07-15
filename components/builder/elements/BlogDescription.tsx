"use client";

import React from "react";
import {
  ColorPickerPopup,
  Dimensions,
  Typography,
  ButtonGroup,
} from "../controls";

const blogDescriptionElement = {
  type: "blog-description",
  category: "Blog Details",
  label: "Blog Content / Description",
  icon: "solar:document-bold",

  schema: {
    style: {
      color: "#374151",
      typography: {
        fontSize: 16,
        fontSizeUnit: "px",
        fontWeight: "400",
        lineHeight: 28,
        lineHeightUnit: "px",
      },
      textAlign: "left",
    },
    advanced: {
      margin: { top: 0, right: 0, bottom: 24, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    {
      tab: "Style",
      section: "Typography",
      controls: [
        {
          name: "color",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Text Color" value={value ?? "#374151"} onChange={onChange} />
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
                { value: "left", icon: "mdi:format-align-left" },
                { value: "center", icon: "mdi:format-align-center" },
                { value: "right", icon: "mdi:format-align-right" },
                { value: "justify", icon: "mdi:format-align-justify" },
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
    const color = s.style?.color ?? "#374151";
    const align = s.style?.textAlign ?? "left";

    const fontSize = s.style?.typography?.fontSize ?? 16;
    const fontWeight = s.style?.typography?.fontWeight ?? "400";
    const lineHeight = s.style?.typography?.lineHeight ?? 28;

    const marginObj = s.advanced?.margin || {};
    const paddingObj = s.advanced?.padding || {};

    const mockContent = "This is a preview of the dynamic blog post content. When this page is active, the builder will replace this text with the actual post body/description populated from the database. You can customize font, color, alignment, and spacing limits using the panels on the left.";

    return (
      <div
        style={{
          color,
          textAlign: align as any,
          fontSize: `${fontSize}px`,
          fontWeight,
          lineHeight: `${lineHeight}px`,
          boxSizing: "border-box",
          marginTop: `${marginObj.top ?? 0}px`,
          marginRight: `${marginObj.right ?? 0}px`,
          marginBottom: `${marginObj.bottom ?? 24}px`,
          marginLeft: `${marginObj.left ?? 0}px`,
          paddingTop: `${paddingObj.top ?? 0}px`,
          paddingRight: `${paddingObj.right ?? 0}px`,
          paddingBottom: `${paddingObj.bottom ?? 0}px`,
          paddingLeft: `${paddingObj.left ?? 0}px`,
        }}
      >
        {mockContent}
      </div>
    );
  },
};

export default blogDescriptionElement;
