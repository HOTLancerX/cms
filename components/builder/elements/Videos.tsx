"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import {
  Text,
  Select,
  Toggle,
  NumberControl,
  ImageGallery,
  Dimensions,
  Border,
  IconPicker,
  ColorPickerPopup,
} from "../controls";

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

  const shadow = borderVal.boxShadow;
  if (shadow) {
    const activeShadow = hovered ? shadow.hover : shadow.normal;
    if (activeShadow) {
      const inset = activeShadow.inset === true || activeShadow.inset === "true";
      const x = activeShadow.x ?? 0;
      const y = activeShadow.y ?? 0;
      const b = activeShadow.blur ?? 0;
      const s = activeShadow.spread ?? 0;
      const c = activeShadow.color || "rgba(0,0,0,0.15)";
      if (b !== 0 || s !== 0 || x !== 0 || y !== 0) {
        styles.boxShadow = `${inset ? "inset " : ""}${x}px ${y}px ${b}px ${s}px ${c}`;
      }
    }
  }

  const transition = borderVal.transition ?? 300;
  styles.transition = `all ${transition}ms ease`;

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

const SOURCE_OPTIONS = [
  { value: "youtube", label: "YouTube" },
  { value: "vimeo", label: "Vimeo" },
  { value: "dailymotion", label: "Dailymotion" },
  { value: "self_hosted", label: "Self Hosted (MP4 / WebM)" },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 (Widescreen)" },
  { value: "4:3", label: "4:3 (Standard)" },
  { value: "3:2", label: "3:2" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "21:9", label: "21:9 (Ultrawide)" },
];

function extractYouTubeId(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : url;
}

function extractVimeoId(url: string): string {
  if (!url) return "";
  const match = url.match(/vimeo\.com\/(?:.*#|.*\/)?([0-9]+)/);
  return match ? match[1] : url.replace(/[^0-9]/g, "");
}

function extractDailymotionId(url: string): string {
  if (!url) return "";
  const match = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  return match ? match[1] : url;
}

function buildEmbedUrl(source: string, url: string, opts: any): string {
  if (!url) return "";

  if (source === "youtube") {
    const videoId = extractYouTubeId(url);
    const domain = opts.privacyMode ? "https://www.youtube-nocookie.com" : "https://www.youtube.com";
    const params = new URLSearchParams();

    if (opts.autoplay) params.set("autoplay", "1");
    if (opts.muted || opts.autoplay) params.set("mute", "1");
    if (opts.controls === false) params.set("controls", "0");
    if (opts.loop) {
      params.set("loop", "1");
      params.set("playlist", videoId);
    }
    if (opts.rel === false) params.set("rel", "0");
    if (opts.playsInline) params.set("playsinline", "1");
    if (opts.startTime > 0) params.set("start", String(opts.startTime));
    if (opts.endTime > 0) params.set("end", String(opts.endTime));

    return `${domain}/embed/${videoId}?${params.toString()}`;
  }

  if (source === "vimeo") {
    const videoId = extractVimeoId(url);
    const params = new URLSearchParams();
    if (opts.autoplay) params.set("autoplay", "1");
    if (opts.muted || opts.autoplay) params.set("muted", "1");
    if (opts.loop) params.set("loop", "1");
    if (opts.controls === false) params.set("controls", "0");

    return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
  }

  if (source === "dailymotion") {
    const videoId = extractDailymotionId(url);
    const params = new URLSearchParams();
    if (opts.autoplay) params.set("autoplay", "1");
    if (opts.muted || opts.autoplay) params.set("mute", "1");
    if (opts.controls === false) params.set("controls", "0");

    return `https://www.dailymotion.com/embed/video/${videoId}?${params.toString()}`;
  }

  return url;
}

function VideoFrontend({ element }: { element: any }) {
  const s = element.schema || {};
  const [hovered, setHovered] = useState(false);
  const [isPlayingOverlay, setIsPlayingOverlay] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const source: string = s.content?.source || "youtube";
  const youtubeUrl: string = s.content?.youtubeUrl || "https://www.youtube.com/watch?v=XHOmBV4js_E";
  const vimeoUrl: string = s.content?.vimeoUrl || "";
  const dailymotionUrl: string = s.content?.dailymotionUrl || "";
  const selfHostedUrl: string = s.content?.selfHostedUrl || "";
  const externalMp4Url: string = s.content?.externalMp4Url || "";

  const autoplay: boolean = s.content?.autoplay ?? false;
  const muted: boolean = s.content?.muted ?? false;
  const loop: boolean = s.content?.loop ?? false;
  const controls: boolean = s.content?.controls ?? true;
  const playsInline: boolean = s.content?.playsInline ?? true;
  const privacyMode: boolean = s.content?.privacyMode ?? false;
  const rel: boolean = s.content?.rel ?? false;
  const startTime: number = s.content?.startTime ?? 0;
  const endTime: number = s.content?.endTime ?? 0;

  const showImageOverlay: boolean = s.content?.showImageOverlay ?? false;
  const imageOverlay: string = s.content?.imageOverlay || "";
  const playIcon: boolean = s.content?.playIcon ?? true;
  const playIconName: string = s.content?.playIconName || "solar:play-bold";
  const playIconColor: string = s.content?.playIconColor || "#ffffff";
  const lightbox: boolean = s.content?.lightbox ?? false;

  const aspectRatio: string = s.style?.aspectRatio || "16:9";

  const activeVideoUrl =
    source === "youtube"
      ? youtubeUrl
      : source === "vimeo"
      ? vimeoUrl
      : source === "dailymotion"
      ? dailymotionUrl
      : selfHostedUrl || externalMp4Url;

  const embedUrl = buildEmbedUrl(source, activeVideoUrl, {
    autoplay: autoplay || isPlayingOverlay,
    muted: muted || (autoplay && !isPlayingOverlay),
    loop,
    controls,
    playsInline,
    privacyMode,
    rel,
    startTime,
    endTime,
  });

  const getAspectPadding = (ratio: string) => {
    switch (ratio) {
      case "4:3":
        return "75%";
      case "3:2":
        return "66.66%";
      case "1:1":
        return "100%";
      case "9:16":
        return "177.77%";
      case "21:9":
        return "42.85%";
      case "16:9":
      default:
        return "56.25%";
    }
  };

  const borderStyles = getBorderStyles(s.style?.border, hovered);

  const handleOverlayClick = () => {
    if (lightbox) {
      setIsLightboxOpen(true);
    } else {
      setIsPlayingOverlay(true);
    }
  };

  return (
    <div
      className="w-full relative select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-full relative overflow-hidden bg-black shadow-lg"
        style={{
          paddingBottom: getAspectPadding(aspectRatio),
          ...borderStyles,
        }}
      >
        {/* Custom Image Poster Overlay (if enabled & not played yet) */}
        {showImageOverlay && imageOverlay && !isPlayingOverlay ? (
          <div
            className="absolute inset-0 z-20 cursor-pointer group flex items-center justify-center overflow-hidden"
            onClick={handleOverlayClick}
          >
            <img
              src={imageOverlay}
              alt="Video Poster Overlay"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

            {/* Play Button Icon Overlay (100% Dead Centered) */}
            {playIcon && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Icon
                    icon={playIconName}
                    width={28}
                    style={{ color: playIconColor !== "#ffffff" ? playIconColor : "#111827" }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Video Player Render */}
        {source === "self_hosted" ? (
          <video
            src={selfHostedUrl || externalMp4Url}
            poster={imageOverlay}
            controls={controls}
            autoPlay={autoplay || isPlayingOverlay}
            muted={muted}
            loop={loop}
            playsInline={playsInline}
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        ) : (
          <iframe
            src={embedUrl}
            title="Video Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full z-10 border-0"
          />
        )}
      </div>

      {/* Lightbox Modal Overlay */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close Lightbox"
            className="absolute top-6 right-6 z-50 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer"
          >
            <Icon icon="solar:close-circle-bold" width={32} />
          </button>

          <div
            className="w-full max-w-5xl relative overflow-hidden rounded-2xl shadow-2xl bg-black"
            style={{ paddingBottom: getAspectPadding(aspectRatio) }}
            onClick={(e) => e.stopPropagation()}
          >
            {source === "self_hosted" ? (
              <video
                src={selfHostedUrl || externalMp4Url}
                controls
                autoPlay
                className="absolute inset-0 w-full h-full object-cover border-0"
              />
            ) : (
              <iframe
                src={buildEmbedUrl(source, activeVideoUrl, {
                  autoplay: true,
                  muted: false,
                  loop,
                  controls: true,
                  playsInline,
                  privacyMode,
                  rel,
                })}
                title="Lightbox Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const videoElement = {
  type: "videos",
  label: "Video Player",
  category: "media",

  schema: {
    content: {
      source: "youtube",
      youtubeUrl: "https://www.youtube.com/watch?v=XHOmBV4js_E",
      vimeoUrl: "",
      dailymotionUrl: "",
      selfHostedUrl: "",
      externalMp4Url: "",
      autoplay: false,
      muted: false,
      loop: false,
      controls: true,
      playsInline: true,
      privacyMode: false,
      rel: false,
      startTime: 0,
      endTime: 0,
      showImageOverlay: false,
      imageOverlay: "",
      playIcon: true,
      playIconName: "solar:play-bold",
      playIconColor: "#ffffff",
      lightbox: false,
    },

    style: {
      aspectRatio: "16:9",
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      border: {
        normal: { type: "none", color: "#e2e8f0", width: { top: 0, right: 0, bottom: 0, left: 0 }, radius: { top: 12, right: 12, bottom: 12, left: 12 } },
        hover: {},
      },
    },
  },

  controls: [
    // ═══════════════════ CONTENT TAB ═══════════════
    {
      tab: "Content",
      section: "Video Source",
      controls: [
        {
          name: "source",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select label="Video Source" value={value || "youtube"} onChange={onChange} options={SOURCE_OPTIONS} />
          ),
        },
        {
          name: "youtubeUrl",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "youtube" ? (
              <Text label="YouTube URL or Video ID" value={value || ""} onChange={onChange} placeholder="https://www.youtube.com/watch?v=..." />
            ) : null,
        },
        {
          name: "vimeoUrl",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "vimeo" ? (
              <Text label="Vimeo URL or Video ID" value={value || ""} onChange={onChange} placeholder="https://vimeo.com/..." />
            ) : null,
        },
        {
          name: "dailymotionUrl",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "dailymotion" ? (
              <Text label="Dailymotion URL or Video ID" value={value || ""} onChange={onChange} placeholder="https://www.dailymotion.com/video/..." />
            ) : null,
        },
        {
          name: "selfHostedUrl",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "self_hosted" ? (
              <div className="space-y-2">
                <ImageGallery label="Select MP4 / Video File" value={value || ""} onChange={onChange} />
                <Text
                  label="Or External MP4 Direct URL"
                  value={element.schema?.content?.externalMp4Url || ""}
                  onChange={(v) => {
                    const s = element.schema || {};
                    element.schema = { ...s, content: { ...s.content, externalMp4Url: v } };
                  }}
                  placeholder="https://domain.com/video.mp4"
                />
              </div>
            ) : null,
        },
      ],
    },

    {
      tab: "Content",
      section: "Video Player Options",
      controls: [
        {
          name: "autoplay",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Autoplay (Muted by Browsers)" value={value ?? false} onChange={onChange} />
          ),
        },
        {
          name: "muted",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Mute Audio" value={value ?? false} onChange={onChange} />
          ),
        },
        {
          name: "loop",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Loop Video" value={value ?? false} onChange={onChange} />
          ),
        },
        {
          name: "controls",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Player Controls" value={value ?? true} onChange={onChange} />
          ),
        },
        {
          name: "playsInline",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Play Inline on Mobile" value={value ?? true} onChange={onChange} />
          ),
        },
        {
          name: "privacyMode",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "youtube" ? (
              <Toggle label="YouTube Privacy-Enhanced Mode (nocookie)" value={value ?? false} onChange={onChange} />
            ) : null,
        },
        {
          name: "rel",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "youtube" ? (
              <Toggle label="Show Channel Related Videos" value={value ?? false} onChange={onChange} />
            ) : null,
        },
        {
          name: "startTime",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "youtube" ? (
              <NumberControl label="Start Time (seconds)" value={value ?? 0} onChange={onChange} min={0} max={36000} step={1} />
            ) : null,
        },
        {
          name: "endTime",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.source === "youtube" ? (
              <NumberControl label="End Time (seconds, 0 = End)" value={value ?? 0} onChange={onChange} min={0} max={36000} step={1} />
            ) : null,
        },
      ],
    },

    {
      tab: "Content",
      section: "Image Overlay & Lightbox",
      controls: [
        {
          name: "showImageOverlay",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Image Overlay / Custom Cover Poster" value={value ?? false} onChange={onChange} />
          ),
        },
        {
          name: "imageOverlay",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.showImageOverlay ? (
              <ImageGallery label="Select Poster Image" value={value || ""} onChange={onChange} />
            ) : null,
        },
        {
          name: "playIcon",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.showImageOverlay ? (
              <div className="space-y-2">
                <Toggle label="Show Play Icon Overlay" value={value ?? true} onChange={onChange} />
                {value ?? true ? (
                  <IconPicker
                    label="Play Icon"
                    value={element.schema?.content?.playIconName || "solar:play-bold"}
                    onChange={(v) => {
                      const s = element.schema || {};
                      element.schema = { ...s, content: { ...s.content, playIconName: v } };
                    }}
                  />
                ) : null}
              </div>
            ) : null,
        },
        {
          name: "lightbox",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.showImageOverlay ? (
              <Toggle label="Play Video in Fullscreen Lightbox Modal" value={value ?? false} onChange={onChange} />
            ) : null,
        },
      ],
    },

    // ═══════════════════ STYLE TAB ═══════════════
    {
      tab: "Style",
      section: "Layout & Aspect Ratio",
      controls: [
        {
          name: "aspectRatio",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select label="Aspect Ratio" value={value || "16:9"} onChange={onChange} options={ASPECT_RATIO_OPTIONS} />
          ),
        },
      ],
    },

    {
      tab: "Style",
      section: "Border & Shadow",
      controls: [
        {
          name: "border",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Border label="Border & Border Radius" value={value} onChange={onChange} />
          ),
        },
      ],
    },
  ],

  render: (element: any) => <VideoFrontend element={element} />,
};

export default videoElement;
