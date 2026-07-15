"use client";

import React from "react";
import {
  Select,
  ButtonGroup,
  ColorPickerPopup,
  Dimensions,
  AlignSelf,
  Typography,
  Section,
  Tabs,
} from "../controls";

const blogTitleElement = {
  type: "blog-title",
  category: "Blog Details",
  label: "Blog Title",
  icon: "solar:text-bold",

  schema: {
    content: {
      tag: "h1",
    },
    style: {
      color: "",
      hoverColor: "",
      typography: {
        fontFamily: "",
        fontSize: 36,
        fontSizeUnit: "px",
        fontWeight: "700",
        textTransform: "",
        fontStyle: "",
        textDecoration: "",
        lineHeight: 0,
        lineHeightUnit: "px",
        letterSpacing: 0,
        letterSpacingUnit: "px",
        wordSpacing: 0,
        wordSpacingUnit: "px",
      },
      textAlign: "left",
    },
    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      alignSelf: "auto",
    },
  },

  controls: [
    {
      tab: "Layout",
      section: "Tag Selection",
      controls: [
        {
          name: "tag",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Section label="HTML Tag" defaultOpen>
              <Select
                value={value || "h1"}
                onChange={onChange}
                label="HTML Tag"
                options={[
                  { value: "h1", label: "H1" },
                  { value: "h2", label: "H2" },
                  { value: "h3", label: "H3" },
                  { value: "h4", label: "H4" },
                  { value: "p", label: "P" },
                ]}
              />
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
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs tabs={[
              {
                label: "Normal",
                content: <ColorPickerPopup label="Color" value={value} onChange={onChange} />,
              },
              {
                label: "Hover",
                content: <ColorPickerPopup label="Color" value={schema.style.hoverColor || ""} onChange={(v: string) => updateSchema("style", "hoverColor", v)} />,
              },
            ]} />
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
        {
          name: "alignSelf",
          responsive: true,
          render: (value: any, onChange: any) => <AlignSelf value={value} onChange={onChange} />,
        },
      ],
    },
  ],

  render: (element: any) => {
    const Tag = element.schema.content.tag as any;
    return <Tag>Example Blog Post Title</Tag>;
  },
};

export default blogTitleElement;
