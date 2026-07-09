"use client";

import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Icon } from "@iconify/react";
import {
  Text,
  Toggle,
  Slider,
  NumberControl,
  Select,
  ButtonGroup,
  ColorPickerPopup,
  Background,
  Border,
  Dimensions,
  IconPicker,
  Section,
  Tabs,
} from "../controls";
import { getBuilderElement } from "@/hook";

function CarouselFrontend({ element }: { element: any }) {
  const s = element.schema;
  const slides = s.content?.slides || [];
  const nav = s.navigation || {};
  const pagination = s.pagination || {};
  const settings = s.settings || {};
  const style = s.style || {};

  const slidesOnDisplay = parseInt(s.content?.slidesOnDisplay?._v || "3");
  const slidesOnScroll = parseInt(s.content?.slidesOnScroll?._v || "1");
  const slideGap = style.slidesGap ?? 10;
  const transitionDuration = settings.transitionDuration || 500;
  const autoplay = settings.autoplay || false;
  const scrollSpeed = settings.scrollSpeed || 5000;
  const infiniteScroll = settings.infiniteScroll !== false;
  const pauseOnHover = settings.pauseOnHover !== false;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: infiniteScroll,
    align: "start",
    slidesToScroll: slidesOnScroll,
    duration: transitionDuration,
    containScroll: "trimSnaps",
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(autoplay);
  const [isHovered, setIsHovered] = useState(false);

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
    emblaApi.on("pointerDown", () => setIsAutoPlayActive(false));
    return () => {
      emblaApi.off("init", onInit);
      emblaApi.off("reInit", onInit);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onInit, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) { emblaApi.scrollPrev(); setIsAutoPlayActive(false); }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) { emblaApi.scrollNext(); setIsAutoPlayActive(false); }
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) { emblaApi.scrollTo(index); setIsAutoPlayActive(false); }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || !isAutoPlayActive || !autoplay) return;
    const timer = setInterval(() => { emblaApi.scrollNext(); }, scrollSpeed);
    return () => clearInterval(timer);
  }, [emblaApi, isAutoPlayActive, autoplay, scrollSpeed]);

  const navBg = style.navBackground?.normal?.color || "rgba(0,0,0,0.5)";
  const navHoverBg = style.navBackground?.hover?.color || "rgba(0,0,0,0.8)";
  const navIconSize = style.navIconSize || 20;
  const navIconColor = style.navColors || "#333333";
  const navBorderRadius = style.navBorder?.normal?.radius || { top: 50, right: 50, bottom: 50, left: 50, unit: "px" };
  const navPadding = style.navPadding || { top: 8, right: 8, bottom: 8, left: 8, unit: "px" };
  const navPosition = style.navPosition || "inside";

  const paginationType = pagination.paginationType || "dots";
  const dotSize = style.paginationDotSize || 10;
  const dotSpacing = style.paginationDotSpacing || 8;
  const dotNormalColor = style.paginationColors || "#cccccc";
  const dotHoverColor = style.paginationHoverColor || "#333333";

  const navPaddingStyle = `${navPadding.top}${navPadding.unit || "px"} ${navPadding.right}${navPadding.unit || "px"} ${navPadding.bottom}${navPadding.unit || "px"} ${navPadding.left}${navPadding.unit || "px"}`;
  const navRadiusStyle = `${navBorderRadius.top}${navBorderRadius.unit || "px"} ${navBorderRadius.right}${navBorderRadius.unit || "px"} ${navBorderRadius.bottom}${navBorderRadius.unit || "px"} ${navBorderRadius.left}${navBorderRadius.unit || "px"}`;

  const slidePadding = style.slidesPadding;
  const slidePaddingStyle = slidePadding ? `${slidePadding.top}${slidePadding.unit || "px"} ${slidePadding.right}${slidePadding.unit || "px"} ${slidePadding.bottom}${slidePadding.unit || "px"} ${slidePadding.left}${slidePadding.unit || "px"}` : undefined;
  const slideBorder = style.slidesBorder;
  const slideBorderStyle = slideBorder?.normal?.type ? `1px solid ${slideBorder.normal.color || "#000"}` : undefined;
  const slideRadiusStyle = slideBorder?.normal?.radius ? `${slideBorder.normal.radius.top}${slideBorder.normal.radius.unit || "px"} ${slideBorder.normal.radius.right}${slideBorder.normal.radius.unit || "px"} ${slideBorder.normal.radius.bottom}${slideBorder.normal.radius.unit || "px"} ${slideBorder.normal.radius.left}${slideBorder.normal.radius.unit || "px"}` : undefined;

  const arrowsVisible = nav.showArrows !== false;
  const dotsOutside = navPosition === "outside";

  return (
    <div
      className="bel-carousel relative w-full"
      onMouseEnter={() => pauseOnHover && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div className={`flex items-center`}>
          {arrowsVisible && dotsOutside && (
            <button
              type="button"
              onClick={scrollPrev}
              className="shrink-0 z-10 flex items-center justify-center transition-colors cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: navBg,
                padding: navPaddingStyle,
                borderRadius: navRadiusStyle,
                color: navIconColor,
              }}
              disabled={!canPrev && !infiniteScroll}
            >
              <Icon icon={nav.prevIcon || "mdi:chevron-left"} width={navIconSize} />
            </button>
          )}

          <div className="overflow-hidden flex-1 min-w-0 relative" ref={emblaRef}>
            <div className="flex touch-pan-y" style={{ marginLeft: `-${slideGap}px` }}>
              {slides.map((slide: any) => (
                <div
                  key={slide.id}
                  className="shrink-0 min-w-0 pl-2"
                  style={{
                    flex: `0 0 ${100 / slidesOnDisplay}%`,
                    paddingLeft: `${slideGap}px`,
                    padding: slidePaddingStyle || `${slideGap / 2}px`,
                    border: slideBorderStyle,
                    borderRadius: slideRadiusStyle,
                    boxSizing: "border-box",
                  }}
                >
                  <div className="carousel-slide-content">
                    {slide.elements?.length > 0 ? (
                      slide.elements.map((el: any) => {
                        const def = getBuilderElement(el.type);
                        return def ? (
                          <div key={el.id}>{def.render(el)}</div>
                        ) : null;
                      })
                    ) : (
                      <div className="flex items-center justify-center min-h-[100px] bg-gray-100 rounded text-gray-400 text-sm">
                        Slide Content
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {arrowsVisible && !dotsOutside && (
              <>
                <button
                  type="button"
                  onClick={scrollPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-colors cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: navBg,
                    padding: navPaddingStyle,
                    borderRadius: navRadiusStyle,
                    color: navIconColor,
                  }}
                  disabled={!canPrev && !infiniteScroll}
                >
                  <Icon icon={nav.prevIcon || "mdi:chevron-left"} width={navIconSize} />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-colors cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: navBg,
                    padding: navPaddingStyle,
                    borderRadius: navRadiusStyle,
                    color: navIconColor,
                  }}
                  disabled={!canNext && !infiniteScroll}
                >
                  <Icon icon={nav.nextIcon || "mdi:chevron-right"} width={navIconSize} />
                </button>
              </>
            )}
          </div>

          {arrowsVisible && dotsOutside && (
            <button
              type="button"
              onClick={scrollNext}
              className="shrink-0 z-10 flex items-center justify-center transition-colors cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: navBg,
                padding: navPaddingStyle,
                borderRadius: navRadiusStyle,
                color: navIconColor,
              }}
              disabled={!canNext && !infiniteScroll}
            >
              <Icon icon={nav.nextIcon || "mdi:chevron-right"} width={navIconSize} />
            </button>
          )}
        </div>

        {paginationType === "dots" && scrollSnaps.length > 1 && (
          <div className="flex justify-center items-center" style={{ gap: `${dotSpacing}px`, padding: "8px 0" }}>
            {scrollSnaps.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                className="rounded-full transition-all cursor-pointer border-none"
                style={{
                  width: `${idx === selectedIndex ? dotSize * 1.6 : dotSize}px`,
                  height: `${dotSize}px`,
                  background: idx === selectedIndex ? dotHoverColor : dotNormalColor,
                }}
              />
            ))}
          </div>
        )}

        {paginationType === "fraction" && (
          <div className="flex justify-center" style={{ padding: "8px 0" }}>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {selectedIndex + 1} / {slides.length}
            </span>
          </div>
        )}

        {paginationType === "progressbar" && (
          <div style={{ padding: "0 16px 8px" }}>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${((selectedIndex + slidesOnDisplay) / slides.length) * 100}%`, transitionDuration: `${transitionDuration}ms` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const carouselElement = {
  type: "carousel",
  category: "Basic",
  label: "Carousel",
  icon: "mdi:view-carousel-outline",

  // ====================================
  // DEFAULT SCHEMA
  // ====================================
  schema: {
    content: {
      carouselName: "Carousel",
      slides: [
        { id: "slide_1", label: "Slide #1", elements: [] },
        { id: "slide_2", label: "Slide #2", elements: [] },
        { id: "slide_3", label: "Slide #3", elements: [] },
      ],
      slidesOnDisplay: { _v: "3", _tablet: "2", _mobile: "1" },
      slidesOnScroll: { _v: "1", _tablet: "1", _mobile: "1" },
      equalHeight: true,
    },

    settings: {
      autoplay: false,
      scrollSpeed: 5000,
      pauseOnHover: true,
      pauseOnInteraction: true,
      infiniteScroll: true,
      transitionDuration: 500,
      direction: "left",
      offsetSides: "none",
    },

    navigation: {
      showArrows: true,
      prevIcon: "mdi:chevron-left",
      nextIcon: "mdi:chevron-right",
      prevHorizontalOrientation: "start",
      prevHorizontalPosition: 0,
      prevHorizontalUnit: "px",
      prevVerticalOrientation: "center",
      prevVerticalPosition: 0,
      prevVerticalUnit: "px",
      nextHorizontalOrientation: "end",
      nextHorizontalPosition: 0,
      nextHorizontalUnit: "px",
      nextVerticalOrientation: "center",
      nextVerticalPosition: 0,
      nextVerticalUnit: "px",
    },

    pagination: {
      paginationType: "dots",
    },

    style: {
      slidesGap: 10,
      slidesBackground: {
        normal: { type: "none", color: "transparent", image: "" },
        hover: { type: "none", color: "transparent", image: "" },
        transition: 300,
      },
      slidesBorder: {
        normal: {
          type: "",
          width: 1,
          color: "#000000",
          radius: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
        },
        hover: {
          type: "",
          width: 1,
          color: "#000000",
          radius: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
        },
        boxShadow: {
          normal: { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.15)", inset: false },
          hover: { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.15)", inset: false },
          transition: 300,
        },
        transition: 300,
      },
      slidesPadding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      navIconSize: 20,
      navColors: "#333333",
      navHoverColor: "#ffffff",
      navBackground: {
        normal: { type: "color", color: "rgba(0,0,0,0.5)", image: "" },
        hover: { type: "color", color: "rgba(0,0,0,0.8)", image: "" },
        transition: 300,
      },
      navBorder: {
        normal: {
          type: "",
          width: 1,
          color: "#000000",
          radius: { top: 50, right: 50, bottom: 50, left: 50, unit: "px" },
        },
        hover: {
          type: "",
          width: 1,
          color: "#000000",
          radius: { top: 50, right: 50, bottom: 50, left: 50, unit: "px" },
        },
        boxShadow: {
          normal: { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.15)", inset: false },
          hover: { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.15)", inset: false },
          transition: 300,
        },
        transition: 300,
      },
      navPadding: { top: 8, right: 8, bottom: 8, left: 8, unit: "px" },
      navPosition: "inside",
      paginationDotSize: 10,
      paginationDotSpacing: 8,
      paginationColors: "#cccccc",
      paginationHoverColor: "#333333",
      paginationCustomPosition: false,
      paginationSpaceFromSlides: "auto",
      paginationSpacing: 0,
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
      section: "Carousel",
      controls: [
        {
          name: "carouselName",
          responsive: false,
          render: (value: any, onChange: any, { updateSchema }: any) => (
            <Section label="Carousel Name" defaultOpen>
              <Text value={value} onChange={onChange} label="Carousel Name" placeholder="Carousel" />
            </Section>
          ),
        },
        {
          name: "slides",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Section label="Carousel Items" defaultOpen>
              <div className="space-y-2">
                {value?.map((slide: any, idx: number) => (
                  <div key={slide.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <span className="text-xs text-gray-500 w-4">{idx + 1}</span>
                    <input
                      type="text"
                      value={slide.label}
                      onChange={(e) => {
                        const updated = [...value];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        onChange(updated);
                      }}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-[13px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = value.filter((_: any, i: number) => i !== idx);
                        onChange(updated);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                      title="Remove slide"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newSlide = {
                      id: `slide_${Date.now()}`,
                      label: `Slide #${(value?.length || 0) + 1}`,
                      elements: [],
                    };
                    onChange([...(value || []), newSlide]);
                  }}
                  className="w-full flex items-center justify-center gap-1 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-[13px] font-medium cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
            </Section>
          ),
        },
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
                { value: "5", label: "5" },
                { value: "6", label: "6" },
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
                { value: "5", label: "5" },
                { value: "6", label: "6" },
              ]}
            />
          ),
        },
        {
          name: "equalHeight",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value} onChange={onChange} label="Equal Height" />
          ),
        },
      ],
    },

    // === SETTINGS TAB ===
    {
      tab: "Content",
      section: "Settings",
      controls: [
        {
          name: "autoplay",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div>
              <Toggle value={value} onChange={onChange} label="Autoplay" />
              <p className="text-[11px] text-gray-400 mt-1 ml-1">
                The Autoplay is inactive while editing. Preview your page to see it in action.
              </p>
            </div>
          ),
        },
        {
          name: "scrollSpeed",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              value={value}
              onChange={onChange}
              label="Scroll Speed (ms)"
              min={500}
              max={10000}
              step={100}
              showSlider={false}
              grid={2}
            />
          ),
        },
        {
          name: "pauseOnHover",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value} onChange={onChange} label="Pause on hover" />
          ),
        },
        {
          name: "pauseOnInteraction",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value} onChange={onChange} label="Pause on interaction" />
          ),
        },
        {
          name: "infiniteScroll",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div>
              <Toggle value={value} onChange={onChange} label="Infinite scroll" />
              <p className="text-[11px] text-gray-400 mt-1 ml-1">
                Infinite scroll is inactive while editing. Preview your page to see it in action.
              </p>
            </div>
          ),
        },
        {
          name: "transitionDuration",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl
              value={value}
              onChange={onChange}
              label="Transition Duration (ms)"
              min={100}
              max={2000}
              step={50}
              showSlider={false}
              grid={2}
            />
          ),
        },
        {
          name: "direction",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              value={value}
              onChange={onChange}
              label="Direction"
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
            />
          ),
        },
        {
          name: "offsetSides",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div>
              <Select
                value={value}
                onChange={onChange}
                label="Offset Sides"
                options={[
                  { value: "none", label: "None" },
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                  { value: "both", label: "Both" },
                ]}
              />
              <p className="text-[11px] text-gray-400 mt-1 ml-1">
                Offset is inactive while editing. Preview your page to see it in action.
              </p>
            </div>
          ),
        },
      ],
    },

    // === NAVIGATION TAB ===
    {
      tab: "Content",
      section: "Navigation",
      controls: [
        {
          name: "showArrows",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value} onChange={onChange} label="Arrows" />
          ),
        },
      ],
    },
    {
      tab: "Content",
      section: "Previous Arrow",
      controls: [
        {
          name: "prevIcon",
          responsive: false,
          render: (value: any, onChange: any) => (
            <IconPicker value={value} onChange={onChange} label="Icon" />
          ),
        },
        {
          name: "prevHorizontalOrientation",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <div>
              <span className="text-[13px] font-medium text-gray-700 block mb-1.5">Horizontal</span>
              <ButtonGroup
                value={value}
                onChange={onChange}
                defaultValue="start"
                grid={2}
                options={[
                  { value: "start", icon: "mdi:format-horizontal-align-left" },
                  { value: "center", icon: "mdi:format-horizontal-align-center" },
                  { value: "end", icon: "mdi:format-horizontal-align-right" },
                ]}
              />
            </div>
          ),
        },
        {
          name: "prevHorizontalPosition",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl value={value} onChange={onChange} label="Position" min={-200} max={200} step={1} unit="px" showSlider grid={2} />
          ),
        },
        {
          name: "prevVerticalOrientation",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div>
              <span className="text-[13px] font-medium text-gray-700 block mb-1.5">Vertical</span>
              <ButtonGroup
                value={value}
                onChange={onChange}
                defaultValue="center"
                grid={2}
                options={[
                  { value: "start", icon: "mdi:format-vertical-align-top" },
                  { value: "center", icon: "mdi:format-vertical-align-center" },
                  { value: "end", icon: "mdi:format-vertical-align-bottom" },
                ]}
              />
            </div>
          ),
        },
        {
          name: "prevVerticalPosition",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl value={value} onChange={onChange} label="Position" min={-200} max={200} step={1} unit="px" showSlider grid={2} />
          ),
        },
      ],
    },
    {
      tab: "Content",
      section: "Next Arrow",
      controls: [
        {
          name: "nextIcon",
          responsive: false,
          render: (value: any, onChange: any) => (
            <IconPicker value={value} onChange={onChange} label="Icon" />
          ),
        },
        {
          name: "nextHorizontalOrientation",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div>
              <span className="text-[13px] font-medium text-gray-700 block mb-1.5">Horizontal</span>
              <ButtonGroup
                value={value}
                onChange={onChange}
                defaultValue="end"
                grid={2}
                options={[
                  { value: "start", icon: "mdi:format-horizontal-align-left" },
                  { value: "center", icon: "mdi:format-horizontal-align-center" },
                  { value: "end", icon: "mdi:format-horizontal-align-right" },
                ]}
              />
            </div>
          ),
        },
        {
          name: "nextHorizontalPosition",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl value={value} onChange={onChange} label="Position" min={-200} max={200} step={1} unit="px" showSlider grid={2} />
          ),
        },
        {
          name: "nextVerticalOrientation",
          responsive: false,
          render: (value: any, onChange: any) => (
            <div>
              <span className="text-[13px] font-medium text-gray-700 block mb-1.5">Vertical</span>
              <ButtonGroup
                value={value}
                onChange={onChange}
                defaultValue="center"
                grid={2}
                options={[
                  { value: "start", icon: "mdi:format-vertical-align-top" },
                  { value: "center", icon: "mdi:format-vertical-align-center" },
                  { value: "end", icon: "mdi:format-vertical-align-bottom" },
                ]}
              />
            </div>
          ),
        },
        {
          name: "nextVerticalPosition",
          responsive: false,
          render: (value: any, onChange: any) => (
            <NumberControl value={value} onChange={onChange} label="Position" min={-200} max={200} step={1} unit="px" showSlider grid={2} />
          ),
        },
      ],
    },

    // === PAGINATION TAB ===
    {
      tab: "Content",
      section: "Pagination",
      controls: [
        {
          name: "paginationType",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              value={value}
              onChange={onChange}
              label="Pagination"
              options={[
                { value: "none", label: "None" },
                { value: "dots", label: "Dots" },
                { value: "fraction", label: "Fraction" },
                { value: "progressbar", label: "Progress" },
              ]}
            />
          ),
        },
      ],
    },

    // === STYLE TAB — Slides ===
    {
      tab: "Style",
      section: "Slides",
      controls: [
        {
          name: "slidesGap",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Slider value={value} onChange={onChange} label="Gap between slides" min={0} max={100} step={1} unit="px" />
          ),
        },
        {
          name: "slidesBackground",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Background value={value} onChange={onChange} />
          ),
        },
        {
          name: "slidesBorder",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Border value={value} onChange={onChange} />
          ),
        },
        {
          name: "slidesPadding",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" value={value} onChange={onChange} />
          ),
        },
      ],
    },

    // === STYLE TAB — Navigation ===
    {
      tab: "Style",
      section: "Navigation",
      controls: [
        {
          name: "navIconSize",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Slider value={value} onChange={onChange} label="Size" min={8} max={60} step={1} unit="px" />
          ),
        },
        {
          name: "navColors",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal",
                  content: (
                    <div className="space-y-3">
                      <ColorPickerPopup
                        label="Color"
                        value={schema.style?.navColors || "#333333"}
                        onChange={(v: string) => updateSchema("style", "navColors", v)}
                      />
                    </div>
                  ),
                },
                {
                  label: "Hover",
                  content: (
                    <div className="space-y-3">
                      <ColorPickerPopup
                        label="Color"
                        value={schema.style?.navHoverColor || "#ffffff"}
                        onChange={(v: string) => updateSchema("style", "navHoverColor", v)}
                      />
                    </div>
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
        {
          name: "navPosition",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              value={value}
              onChange={onChange}
              label="Position"
              options={[
                { value: "inside", label: "Inside" },
                { value: "outside", label: "Outside" },
              ]}
            />
          ),
        },
      ],
    },

    // === STYLE TAB — Pagination ===
    {
      tab: "Style",
      section: "Pagination",
      controls: [
        {
          name: "paginationDotSize",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Slider value={value} onChange={onChange} label="Size" min={4} max={30} step={1} unit="px" />
          ),
        },
        {
          name: "paginationDotSpacing",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Slider value={value} onChange={onChange} label="Space Between Dots" min={0} max={30} step={1} unit="px" />
          ),
        },
        {
          name: "paginationColors",
          responsive: false,
          render: (value: any, onChange: any, { schema, updateSchema }: any) => (
            <Tabs
              tabs={[
                {
                  label: "Normal",
                  content: (
                    <ColorPickerPopup
                      label="Color"
                      value={schema.style?.paginationColors || "#cccccc"}
                      onChange={(v: string) => updateSchema("style", "paginationColors", v)}
                    />
                  ),
                },
                {
                  label: "Hover",
                  content: (
                    <ColorPickerPopup
                      label="Color"
                      value={schema.style?.paginationHoverColor || "#333333"}
                      onChange={(v: string) => updateSchema("style", "paginationHoverColor", v)}
                    />
                  ),
                },
              ]}
            />
          ),
        },
        {
          name: "paginationCustomPosition",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle value={value} onChange={onChange} label="Custom Position" />
          ),
        },
        {
          name: "paginationSpaceFromSlides",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              value={value}
              onChange={onChange}
              label="Space From slides"
              options={[
                { value: "auto", label: "Auto" },
                { value: "custom", label: "Custom" },
              ]}
            />
          ),
        },
        {
          name: "paginationSpacing",
          responsive: false,
          render: (value: any, onChange: any, { schema }: any) => (
            <Slider value={value} onChange={onChange} label="Spacing" min={0} max={100} step={1} unit="px" />
          ),
          condition: (values: any) => values.style?.pagination?.spaceFromSlides === "custom",
        },
      ],
    },

    // === ADVANCED TAB ===
    {
      tab: "Advanced",
      section: "Spacing",
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
  // RENDER (front-end output)
  // ====================================
  render: (element: any) => {
    return <CarouselFrontend element={element} />;
  },
};

export default carouselElement;
