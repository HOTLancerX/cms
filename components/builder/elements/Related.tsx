"use client";

import {
  ColorPickerPopup,
  Dimensions,
  NumberControl,
  ButtonGroup,
  Section,
} from "../controls";

const relatedElement = {
  type: "related",
  category: "Blog Details",
  label: "Related Category Posts",
  icon: "solar:posts-carousel-vertical-bold",

  schema: {
    content: {
      limit: 5,
      layout: "grid", // "grid" | "list"
    },
    style: {
      titleColor: "#1f2937",
      hoverColor: "#6366f1",
      dateColor: "#6b7280",
    },
    advanced: {
      margin: { top: 0, right: 0, bottom: 24, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    {
      tab: "Layout",
      section: "Query Configuration",
      controls: [
        {
          name: "limit",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Section label="Limits & Layout" defaultOpen>
              <NumberControl
                label="Maximum Related Posts"
                value={value ?? 5}
                onChange={onChange}
                min={1}
                max={12}
                step={1}
              />
            </Section>
          ),
        },
        {
          name: "layout",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ButtonGroup
              value={value || "grid"}
              onChange={onChange}
              label="Layout Mode"
              grid={2}
              options={[
                { value: "grid", label: "Grid Layout" },
                { value: "list", label: "List Layout" },
              ]}
            />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Typography Colors",
      controls: [
        {
          name: "titleColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Title Color" value={value ?? "#1f2937"} onChange={onChange} />
          ),
        },
        {
          name: "hoverColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Hover Text Color" value={value ?? "#6366f1"} onChange={onChange} />
          ),
        },
        {
          name: "dateColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Metadata / Date Color" value={value ?? "#6b7280"} onChange={onChange} />
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
    const layout = s.content?.layout || "grid";
    const limit = s.content?.limit ?? 5;
    const titleColor = s.style?.titleColor ?? "#1f2937";
    const dateColor = s.style?.dateColor ?? "#6b7280";

    const marginObj = s.advanced?.margin || {};
    const paddingObj = s.advanced?.padding || {};

    // Generate mock items matching limit
    const mockPosts = Array.from({ length: limit }, (_, i) => ({
      id: `mock-${i}`,
      title: `Example Related Category Post Title ${i + 1}`,
      date: "October 24, 2026",
      image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=400",
    }));

    return (
      <div
        className="font-sans w-full"
        style={{
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
        <h3 className="text-lg font-bold mb-4 text-gray-800">Related Articles</h3>
        {layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {mockPosts.map((post) => (
              <div key={post.id} className="bg-white border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition">
                <div className="relative h-40 bg-gray-100">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase">Technology</span>
                  <h4 className="font-bold text-sm mt-1 line-clamp-2" style={{ color: titleColor }}>
                    {post.title}
                  </h4>
                  <p className="text-[12px] mt-2" style={{ color: dateColor }}>
                    {post.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {mockPosts.map((post) => (
              <div key={post.id} className="flex gap-4 p-3 bg-white border rounded-xl hover:shadow-sm transition">
                <div className="w-24 h-20 shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">Technology</span>
                  <h4 className="font-bold text-sm mt-0.5 truncate" style={{ color: titleColor }}>
                    {post.title}
                  </h4>
                  <p className="text-[11px] mt-1" style={{ color: dateColor }}>
                    {post.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
};

export default relatedElement;
