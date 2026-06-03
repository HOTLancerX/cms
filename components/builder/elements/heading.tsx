"use client";

import {
  Text,
  Select,
  ButtonGroup,
  ColorPickerPopup,
  Dimensions,
  AlignSelf,
  Url,
  Typography,
  Section,
  Tabs,
} from "../controls";

/**
 * Heading Element
 */

const headingElement = {
  type: "heading",
  category: "Basic",
  label: "Heading",
  icon: "solar:text-bold",

  schema: {
    content: {
      text: "Add your heading here",
      tag: "h2",
      link: { url: "", target: "", nofollow: false, customAttributes: "" },
    },
    style: {
      color: "",
      hoverColor: "",
      typography: {
        fontFamily: "",
        fontSize: 32,
        fontSizeUnit: "px",
        fontWeight: "600",
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
    // === LAYOUT ===
    {
      tab: "Layout",
      section: "Content",
      controls: [
        {
          name: "text",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Section label="Title" defaultOpen>
              <Text value={value} onChange={onChange} label="Title" placeholder="Heading text" />
              <Select
                value={schema.content.tag}
                onChange={(v: string) => updateSchema("content", "tag", v)}
                label="HTML Tag"
                grid={2}
                options={[
                  { value: "h1", label: "H1" },
                  { value: "h2", label: "H2" },
                  { value: "h3", label: "H3" },
                  { value: "h4", label: "H4" },
                  { value: "h5", label: "H5" },
                  { value: "h6", label: "H6" },
                  { value: "p", label: "P" },
                  { value: "span", label: "Span" },
                ]}
              />
              <Url value={schema.content.link} onChange={(v: any) => updateSchema("content", "link", v)} label="Link" />
            </Section>
          ),
        },
      ],
    },

    // === STYLE ===
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

    // === ADVANCED ===
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

  // =========================
  // RENDER
  // =========================
  render: (element: any) => {
    const Tag = element.schema.content.tag as any;
    const s = element.schema;

    const link = s.content?.link;
    const hasLink = link && typeof link === "object" && link.url;

    // Styles are applied via .bel-{id} class from CanvasStyles.
    // Only structural/content rendering here — no inline style duplication.
    const heading = (
      <Tag>
        {s.content.text}
      </Tag>
    );

    if (hasLink) {
      return (
        <a
          href={link.url}
          target={link.target || undefined}
          rel={link.nofollow ? "nofollow" : undefined}
          {...(link.customAttributes ? { "data-custom": link.customAttributes } : {})}
        >
          {heading}
        </a>
      );
    }

    return heading;
  },
};

export default headingElement;
