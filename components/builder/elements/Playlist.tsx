"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Text, Select, Toggle } from "../controls";

export interface PlaylistItem {
  id: string;
  title: string;
  videoId: string;
  duration?: string;
  thumbnail?: string;
  author?: string;
}

const DEFAULT_VIDEOS: PlaylistItem[] = [
  {
    id: "XHOmBV4js_E",
    title: "Introducing Next.js 15 & Modern Web Development",
    videoId: "XHOmBV4js_E",
    author: "Vercel",
    thumbnail: "https://img.youtube.com/vi/XHOmBV4js_E/hqdefault.jpg",
  },
  {
    id: "8pDqJVdNa44",
    title: "React 19 Complete Full Course & Features Breakdown",
    videoId: "8pDqJVdNa44",
    author: "React Team",
    thumbnail: "https://img.youtube.com/vi/8pDqJVdNa44/hqdefault.jpg",
  },
  {
    id: "_cntxzqzu43",
    title: "Tailwind CSS v4 & Advanced Layout Systems Masterclass",
    videoId: "_cntxzqzu43",
    author: "Tailwind Labs",
    thumbnail: "https://img.youtube.com/vi/_cntxzqzu43/hqdefault.jpg",
  },
  {
    id: "d56mG7DezGs",
    title: "Building Production Scalable Web Apps with TypeScript",
    videoId: "d56mG7DezGs",
    author: "Tech World",
    thumbnail: "https://img.youtube.com/vi/d56mG7DezGs/hqdefault.jpg",
  },
];

function extractPlaylistId(input: string): string {
  if (!input) return "";
  const match = input.match(/[?&]list=([^#&?]+)/);
  if (match && match[1]) return match[1];
  return input.trim();
}

function extractVideoId(input: string): string {
  if (!input) return "XHOmBV4js_E";
  if (input.includes("youtu.be/")) {
    return input.split("youtu.be/")[1]?.split("?")[0] || input;
  }
  if (input.includes("youtube.com/watch")) {
    const match = input.match(/[?&]v=([^#&?]+)/);
    if (match && match[1]) return match[1];
  }
  return input.trim();
}

function PlaylistFrontend({ element }: { element: any }) {
  const s = element.schema || {};

  // Content Toggles & Settings
  const rawPlaylistId: string = s.content?.playlistId || "";
  const playlistId = extractPlaylistId(rawPlaylistId);

  const playlistTitle: string = s.content?.playlistTitle || "Featured Video Playlist";
  const showHeader: boolean = s.content?.showHeader ?? true;
  const layoutStyle: "sidebar" | "grid" | "carousel" | "list" = s.content?.layoutStyle || "sidebar";
  const theme: "dark" | "light" | "transparent" = s.content?.theme || "transparent";
  const autoplay: boolean = s.content?.autoplay ?? false;
  const showThumbnails: boolean = s.content?.showThumbnails ?? true;
  const showVideoCount: boolean = s.content?.showVideoCount ?? true;
  const showAuthor: boolean = s.content?.showAuthor ?? true;

  const [videos, setVideos] = useState<PlaylistItem[]>(DEFAULT_VIDEOS);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Automatically fetch videos from YouTube Playlist API when playlistId is provided
  useEffect(() => {
    if (!playlistId) {
      setVideos(DEFAULT_VIDEOS);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/youtube/playlist?playlistId=${encodeURIComponent(playlistId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data.items) && data.items.length > 0) {
            setVideos(data.items);
            setActiveIndex(0);
          } else {
            setVideos(DEFAULT_VIDEOS);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load playlist items:", err);
        if (isMounted) setVideos(DEFAULT_VIDEOS);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [playlistId]);

  const currentVideo = videos[activeIndex] || videos[0];
  const currentVideoId = extractVideoId(currentVideo?.videoId || "XHOmBV4js_E");

  // Styling Aspect Ratio
  const aspectRatio: string = s.style?.aspectRatio || "16:9";
  let aspectClass = "aspect-video";
  if (aspectRatio === "4:3") aspectClass = "aspect-[4/3]";
  else if (aspectRatio === "21:9") aspectClass = "aspect-[21/9]";

  // Dynamic iframe embed URL
  const embedUrl = `https://www.youtube.com/embed/${currentVideoId}?autoplay=${autoplay ? 1 : 0}&rel=0`;

  // Theme Styling Classes - Clean inheritance without hardcoded shadows
  const isDark = theme === "dark";
  const isLight = theme === "light";

  const containerBg = isDark
    ? "bg-neutral-900 text-white"
    : isLight
    ? "bg-white text-gray-900 border border-gray-200"
    : "bg-transparent text-current";

  const sidebarBg = isDark
    ? "bg-neutral-950/80 border-neutral-800"
    : isLight
    ? "bg-gray-50 border-gray-200"
    : "bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10";

  const activeCardBg = isDark
    ? "bg-neutral-800 border-red-500/50"
    : isLight
    ? "bg-blue-50/90 border-blue-500/50 text-blue-900"
    : "bg-red-500/10 border-red-500/40";

  const inactiveCardHover = isDark
    ? "hover:bg-neutral-800/60"
    : isLight
    ? "hover:bg-gray-100"
    : "hover:bg-black/5 dark:hover:bg-white/5";

  const secondaryTextColor = isDark
    ? "text-neutral-400"
    : isLight
    ? "text-gray-500"
    : "opacity-70";

  return (
    <section className="w-full">
      <div className={`w-full rounded-2xl overflow-hidden transition-all duration-300 ${containerBg}`}>
        {/* Header Title Bar (Toggleable) */}
        {showHeader && (
          <div
            className={`p-4 sm:p-5 border-b flex items-center justify-between gap-4 ${
              isDark
                ? "border-neutral-800 bg-neutral-900/90"
                : isLight
                ? "border-gray-100 bg-white"
                : "border-black/10 dark:border-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
                <Icon icon="solar:playlist-minimalistic-bold" width={22} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">{playlistTitle}</h3>
                {showVideoCount && (
                  <p className={`text-xs ${secondaryTextColor} flex items-center gap-1.5 mt-0.5`}>
                    <Icon icon="solar:videocamera-record-bold" width={12} className="text-red-500" />
                    {loading
                      ? "Fetching YouTube Playlist..."
                      : `${videos.length} Video${videos.length !== 1 ? "s" : ""} from YouTube`}
                  </p>
                )}
              </div>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full">
                <Icon icon="svg-spinners:ring-resize" width={14} />
                Loading Playlist…
              </div>
            )}
          </div>
        )}

        {/* LAYOUT STYLE 1: SIDEBAR (Course / Academy Style) */}
        {layoutStyle === "sidebar" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Main Featured Video Player Stage */}
            <div className="lg:col-span-8 bg-black flex items-center justify-center relative">
              <div className={`w-full ${aspectClass} relative overflow-hidden`}>
                <iframe
                  src={embedUrl || undefined}
                  title={currentVideo?.title || "Video Player"}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Right Playlist Navigation Sidebar */}
            <div className={`lg:col-span-4 border-t lg:border-t-0 lg:border-l flex flex-col max-h-130 ${sidebarBg}`}>
              <div
                className={`p-3.5 border-b text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
                  isDark ? "border-neutral-800 text-neutral-400" : isLight ? "border-gray-200 text-gray-600" : "border-black/10 dark:border-white/10"
                }`}
              >
                <span>Up Next ({activeIndex + 1}/{videos.length})</span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold">LIVE PLAYLIST</span>
              </div>

              {/* Scrolling List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {videos.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const thumb =
                    item.thumbnail || `https://img.youtube.com/vi/${extractVideoId(item.videoId)}/hqdefault.jpg`;

                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 flex gap-3 cursor-pointer group relative ${
                        isActive
                          ? activeCardBg
                          : `${
                              isDark
                                ? "border-neutral-800/80 bg-neutral-900/50"
                                : isLight
                                ? "border-gray-200/80 bg-white"
                                : "border-black/10 dark:border-white/10"
                            } ${inactiveCardHover}`
                      }`}
                    >
                      {/* Thumbnail Container */}
                      {showThumbnails && (
                        <div className="w-24 h-15 rounded-lg overflow-hidden shrink-0 bg-neutral-800 relative border border-black/20">
                          <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition`}>
                            <Icon icon={isActive ? "solar:play-stream-bold" : "solar:play-bold"} width={20} className="text-white" />
                          </div>
                        </div>
                      )}

                      {/* Video Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <p className={`text-xs font-semibold line-clamp-2 transition ${isActive ? "text-red-500 font-bold" : ""}`}>
                          {idx + 1}. {item.title}
                        </p>
                        {showAuthor && item.author && (
                          <span className={`text-[10px] ${secondaryTextColor} truncate mt-1`}>
                            {item.author}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT STYLE 2: GRID GALLERY */}
        {layoutStyle === "grid" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Top Stage */}
            <div className={`w-full ${aspectClass} relative rounded-xl overflow-hidden bg-black`}>
              <iframe
                src={embedUrl || undefined}
                title={currentVideo?.title || "Video Player"}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Bottom Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {videos.map((item, idx) => {
                const isActive = idx === activeIndex;
                const thumb =
                  item.thumbnail || `https://img.youtube.com/vi/${extractVideoId(item.videoId)}/hqdefault.jpg`;

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`rounded-xl border p-3 cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                      isActive
                        ? activeCardBg
                        : `${
                            isDark
                              ? "border-neutral-800 bg-neutral-900"
                              : isLight
                              ? "border-gray-200 bg-gray-50"
                              : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
                          } ${inactiveCardHover}`
                    }`}
                  >
                    <div className="w-full aspect-video rounded-lg overflow-hidden relative bg-neutral-800">
                      <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition`}>
                        <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center">
                          <Icon icon="solar:play-bold" width={20} />
                        </div>
                      </div>
                    </div>
                    <p className={`text-xs font-semibold line-clamp-2 mt-2.5 ${isActive ? "text-red-500 font-bold" : ""}`}>
                      {item.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LAYOUT STYLE 3: HORIZONTAL CAROUSEL */}
        {layoutStyle === "carousel" && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className={`w-full ${aspectClass} relative rounded-xl overflow-hidden bg-black`}>
              <iframe
                src={embedUrl || undefined}
                title={currentVideo?.title || "Video Player"}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Horizontal Slider Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-3">
              {videos.map((item, idx) => {
                const isActive = idx === activeIndex;
                const thumb =
                  item.thumbnail || `https://img.youtube.com/vi/${extractVideoId(item.videoId)}/hqdefault.jpg`;

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`w-60 shrink-0 rounded-xl border p-3 cursor-pointer transition-all duration-200 group ${
                      isActive
                        ? activeCardBg
                        : `${
                            isDark
                              ? "border-neutral-800 bg-neutral-900"
                              : isLight
                              ? "border-gray-200 bg-gray-50"
                              : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
                          } ${inactiveCardHover}`
                    }`}
                  >
                    <div className="w-full aspect-video rounded-lg overflow-hidden relative bg-neutral-800">
                      <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition`}>
                        <Icon icon="solar:play-bold" width={22} className="text-white" />
                      </div>
                    </div>
                    <p className={`text-xs font-semibold line-clamp-2 mt-2 ${isActive ? "text-red-500 font-bold" : ""}`}>
                      {item.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LAYOUT STYLE 4: COMPACT LIST */}
        {layoutStyle === "list" && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className={`w-full ${aspectClass} relative rounded-xl overflow-hidden bg-black`}>
              <iframe
                src={embedUrl || undefined}
                title={currentVideo?.title || "Video Player"}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="divide-y divide-black/10 dark:divide-white/10 border rounded-xl overflow-hidden">
              {videos.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`w-full p-3.5 text-left flex items-center justify-between gap-4 transition cursor-pointer ${
                      isActive ? activeCardBg : `${inactiveCardHover}`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-red-600 text-white"
                            : `${isDark ? "bg-neutral-800 text-neutral-300" : "bg-black/10 text-gray-700"}`
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className={`text-xs font-semibold truncate ${isActive ? "text-red-500 font-bold" : ""}`}>
                        {item.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const playlistElement = {
  type: "playlist",
  label: "YouTube Playlist",
  category: "media",

  schema: {
    content: {
      playlistTitle: "Featured Video Playlist",
      showHeader: true,
      playlistId: "",
      layoutStyle: "sidebar",
      theme: "transparent",
      autoplay: false,
      showThumbnails: true,
      showVideoCount: true,
      showAuthor: true,
    },

    style: {
      aspectRatio: "16:9",
    },
  },

  controls: [
    // ═══════════════════ CONTENT TAB ═══════════════
    {
      tab: "Content",
      section: "Playlist Configuration",
      controls: [
        {
          name: "showHeader",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Show Playlist Header" value={value ?? true} onChange={onChange} />
          ),
        },
        {
          name: "playlistTitle",
          responsive: false,
          render: (value: any, onChange: any, element: any) =>
            element.schema?.content?.showHeader !== false ? (
              <Text label="Playlist Header Title" value={value || ""} onChange={onChange} placeholder="e.g. Featured Video Playlist" />
            ) : null,
        },
        {
          name: "playlistId",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="YouTube Playlist ID or URL" value={value || ""} onChange={onChange} placeholder="Paste YouTube Playlist URL or ID" />
          ),
        },
        {
          name: "layoutStyle",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Layout Style"
              value={value || "sidebar"}
              onChange={onChange}
              options={[
                { label: "Sidebar (Course / Academy Style)", value: "sidebar" },
                { label: "Grid Gallery", value: "grid" },
                { label: "Horizontal Carousel", value: "carousel" },
                { label: "Compact List", value: "list" },
              ]}
            />
          ),
        },
        {
          name: "theme",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Container Theme"
              value={value || "transparent"}
              onChange={onChange}
              options={[
                { label: "Transparent (Clean Inheritance)", value: "transparent" },
                { label: "Dark Mode", value: "dark" },
                { label: "Light Mode", value: "light" },
              ]}
            />
          ),
        },
        {
          name: "autoplay",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Autoplay Video" value={value ?? false} onChange={onChange} />
          ),
        },
        {
          name: "showThumbnails",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Show Thumbnails" value={value ?? true} onChange={onChange} />
          ),
        },
        {
          name: "showVideoCount",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Show Total Video Count" value={value ?? true} onChange={onChange} />
          ),
        },
        {
          name: "showAuthor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Toggle label="Show Channel Author" value={value ?? true} onChange={onChange} />
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ═══════════════
    {
      tab: "Style",
      section: "Player Aspect Ratio",
      controls: [
        {
          name: "aspectRatio",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Aspect Ratio"
              value={value || "16:9"}
              onChange={onChange}
              options={[
                { label: "16:9 (Standard Widescreen)", value: "16:9" },
                { label: "4:3 (Classic TV)", value: "4:3" },
                { label: "21:9 (Ultrawide Cinema)", value: "21:9" },
              ]}
            />
          ),
        },
      ],
    },
  ],

  render: (element: any) => <PlaylistFrontend element={element} />,
};

export default playlistElement;
