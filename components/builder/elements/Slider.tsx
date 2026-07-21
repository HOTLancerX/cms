"use client";

import React, { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Icon } from "@iconify/react";
import {
  Text,
  Textarea,
  Toggle,
  NumberControl,
  Select,
  ButtonGroup,
  ColorPickerPopup,
  Background,
  Border,
  Dimensions,
  IconPicker,
  ImageGallery,
  Section,
  Tabs,
  Url,
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

  return styles;
}

interface SlideItem {
  id: string;
  label: string;
  img?: string;
  showContent?: boolean;
  contentAlignX?: "left" | "center" | "right";
  contentAlignY?: "top" | "middle" | "bottom";
  title?: string;
  subtitle?: string;
  button_text?: string;
  button_url?: {
    url: string;
    target?: string;
    nofollow?: boolean;
  };
  button_icon?: string;
  button_icon_position?: "left" | "right";
  box_link?: {
    url: string;
    target?: string;
    nofollow?: boolean;
  };
}

function SliderFrontend({ element }: { element: any }) {
  const s = element.schema;
  const items: SlideItem[] = s.content?.items || [];
  const style = s.style || {};

  const slidesOnDisplay = s.content?.slidesOnDisplay || { _v: "1", _tablet: "1", _mobile: "1" };
  const desktopSlides = typeof slidesOnDisplay === "object" ? (slidesOnDisplay._v ?? "1") : slidesOnDisplay;
  const tabletSlides = typeof slidesOnDisplay === "object" ? (slidesOnDisplay._tablet ?? desktopSlides) : slidesOnDisplay;
  const mobileSlides = typeof slidesOnDisplay === "object" ? (slidesOnDisplay._mobile ?? tabletSlides) : slidesOnDisplay;

  const slidesOnScroll = s.content?.slidesOnScroll || { _v: "1", _tablet: "1", _mobile: "1" };
  const desktopScroll = typeof slidesOnScroll === "object" ? (slidesOnScroll._v ?? "1") : slidesOnScroll;
  const tabletScroll = typeof slidesOnScroll === "object" ? (slidesOnScroll._tablet ?? desktopScroll) : slidesOnScroll;
  const mobileScroll = typeof slidesOnScroll === "object" ? (slidesOnScroll._mobile ?? tabletScroll) : slidesOnScroll;

  const slidesGap = style.slidesGap ?? 0;
  const showDots = s.content?.showDots !== false;
  const dynamicDots = s.content?.dynamicDots !== false;
  const autoplay = s.content?.autoplay !== false;
  const autoplaySpeed = s.content?.autoplay_speed ?? 3000;

  // Responsive Height configurations
  const boxHeight = style.boxHeight || { _v: 550, _tablet: 450, _mobile: 350 };
  const boxHeightUnit = style.boxHeightUnit || "px";
  const desktopHeight = typeof boxHeight === "object" ? (boxHeight._v ?? 550) : boxHeight;
  const tabletHeight = typeof boxHeight === "object" ? (boxHeight._tablet ?? desktopHeight) : boxHeight;
  const mobileHeight = typeof boxHeight === "object" ? (boxHeight._mobile ?? tabletHeight) : boxHeight;

  // Initialize Embla
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: parseInt(desktopScroll),
    containScroll: "trimSnaps",
    breakpoints: {
      "(max-width: 767px)": { slidesToScroll: parseInt(mobileScroll) },
      "(min-width: 768px) and (max-width: 1023px)": { slidesToScroll: parseInt(tabletScroll) },
    }
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  const onInit = useCallback(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("init", onInit);
    emblaApi.on("reInit", onInit);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("init", onInit);
      emblaApi.off("reInit", onInit);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onInit, onSelect]);

  useEffect(() => {
    if (!emblaApi || !autoplay) return;

    let timer: ReturnType<typeof setInterval>;
    
    const play = () => {
      timer = setInterval(() => {
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext();
        } else {
          emblaApi.scrollTo(0);
        }
      }, autoplaySpeed);
    };

    const stop = () => {
      clearInterval(timer);
    };

    play();

    emblaApi.on("pointerDown", stop);
    emblaApi.on("pointerUp", play);

    return () => {
      clearInterval(timer);
      emblaApi.off("pointerDown", stop);
      emblaApi.off("pointerUp", play);
    };
  }, [emblaApi, autoplay, autoplaySpeed]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Arrow style definitions
  const arrowsVisible = style.showArrows !== false;
  const navBg = style.navBackground?.normal?.color || "rgba(255,255,255,0.15)";
  const navIconSize = style.navIconSize || 24;
  const navIconColor = style.navColors || "#ffffff";
  const navBorderRadius = style.navBorder?.normal?.radius || { top: 50, right: 50, bottom: 50, left: 50, unit: "px" };
  const navPadding = style.navPadding || { top: 12, right: 12, bottom: 12, left: 12, unit: "px" };

  const navPaddingStyle = `${navPadding.top}${navPadding.unit || "px"} ${navPadding.right}${navPadding.unit || "px"} ${navPadding.bottom}${navPadding.unit || "px"} ${navPadding.left}${navPadding.unit || "px"}`;
  const navRadiusStyle = `${navBorderRadius.top}${navBorderRadius.unit || "px"} ${navBorderRadius.right}${navBorderRadius.unit || "px"} ${navBorderRadius.bottom}${navBorderRadius.unit || "px"} ${navBorderRadius.left}${navBorderRadius.unit || "px"}`;
  const navBorderObj = getBorderStyles(style.navBorder, false);

  // Pagination Dot style definitions
  const dotSize = style.paginationDotSize || 8;
  const dotSpacing = style.paginationDotSpacing || 8;
  const dotColor = style.paginationColors || "rgba(255,255,255,0.4)";
  const dotActiveColor = style.paginationHoverColor || "#ffffff";

  // Margins and paddings
  const marginStyle = getDimensionsStyles(s.advanced?.margin, "margin");
  const paddingStyle = getDimensionsStyles(s.advanced?.padding, "padding");

  const elementId = `slider-${element.id}`;

  return (
    <div
      id={elementId}
      className="w-full box-border relative select-none"
      style={{
        ...marginStyle,
        ...paddingStyle,
      }}
    >
      {/* Inject responsive stylesheet to support heights & columns sizes correctly */}
      <style>{`
        #${elementId} .slider-viewport {
          overflow: hidden;
          width: 100%;
          position: relative;
        }
        #${elementId} .slider-container {
          display: flex;
          touch-action: pan-y pinch-zoom;
          margin-left: -${slidesGap}px;
        }
        #${elementId} .slider-slide {
          flex: 0 0 ${100 / parseFloat(mobileSlides)}%;
          min-width: 0;
          padding-left: ${slidesGap}px;
          height: ${mobileHeight}${boxHeightUnit};
          box-sizing: border-box;
          position: relative;
        }
        @media (min-width: 768px) {
          #${elementId} .slider-slide {
            flex: 0 0 ${100 / parseFloat(tabletSlides)}%;
            height: ${tabletHeight}${boxHeightUnit};
          }
        }
        @media (min-width: 1024px) {
          #${elementId} .slider-slide {
            flex: 0 0 ${100 / parseFloat(desktopSlides)}%;
            height: ${desktopHeight}${boxHeightUnit};
          }
        }
      `}</style>

      <div className="slider-viewport" ref={emblaRef}>
        <div className="slider-container">
          {items.map((item, idx) => {
            const isActive = idx === selectedIndex;

            // Compute alignment classes
            let justifyClass = "justify-center";
            if (item.contentAlignX === "left") justifyClass = "justify-start";
            else if (item.contentAlignX === "right") justifyClass = "justify-end";

            let itemsClass = "items-center";
            if (item.contentAlignY === "top") itemsClass = "items-start";
            else if (item.contentAlignY === "bottom") itemsClass = "items-end";

            // Card Style
            const cardStyle: React.CSSProperties = {
              backgroundColor: style.contentCardBg || "rgba(17, 24, 39, 0.4)",
              ...getDimensionsStyles(style.contentCardPadding || { top: 40, right: 40, bottom: 40, left: 40, unit: "px" }, "padding"),
              ...getBorderStyles(style.contentCardBorder, false),
              display: "flex",
              flexDirection: "column",
              alignItems: item.contentAlignX === "left" ? "flex-start" : item.contentAlignX === "right" ? "flex-end" : "center",
              textAlign: item.contentAlignX === "left" ? "left" : item.contentAlignX === "right" ? "right" : "center",
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: isActive ? "100ms" : "0ms",
            };

            // Button Style
            const buttonStyle: React.CSSProperties = {
              backgroundColor: style.btnBg || "#ff3b00",
              color: style.btnTextColor || "#ffffff",
              ...getBorderStyles(style.btnBorder, false),
              ...getTypographyStyles(style.btnTypography || { fontSize: 15, fontWeight: "600" }),
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              textDecoration: "none",
              border: "none",
            };

            const slideContent = (
              <>
                {/* Background image & Overlay */}
                {item.img && (
                  <>
                    <img
                      src={item.img}
                      alt={item.title || "Slide background"}
                      className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
                    />
                    <div
                      className="absolute inset-0 z-10 pointer-events-none"
                      style={{ backgroundColor: style.slideOverlayColor || "rgba(0,0,0,0.35)" }}
                    />
                  </>
                )}

                {/* Content Overlay */}
                {item.showContent !== false && (
                  <div className={`absolute inset-0 z-20 flex ${justifyClass} ${itemsClass} p-8 md:p-16 box-border`}>
                    <div style={cardStyle} className="max-w-xl backdrop-blur-sm shadow-xl">
                      {item.subtitle && (
                        <p
                          className="m-0 mb-3 transition-colors duration-300"
                          style={{
                            color: style.subtitleColor || "#f3f4f6",
                            ...getTypographyStyles(style.subtitleTypography || { fontSize: 16 }),
                          }}
                        >
                          {item.subtitle}
                        </p>
                      )}
                      {item.title && (
                        <h2
                          className="m-0 mb-6 transition-colors duration-300 font-extrabold leading-tight tracking-tight"
                          style={{
                            color: style.titleColor || "#ffffff",
                            ...getTypographyStyles(style.titleTypography || { fontSize: 42 }),
                          }}
                        >
                          {item.title}
                        </h2>
                      )}
                      {(item.button_text || item.button_icon) && (
                        <a
                          href={item.button_url?.url || "#"}
                          target={item.button_url?.target || undefined}
                          rel={item.button_url?.nofollow ? "nofollow" : undefined}
                          style={buttonStyle}
                          className="px-6 py-3 shadow-lg hover:brightness-110 active:scale-95 transition-all duration-200"
                        >
                          {item.button_icon_position === "left" && item.button_icon && (
                            <Icon icon={item.button_icon} className="w-5 h-5 shrink-0" />
                          )}
                          {item.button_text && <span>{item.button_text}</span>}
                          {item.button_icon_position !== "left" && item.button_icon && (
                            <Icon icon={item.button_icon} className="w-5 h-5 shrink-0" />
                          )}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            );

            const hasBoxLink = !!item.box_link?.url;
            const wrapWithLink = hasBoxLink && (item.showContent === false || !(item.button_text || item.button_icon));

            if (wrapWithLink) {
              return (
                <a
                  key={item.id || idx}
                  href={item.box_link?.url}
                  target={item.box_link?.target || undefined}
                  rel={item.box_link?.nofollow ? "nofollow" : undefined}
                  className="slider-slide block no-underline text-inherit cursor-pointer"
                >
                  {slideContent}
                </a>
              );
            }

            return (
              <div key={item.id || idx} className="slider-slide">
                {slideContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {arrowsVisible && items.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            style={{
              ...navBorderObj,
              background: navBg,
              padding: navPaddingStyle,
              borderRadius: navRadiusStyle,
              color: navIconColor,
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center transition-all duration-300 cursor-pointer border-none hover:brightness-125 hover:scale-105 active:scale-95"
            title="Previous slide"
          >
            <Icon icon="mdi:chevron-left" width={navIconSize} height={navIconSize} />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            style={{
              ...navBorderObj,
              background: navBg,
              padding: navPaddingStyle,
              borderRadius: navRadiusStyle,
              color: navIconColor,
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center transition-all duration-300 cursor-pointer border-none hover:brightness-125 hover:scale-105 active:scale-95"
            title="Next slide"
          >
            <Icon icon="mdi:chevron-right" width={navIconSize} height={navIconSize} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {showDots && scrollSnaps.length > 1 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex justify-center items-center"
          style={{ gap: `${dotSpacing}px` }}
        >
          {scrollSnaps.map((_, idx) => {
            const isActive = idx === selectedIndex;
            const width = isActive && dynamicDots ? dotSize * 2.5 : dotSize;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                style={{
                  width: `${width}px`,
                  height: `${dotSize}px`,
                  borderRadius: `${dotSize / 2}px`,
                  backgroundColor: isActive ? dotActiveColor : dotColor,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                className="cursor-pointer border-none hover:brightness-125"
                title={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const sliderElement = {
  type: "slider",
  category: "Basic",
  label: "Slider",
  icon: "solar:slider-vertical-bold",

  // ====================================
  // DEFAULT SCHEMA
  // ====================================
  schema: {
    content: {
      items: [
        {
          id: "slide_1",
          label: "Slide #1",
          img: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&auto=format&fit=crop",
          showContent: true,
          contentAlignX: "center",
          contentAlignY: "middle",
          title: "Premium Photo Retouching",
          subtitle: "Stunning, high-end visual correction and restoration.",
          button_text: "Get Free Trial",
          button_url: { url: "/free-trial" },
          button_icon: "solar:arrow-right-bold-duotone",
          button_icon_position: "right",
          box_link: { url: "" },
        },
        {
          id: "slide_2",
          label: "Slide #2",
          img: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&auto=format&fit=crop",
          showContent: true,
          contentAlignX: "left",
          contentAlignY: "middle",
          title: "Consistent Global Quality",
          subtitle: "Save retoucher templates and preferences to standardize your branding.",
          button_text: "Explore Services",
          button_url: { url: "/services" },
          button_icon: "solar:shop-bold-duotone",
          button_icon_position: "left",
          box_link: { url: "" },
        },
      ],
      slidesOnDisplay: { _v: "1", _tablet: "1", _mobile: "1" },
      slidesOnScroll: { _v: "1", _tablet: "1", _mobile: "1" },
      showDots: true,
      dynamicDots: true,
      autoplay: true,
      autoplay_speed: 3000,
    },
    style: {
      boxHeight: { _v: 550, _tablet: 450, _mobile: 350 },
      boxHeightUnit: "px",
      slidesGap: 0,
      slideOverlayColor: "rgba(0, 0, 0, 0.35)",

      // Content Card
      contentCardBg: "rgba(17, 24, 39, 0.4)",
      contentCardPadding: { top: 40, right: 40, bottom: 40, left: 40, unit: "px" },
      contentCardBorder: {
        normal: {
          type: "none",
          width: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
          radius: { top: 16, right: 16, bottom: 16, left: 16, unit: "px" },
        },
      },

      // Title Typography
      titleColor: "#ffffff",
      titleTypography: {
        fontSize: 42,
        fontSizeUnit: "px",
        fontWeight: "800",
      },

      // Subtitle Typography
      subtitleColor: "#f3f4f6",
      subtitleTypography: {
        fontSize: 16,
        fontSizeUnit: "px",
        fontWeight: "400",
      },

      // Button Settings
      btnBg: "#ff3b00",
      btnTextColor: "#ffffff",
      btnHoverBg: "#e03400",
      btnBorder: {
        normal: {
          type: "none",
          width: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
          radius: { top: 8, right: 8, bottom: 8, left: 8, unit: "px" },
        },
      },
      btnTypography: {
        fontSize: 15,
        fontSizeUnit: "px",
        fontWeight: "600",
      },

      // Arrows Settings
      showArrows: true,
      navIconSize: 24,
      navColors: "#ffffff",
      navHoverColor: "#ff3b00",
      navBackground: {
        normal: { type: "color", color: "rgba(255, 255, 255, 0.15)", image: "" },
        hover: { type: "color", color: "rgba(255, 255, 255, 0.35)", image: "" },
      },
      navBorder: {
        normal: {
          type: "solid",
          width: { top: 1, right: 1, bottom: 1, left: 1, unit: "px" },
          color: "rgba(255, 255, 255, 0.25)",
          radius: { top: 50, right: 50, bottom: 50, left: 50, unit: "px" },
        },
      },
      navPadding: { top: 12, right: 12, bottom: 12, left: 12, unit: "px" },

      // Dots Pagination Settings
      paginationColors: "rgba(255, 255, 255, 0.4)",
      paginationHoverColor: "#ffffff",
      paginationDotSize: 8,
      paginationDotSpacing: 8,
    },
    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  // ====================================
  // CONTROLS
  // ====================================
  controls: [
    // === CONTENT TAB ===
    {
      tab: "Content",
      section: "Slides Layout",
      controls: [
        {
          name: "slidesOnDisplay",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Select
              value={value?._v ?? value}
              onChange={(v: string) => onChange({ _v: v })}
              label="Slides on display"
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
              ]}
            />
          ),
        },
        {
          name: "slidesOnScroll",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Select
              value={value?._v ?? value}
              onChange={(v: string) => onChange({ _v: v })}
              label="Slides on scroll"
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
              ]}
            />
          ),
        },
        {
          name: "showDots",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value !== false} onChange={onChange} label="Show Pagination Dots" />
          ),
        },
        {
          name: "dynamicDots",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value !== false} onChange={onChange} label="Expand Active Dot (Dynamic)" />
          ),
        },
        {
          name: "autoplay",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value !== false} onChange={onChange} label="Auto Play Slider" />
          ),
        },
        {
          name: "autoplay_speed",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => {
            const isAutoplay = schema.content?.autoplay !== false;
            if (!isAutoplay) return null;
            return (
              <NumberControl
                label="Auto Play Interval (ms)"
                value={value ?? 3000}
                onChange={onChange}
                min={500}
                max={15000}
                step={500}
              />
            );
          },
        },
      ],
    },
    {
      tab: "Content",
      section: "Slider Items List",
      controls: [
        {
          name: "items",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div className="space-y-4">
              {(value || []).map((item: any, idx: number) => (
                <Section key={item.id || idx} label={`Slide #${idx + 1}: ${item.label || item.title || ""}`}>
                  <div className="space-y-4 pt-2">
                    {/* Duplicate / Remove */}
                    <div className="flex justify-end gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const u = [...value];
                          u.splice(idx + 1, 0, { ...item, id: `slide_${Date.now()}` });
                          onChange(u);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-white cursor-pointer transition-colors shadow-sm"
                        title="Duplicate Slide"
                      >
                        <Icon icon="solar:copy-linear" width="15" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange((value || []).filter((_: any, i: number) => i !== idx))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 hover:text-red-400 cursor-pointer transition-colors shadow-sm"
                        title="Remove Slide"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" width="15" />
                      </button>
                    </div>

                    <Text
                      label="Slide Label"
                      value={item.label || ""}
                      onChange={(v: string) => {
                        const u = [...value];
                        u[idx] = { ...u[idx], label: v };
                        onChange(u);
                      }}
                    />

                    <ImageGallery
                      label="Background Image"
                      value={item.img || ""}
                      onChange={(v: string) => {
                        const u = [...value];
                        u[idx] = { ...u[idx], img: v };
                        onChange(u);
                      }}
                    />

                    <Url
                      label="Box Link (whole slide click)"
                      value={item.box_link || { url: "" }}
                      onChange={(v: any) => {
                        const u = [...value];
                        u[idx] = { ...u[idx], box_link: v };
                        onChange(u);
                      }}
                    />

                    <div className="flex items-center justify-between py-2 border-b border-gray-800">
                      <span className="text-[13px] font-medium text-gray-300">Show Content Overlay</span>
                      <Toggle
                        value={item.showContent ?? true}
                        onChange={(v: boolean) => {
                          const u = [...value];
                          u[idx] = { ...u[idx], showContent: v };
                          onChange(u);
                        }}
                      />
                    </div>

                    {item.showContent !== false && (
                      <div className="space-y-4 pt-2 border-t border-gray-800">
                        <ButtonGroup
                          label="Horizontal Position"
                          value={item.contentAlignX ?? "center"}
                          onChange={(v: string) => {
                            const u = [...value];
                            u[idx] = { ...u[idx], contentAlignX: v };
                            onChange(u);
                          }}
                          options={[
                            { value: "left", label: "Left", icon: "mdi:align-horizontal-left" },
                            { value: "center", label: "Center", icon: "mdi:align-horizontal-center" },
                            { value: "right", label: "Right", icon: "mdi:align-horizontal-right" },
                          ]}
                        />

                        <ButtonGroup
                          label="Vertical Position"
                          value={item.contentAlignY ?? "middle"}
                          onChange={(v: string) => {
                            const u = [...value];
                            u[idx] = { ...u[idx], contentAlignY: v };
                            onChange(u);
                          }}
                          options={[
                            { value: "top", label: "Top", icon: "mdi:align-vertical-top" },
                            { value: "middle", label: "Middle", icon: "mdi:align-vertical-center" },
                            { value: "bottom", label: "Bottom", icon: "mdi:align-vertical-bottom" },
                          ]}
                        />

                        <Text
                          label="Title"
                          value={item.title || ""}
                          onChange={(v: string) => {
                            const u = [...value];
                            u[idx] = { ...u[idx], title: v };
                            onChange(u);
                          }}
                        />

                        <Textarea
                          label="Subtitle"
                          value={item.subtitle || ""}
                          onChange={(v: string) => {
                            const u = [...value];
                            u[idx] = { ...u[idx], subtitle: v };
                            onChange(u);
                          }}
                          rows={2}
                        />

                        <Text
                          label="Button Text"
                          value={item.button_text || ""}
                          onChange={(v: string) => {
                            const u = [...value];
                            u[idx] = { ...u[idx], button_text: v };
                            onChange(u);
                          }}
                        />

                        <Url
                          label="Button URL"
                          value={item.button_url || { url: "" }}
                          onChange={(v: any) => {
                            const u = [...value];
                            u[idx] = { ...u[idx], button_url: v };
                            onChange(u);
                          }}
                        />

                        <IconPicker
                          label="Button Icon"
                          value={item.button_icon || ""}
                          onChange={(v: string) => {
                            const u = [...value];
                            u[idx] = { ...u[idx], button_icon: v };
                            onChange(u);
                          }}
                        />

                        {item.button_icon && (
                          <ButtonGroup
                            label="Icon Placement"
                            value={item.button_icon_position ?? "right"}
                            onChange={(v: string) => {
                              const u = [...value];
                              u[idx] = { ...u[idx], button_icon_position: v };
                              onChange(u);
                            }}
                            options={[
                              { value: "left", label: "Before Text" },
                              { value: "right", label: "After Text" },
                            ]}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </Section>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newItem = {
                    id: `slide_${Date.now()}`,
                    label: `Slide #${(value?.length || 0) + 1}`,
                    img: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&auto=format&fit=crop",
                    showContent: true,
                    contentAlignX: "center",
                    contentAlignY: "middle",
                    title: "New Slide Title",
                    subtitle: "Add slide details, bullet points, or promotions.",
                    button_text: "Learn More",
                    button_url: { url: "" },
                    button_icon: "solar:arrow-right-bold-duotone",
                    button_icon_position: "right",
                    box_link: { url: "" },
                  };
                  onChange([...(value || []), newItem]);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded text-[13px] font-semibold cursor-pointer transition-colors"
              >
                + Add Slide Item
              </button>
            </div>
          ),
        },
      ],
    },

    // === STYLE TAB ===
    {
      tab: "Style",
      section: "Slider Sizing",
      controls: [
        {
          name: "boxHeight",
          responsive: true,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Slider Height</span>
                <select
                  value={schema.style.boxHeightUnit || "px"}
                  onChange={(e) => updateSchema("style", "boxHeightUnit", e.target.value)}
                  className="bg-gray-800 text-white text-[11px] border border-gray-700 rounded px-1.5 py-0.5"
                >
                  <option value="px">px</option>
                  <option value="vh">vh</option>
                </select>
              </div>
              <NumberControl value={value ?? 550} onChange={onChange} min={100} max={1200} />
            </div>
          ),
        },
        {
          name: "slidesGap",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl label="Slides Spacing Gap (px)" value={value ?? 0} onChange={onChange} min={0} max={100} />
          ),
        },
        {
          name: "slideOverlayColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Slide Overlay Color" value={value ?? "rgba(0, 0, 0, 0.35)"} onChange={onChange} />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Text Overlay Card",
      controls: [
        {
          name: "contentCardBg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Card Background Color" value={value ?? "rgba(17, 24, 39, 0.4)"} onChange={onChange} />
          ),
        },
        {
          name: "contentCardPadding",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" value={value} onChange={onChange} />
          ),
        },
        {
          name: "contentCardBorder",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Border value={value} onChange={onChange} />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Typography Controls",
      controls: [
        {
          name: "titleColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Title Color" value={value ?? "#ffffff"} onChange={onChange} />
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
          name: "subtitleColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Subtitle Color" value={value ?? "#f3f4f6"} onChange={onChange} />
          ),
        },
        {
          name: "subtitleTypography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography label="Subtitle Typography" value={value} onChange={onChange} />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Button Settings",
      controls: [
        {
          name: "btnBg",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal Bg",
                  content: <ColorPickerPopup label="Background Color" value={value ?? "#ff3b00"} onChange={onChange} />,
                },
                {
                  label: "Hover Bg",
                  content: (
                    <ColorPickerPopup
                      label="Hover Background"
                      value={schema.style?.btnHoverBg || "#e03400"}
                      onChange={(v: string) => updateSchema("style", "btnHoverBg", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "btnTextColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Text Color" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "btnBorder",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Border value={value} onChange={onChange} />
          ),
        },
        {
          name: "btnTypography",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Typography label="Button Typography" value={value} onChange={onChange} />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Navigation Arrows",
      controls: [
        {
          name: "showArrows",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value !== false} onChange={onChange} label="Show Arrows" />
          ),
        },
        {
          name: "navIconSize",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Arrow Icon Size (px)" value={value ?? 24} onChange={onChange} min={10} max={60} />
          ),
        },
        {
          name: "navColors",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal Color",
                  content: <ColorPickerPopup label="Arrow Icon Color" value={value ?? "#ffffff"} onChange={onChange} />,
                },
                {
                  label: "Hover Color",
                  content: (
                    <ColorPickerPopup
                      label="Hover Color"
                      value={schema.style?.navHoverColor || "#ff3b00"}
                      onChange={(v: string) => updateSchema("style", "navHoverColor", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "navBackground",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Background value={value} onChange={onChange} />
          ),
        },
        {
          name: "navBorder",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Border value={value} onChange={onChange} />
          ),
        },
        {
          name: "navPadding",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" value={value} onChange={onChange} />
          ),
        },
      ],
    },
    {
      tab: "Style",
      section: "Pagination Dots",
      controls: [
        {
          name: "paginationColors",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal Color",
                  content: <ColorPickerPopup label="Normal Dot Color" value={value ?? "rgba(255, 255, 255, 0.4)"} onChange={onChange} />,
                },
                {
                  label: "Active Color",
                  content: (
                    <ColorPickerPopup
                      label="Active Dot Color"
                      value={schema.style?.paginationHoverColor || "#ffffff"}
                      onChange={(v: string) => updateSchema("style", "paginationHoverColor", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "paginationDotSize",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Dot Size (px)" value={value ?? 8} onChange={onChange} min={4} max={30} />
          ),
        },
        {
          name: "paginationDotSpacing",
          responsive: true,
          render: (value: any, onChange: any) => (
            <NumberControl label="Spacing Between Dots (px)" value={value ?? 8} onChange={onChange} min={2} max={30} />
          ),
        },
      ],
    },

    // === ADVANCED TAB ===
    {
      tab: "Advanced",
      section: "Container Spacing",
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

  // ====================================
  // RENDERING METHOD
  // ====================================
  render: (element: any) => {
    return <SliderFrontend element={element} />;
  },
};

export default sliderElement;
