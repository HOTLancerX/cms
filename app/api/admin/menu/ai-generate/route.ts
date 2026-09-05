import { NextRequest, NextResponse } from "next/server";
import { Settings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export interface GeneratedMenuItem {
  id: string;
  type: string;
  label: string;
  url: string;
  icon?: string;
  showMode?: "both" | "text" | "icon";
  displayStyle?: "none" | "left" | "right" | "mega" | "style-1" | "style-2" | "style-3" | "style-4" | "style-5" | "builder";
  gridNumber?: number;
  showPosts?: boolean;
  layoutType?: "grid" | "slider";
  postLimit?: number;
  children?: GeneratedMenuItem[];
  order: number;
}

// ── Fallback Pre-configured Demos ──────────────────────────────────────────
function getDemoMenu(preset: string, depth: number = 2): { title: string; location: string; explanation: string; items: GeneratedMenuItem[] } {
  const ts = Date.now();

  if (preset === "news") {
    return {
      title: "News & Media Navigation",
      location: "header-1",
      explanation: "News portal menu featuring top news sections, multimedia dropdowns, and dynamic category post grids.",
      items: [
        {
          id: `item-${ts}-1`,
          type: "custom",
          label: "Home",
          url: "/",
          icon: "solar:home-2-bold",
          showMode: "both",
          order: 0,
          children: [],
        },
        {
          id: `item-${ts}-2`,
          type: "cat",
          label: "National",
          url: "/news/national",
          icon: "solar:flag-bold",
          showMode: "both",
          displayStyle: "mega",
          gridNumber: 4,
          showPosts: true,
          layoutType: "grid",
          postLimit: 6,
          order: 1,
          children: depth > 1 ? [
            { id: `item-${ts}-2-1`, type: "cat", label: "Politics", url: "/news/politics", icon: "solar:diploma-bold", order: 0, children: [] },
            { id: `item-${ts}-2-2`, type: "cat", label: "Economy & Business", url: "/news/economy", icon: "solar:chart-2-bold", order: 1, children: [] },
            { id: `item-${ts}-2-3`, type: "cat", label: "Education & Campus", url: "/news/education", icon: "solar:book-bookmark-bold", order: 2, children: [] },
            { id: `item-${ts}-2-4`, type: "cat", label: "Law & Crime", url: "/news/crime", icon: "solar:shield-bold", order: 3, children: [] },
          ] : [],
        },
        {
          id: `item-${ts}-3`,
          type: "cat",
          label: "World",
          url: "/news/world",
          icon: "solar:globus-bold",
          showMode: "both",
          displayStyle: "style-1",
          order: 2,
          children: depth > 1 ? [
            { id: `item-${ts}-3-1`, type: "cat", label: "Asia", url: "/news/world/asia", icon: "solar:map-point-bold", order: 0, children: [] },
            { id: `item-${ts}-3-2`, type: "cat", label: "Middle East", url: "/news/world/middle-east", icon: "solar:map-point-bold", order: 1, children: [] },
            { id: `item-${ts}-3-3`, type: "cat", label: "Europe & Americas", url: "/news/world/west", icon: "solar:map-point-bold", order: 2, children: [] },
          ] : [],
        },
        {
          id: `item-${ts}-4`,
          type: "cat",
          label: "Tech & Gadgets",
          url: "/news/tech",
          icon: "solar:laptop-minimalistic-bold",
          showMode: "both",
          displayStyle: "mega",
          showPosts: true,
          layoutType: "slider",
          gridNumber: 3,
          postLimit: 8,
          order: 3,
          children: depth > 1 ? [
            { id: `item-${ts}-4-1`, type: "cat", label: "AI & Innovation", url: "/news/tech/ai", icon: "solar:cpu-bolt-bold", order: 0, children: [] },
            { id: `item-${ts}-4-2`, type: "cat", label: "Smartphones", url: "/news/tech/mobiles", icon: "solar:smartphone-bold", order: 1, children: [] },
            { id: `item-${ts}-4-3`, type: "cat", label: "Cybersecurity", url: "/news/tech/security", icon: "solar:lock-keyhole-bold", order: 2, children: [] },
          ] : [],
        },
        {
          id: `item-${ts}-5`,
          type: "cat",
          label: "Sports",
          url: "/news/sports",
          icon: "solar:cup-first-bold",
          showMode: "both",
          order: 4,
          children: depth > 1 ? [
            { id: `item-${ts}-5-1`, type: "cat", label: "Cricket", url: "/news/sports/cricket", icon: "solar:medal-star-bold", order: 0, children: [] },
            { id: `item-${ts}-5-2`, type: "cat", label: "Football", url: "/news/sports/football", icon: "solar:cup-star-bold", order: 1, children: [] },
          ] : [],
        },
        {
          id: `item-${ts}-6`,
          type: "custom",
          label: "Opinion & Editorials",
          url: "/opinion",
          icon: "solar:pen-new-square-bold",
          showMode: "both",
          order: 5,
          children: [],
        },
      ],
    };
  }

  if (preset === "saas") {
    return {
      title: "SaaS Platform Header Menu",
      location: "header-1",
      explanation: "Software as a Service menu structure showcasing product features, solutions, pricing, and resource hub.",
      items: [
        {
          id: `item-${ts}-1`,
          type: "custom",
          label: "Platform",
          url: "/platform",
          icon: "solar:widget-bold",
          showMode: "both",
          displayStyle: "mega",
          gridNumber: 3,
          order: 0,
          children: [
            {
              id: `item-${ts}-1-1`,
              type: "custom",
              label: "Core CMS Engine",
              url: "/platform/cms",
              icon: "solar:layers-bold",
              order: 0,
              children: depth > 2 ? [
                { id: `item-${ts}-1-1-1`, type: "custom", label: "Visual Page Builder", url: "/platform/cms/builder", order: 0 },
                { id: `item-${ts}-1-1-2`, type: "custom", label: "Plugin Architecture", url: "/platform/cms/plugins", order: 1 },
              ] : [],
            },
            {
              id: `item-${ts}-1-2`,
              type: "custom",
              label: "AI Automation",
              url: "/platform/ai",
              icon: "solar:stars-bold",
              order: 1,
              children: depth > 2 ? [
                { id: `item-${ts}-1-2-1`, type: "custom", label: "Content Generation", url: "/platform/ai/content", order: 0 },
                { id: `item-${ts}-1-2-2`, type: "custom", label: "SEO Copilot", url: "/platform/ai/seo", order: 1 },
              ] : [],
            },
            {
              id: `item-${ts}-1-3`,
              type: "custom",
              label: "Analytics & Tracking",
              url: "/platform/analytics",
              icon: "solar:graph-bold",
              order: 2,
              children: [],
            },
          ],
        },
        {
          id: `item-${ts}-2`,
          type: "custom",
          label: "Solutions",
          url: "/solutions",
          icon: "solar:case-round-bold",
          showMode: "both",
          displayStyle: "style-2",
          order: 1,
          children: [
            { id: `item-${ts}-2-1`, type: "custom", label: "For Publishers & Media", url: "/solutions/media", icon: "solar:document-bold", order: 0, children: [] },
            { id: `item-${ts}-2-2`, type: "custom", label: "For E-Commerce Brands", url: "/solutions/ecommerce", icon: "solar:cart-bold", order: 1, children: [] },
            { id: `item-${ts}-2-3`, type: "custom", label: "For Enterprises", url: "/solutions/enterprise", icon: "solar:buildings-bold", order: 2, children: [] },
          ],
        },
        {
          id: `item-${ts}-3`,
          type: "custom",
          label: "Pricing",
          url: "/pricing",
          icon: "solar:tag-price-bold",
          showMode: "both",
          order: 2,
          children: [],
        },
        {
          id: `item-${ts}-4`,
          type: "custom",
          label: "Resources",
          url: "/resources",
          icon: "solar:book-2-bold",
          showMode: "both",
          order: 3,
          children: [
            { id: `item-${ts}-4-1`, type: "custom", label: "Documentation", url: "/docs", icon: "solar:document-text-bold", order: 0, children: [] },
            { id: `item-${ts}-4-2`, type: "custom", label: "API Reference", url: "/docs/api", icon: "solar:code-bold", order: 1, children: [] },
            { id: `item-${ts}-4-3`, type: "custom", label: "Community Forum", url: "/community", icon: "solar:users-group-rounded-bold", order: 2, children: [] },
          ],
        },
        {
          id: `item-${ts}-5`,
          type: "custom",
          label: "Company",
          url: "/about",
          icon: "solar:users-group-two-rounded-bold",
          showMode: "text",
          order: 4,
          children: [],
        },
      ],
    };
  }

  // Default: E-Commerce Store
  return {
    title: "E-Commerce Mega Menu",
    location: "header-1",
    explanation: "High-converting online store menu with multi-level product categories, featured brands, and sale banners.",
    items: [
      {
        id: `item-${ts}-1`,
        type: "custom",
        label: "Home",
        url: "/",
        icon: "solar:home-2-bold",
        showMode: "both",
        order: 0,
        children: [],
      },
      {
        id: `item-${ts}-2`,
        type: "cat",
        label: "Shop Categories",
        url: "/shop",
        icon: "solar:bag-3-bold",
        showMode: "both",
        displayStyle: "mega",
        gridNumber: 4,
        order: 1,
        children: [
          {
            id: `item-${ts}-2-1`,
            type: "cat",
            label: "Men's Fashion",
            url: "/category/men",
            icon: "solar:user-bold",
            order: 0,
            children: depth > 1 ? [
              { id: `item-${ts}-2-1-1`, type: "cat", label: "Shirts & Polos", url: "/category/men-shirts", order: 0 },
              { id: `item-${ts}-2-1-2`, type: "cat", label: "Jackets & Coats", url: "/category/men-jackets", order: 1 },
              { id: `item-${ts}-2-1-3`, type: "cat", label: "Footwear & Shoes", url: "/category/men-shoes", order: 2 },
            ] : [],
          },
          {
            id: `item-${ts}-2-2`,
            type: "cat",
            label: "Women's Fashion",
            url: "/category/women",
            icon: "solar:heart-bold",
            order: 1,
            children: depth > 1 ? [
              { id: `item-${ts}-2-2-1`, type: "cat", label: "Dresses & Tops", url: "/category/women-dresses", order: 0 },
              { id: `item-${ts}-2-2-2`, type: "cat", label: "Bags & Handbags", url: "/category/women-bags", order: 1 },
              { id: `item-${ts}-2-2-3`, type: "cat", label: "Jewelry & Watches", url: "/category/women-jewelry", order: 2 },
            ] : [],
          },
          {
            id: `item-${ts}-2-3`,
            type: "cat",
            label: "Electronics",
            url: "/category/electronics",
            icon: "solar:devices-bold",
            order: 2,
            children: depth > 1 ? [
              { id: `item-${ts}-2-3-1`, type: "cat", label: "Smartphones", url: "/category/smartphones", order: 0 },
              { id: `item-${ts}-2-3-2`, type: "cat", label: "Laptops & PCs", url: "/category/laptops", order: 1 },
              { id: `item-${ts}-2-3-3`, type: "cat", label: "Audio & Headphones", url: "/category/audio", order: 2 },
            ] : [],
          },
          {
            id: `item-${ts}-2-4`,
            type: "cat",
            label: "Home & Living",
            url: "/category/home",
            icon: "solar:sofa-bold",
            order: 3,
            children: depth > 1 ? [
              { id: `item-${ts}-2-4-1`, type: "cat", label: "Furniture", url: "/category/furniture", order: 0 },
              { id: `item-${ts}-2-4-2`, type: "cat", label: "Kitchen & Dining", url: "/category/kitchen", order: 1 },
              { id: `item-${ts}-2-4-3`, type: "cat", label: "Home Decor", url: "/category/decor", order: 2 },
            ] : [],
          },
        ],
      },
      {
        id: `item-${ts}-3`,
        type: "custom",
        label: "Featured Brands",
        url: "/brands",
        icon: "solar:star-fall-bold",
        showMode: "both",
        order: 2,
        children: [
          { id: `item-${ts}-3-1`, type: "custom", label: "Nike", url: "/brands/nike", order: 0, children: [] },
          { id: `item-${ts}-3-2`, type: "custom", label: "Apple", url: "/brands/apple", order: 1, children: [] },
          { id: `item-${ts}-3-3`, type: "custom", label: "Samsung", url: "/brands/samsung", order: 2, children: [] },
          { id: `item-${ts}-3-4`, type: "custom", label: "Zara", url: "/brands/zara", order: 3, children: [] },
        ],
      },
      {
        id: `item-${ts}-4`,
        type: "custom",
        label: "Hot Deals & Sale",
        url: "/sale",
        icon: "solar:fire-bold",
        showMode: "both",
        order: 3,
        children: [],
      },
      {
        id: `item-${ts}-5`,
        type: "custom",
        label: "Customer Care",
        url: "/support",
        icon: "solar:headphones-round-bold",
        showMode: "both",
        order: 4,
        children: [
          { id: `item-${ts}-5-1`, type: "custom", label: "Track Your Order", url: "/track-order", icon: "solar:box-bold", order: 0, children: [] },
          { id: `item-${ts}-5-2`, type: "custom", label: "Returns & Refunds", url: "/refund-policy", icon: "solar:refresh-circle-bold", order: 1, children: [] },
          { id: `item-${ts}-5-3`, type: "custom", label: "FAQ & Help Center", url: "/faq", icon: "solar:question-circle-bold", order: 2, children: [] },
        ],
      },
    ],
  };
}

// ── Local Outline / Text Parser Helper ────────────────────────────────────
function parseTextToMenuItems(text: string, existingItems: any[] = []): GeneratedMenuItem[] {
  const rawLines = text.split(/\r?\n/);
  if (rawLines.length === 0) return [];

  const getIconForLabel = (label: string): string => {
    const l = label.toLowerCase();
    if (l.includes("iphone") || l.includes("apple")) return "solar:apple-bold";
    if (l.includes("galaxy") || l.includes("samsung") || l.includes("mobile") || l.includes("phone")) return "solar:smartphone-bold";
    if (l.includes("computer") || l.includes("tablet") || l.includes("laptop") || l.includes("pc")) return "solar:laptop-minimalistic-bold";
    if (l.includes("tv") || l.includes("audio") || l.includes("speaker") || l.includes("sound")) return "solar:tv-bold";
    if (l.includes("kitchen") || l.includes("cooking")) return "solar:cup-bold";
    if (l.includes("appliance") || l.includes("home")) return "solar:home-smile-bold";
    if (l.includes("smart") || l.includes("tech") || l.includes("iot") || l.includes("ai")) return "solar:cpu-bolt-bold";
    if (l.includes("health") || l.includes("care") || l.includes("personal") || l.includes("beauty")) return "solar:heart-pulse-bold";
    if (l.includes("shop") || l.includes("store") || l.includes("product") || l.includes("sale")) return "solar:bag-3-bold";
    if (l.includes("service")) return "solar:widget-bold";
    if (l.includes("contact")) return "solar:phone-calling-bold";
    if (l.includes("about")) return "solar:info-circle-bold";
    return "solar:link-bold";
  };

  interface RawNode {
    level: number;
    label: string;
    url?: string;
    icon?: string;
    children: RawNode[];
  }

  let currentExplicitLevel = 1;
  const rootNodes: RawNode[] = [];
  let lastL1: RawNode | null = null;
  let lastL2: RawNode | null = null;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 1. Skip pure comments or conversational user instructions
    if (/^\/\/\s*(i was|trying|please|note|instructions?|here is|sample|example)/i.test(trimmed)) continue;
    if (/^(build it|create|make it|generate|here are|this is for)/i.test(trimmed)) continue;
    if (trimmed === "//" || trimmed === "/*" || trimmed === "*/") continue;

    // 2. Check for level headers: "//lavel 1", "//level 1", "level 1:", "L1:", "lavel 1", "//lavel 2", "//level 3"
    const levelHeaderMatch = trimmed.match(/^(?:\/\/\s*|\/?\s*)?(?:lavel|level|lvl|l)\s*(\d+)\s*:?$/i);
    if (levelHeaderMatch) {
      currentExplicitLevel = parseInt(levelHeaderMatch[1], 10) || 1;
      continue;
    }

    // 3. Check for inline level comment like "Mobiles //lavel 2" or "Mobiles (Level 2)"
    let itemLevel = currentExplicitLevel;
    let cleanLine = trimmed;

    const inlineLevelMatch = cleanLine.match(/^(.*?)(?:\s*(?:\/\/|\()\s*(?:lavel|level|lvl|l)\s*(\d+)\s*\)?)$/i);
    if (inlineLevelMatch) {
      cleanLine = inlineLevelMatch[1].trim();
      itemLevel = parseInt(inlineLevelMatch[2], 10);
    }

    // Remove leading list markers and leading slashes
    cleanLine = cleanLine.replace(/^\/\/\s*/, "").replace(/^[-*•–—\d\.)\s]+/, "").trim();
    if (!cleanLine) continue;

    // Check space indentation if not explicitly set higher
    const rawIndentMatch = rawLine.match(/^(\s*)/);
    const spaces = rawIndentMatch ? rawIndentMatch[1].replace(/\t/g, "  ").length : 0;
    if (spaces >= 4) {
      itemLevel = Math.max(itemLevel, 3);
    } else if (spaces >= 2) {
      itemLevel = Math.max(itemLevel, 2);
    }

    let label = cleanLine;
    let url = "";

    // Check if line contains URL like "Label (url)" or "Label -> url" or "Label | url"
    const urlMatch = cleanLine.match(/^(.*?)(?:\s*(?:\(|->|\|)\s*(https?:\/\/[^\s\)]+|\/[^\s\)]+|#[^\s\)]*)\)?)$/i);
    if (urlMatch) {
      label = urlMatch[1].trim();
      url = urlMatch[2].trim();
    }

    if (!url) {
      const matched = existingItems.find(
        (e) => e.title?.toLowerCase() === label.toLowerCase() || e.slug?.toLowerCase() === label.toLowerCase()
      );
      if (matched) {
        url = matched.url || (matched.slug ? `/${matched.slug}` : `/${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
      } else {
        const slug = label.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, "-").replace(/^-+|-+$/g, "");
        url = slug ? `/${slug}` : "/";
      }
    }

    const forceHashUrl = true; // User directive: "all link add #"

    const newNode: RawNode = {
      level: itemLevel,
      label,
      url: forceHashUrl ? "#" : url,
      icon: getIconForLabel(label),
      children: [],
    };

    if (itemLevel === 1) {
      rootNodes.push(newNode);
      lastL1 = newNode;
      lastL2 = null;
    } else if (itemLevel === 2) {
      const matchingL1 = rootNodes.find(
        (r) => r.label.toLowerCase().includes(label.toLowerCase()) || label.toLowerCase().includes(r.label.toLowerCase())
      );
      const parent = matchingL1 || lastL1;
      if (parent) {
        parent.children.push(newNode);
      } else {
        rootNodes.push(newNode);
      }
      lastL2 = newNode;
    } else if (itemLevel >= 3) {
      if (lastL2) {
        lastL2.children.push(newNode);
      } else if (lastL1) {
        lastL1.children.push(newNode);
      } else {
        rootNodes.push(newNode);
      }
    }
  }

  // ── 10 Children × 5 Sub-Children Proportional Catalog for E-Commerce ──
  const E_COMMERCE_10x5_CATALOG: {
    match: (name: string) => boolean;
    children: { label: string; icon: string; subChildren: string[] }[];
  }[] = [
    {
      match: (n) => /mobile|phone/i.test(n),
      children: [
        { label: "Mobiles", icon: "solar:smartphone-bold", subChildren: ["Galaxy AI Phones", "iPhones", "Smart Phones", "Basic Phones", "Foldable Phones"] },
        { label: "Cases, Covers & Protectors", icon: "solar:shield-check-bold", subChildren: ["Silicon Cases", "Shockproof Armor Covers", "Flip Wallet Cases", "Tempered Glass Protectors", "Camera Lens Protectors"] },
        { label: "Fast Chargers & Cables", icon: "solar:bolt-bold", subChildren: ["65W GaN Fast Chargers", "MagSafe Wireless Chargers", "Multi-Port Car Chargers", "Braided USB-C Cables", "Fast Lightning Cables"] },
        { label: "Power Banks & Portable Power", icon: "solar:battery-charge-bold", subChildren: ["10000mAh Slim Power Banks", "20000mAh Fast Charging Banks", "Magnetic Wireless Power Banks", "Solar Emergency Banks", "Laptop PD Power Banks"] },
        { label: "Smart Wearables & Bands", icon: "solar:watch-round-bold", subChildren: ["AMOLED Smart Watches", "Fitness & Health Trackers", "GPS Sports Watches", "Kids GPS Calling Watches", "Water Resistant Bands"] },
        { label: "Bluetooth Audio & Earbuds", icon: "solar:headphones-round-bold", subChildren: ["True Wireless ANC Earbuds", "Wireless Neckbands", "Over-Ear Studio Headphones", "Portable Bass Speakers", "Sports Waterproof Earbuds"] },
        { label: "Holders, Mounts & Stands", icon: "solar:widget-bold", subChildren: ["Magnetic Car Vent Mounts", "Desktop Metal Phone Stands", "Adjustable Long-Arm Mounts", "Bike & Motorcycle Holders", "MagSafe Charging Stands"] },
        { label: "Photography & Vlogging Gear", icon: "solar:camera-bold", subChildren: ["3-Axis Smartphone Gimbals", "Ring Lights with Tripods", "Clip-On Macro Lenses", "Wireless Lavalier Microphones", "Handheld Selfie Sticks"] },
        { label: "Mobile Gaming Accessories", icon: "solar:gamepad-bold", subChildren: ["Phone Cooling Fans", "Mobile Gaming Triggers", "Bluetooth Gamepads", "Gaming Finger Sleeves", "Low-Latency Gaming Earbuds"] },
        { label: "Storage & OTG Adapters", icon: "solar:database-bold", subChildren: ["High-Speed MicroSD Cards", "Dual OTG Type-C Drives", "USB-C to 3.5mm DAC Adapters", "Multi-Port OTG Hubs", "High-Speed Card Readers"] },
      ],
    },
    {
      match: (n) => /computer|tablet|laptop/i.test(n),
      children: [
        { label: "Laptops & Ultrabooks", icon: "solar:laptop-minimalistic-bold", subChildren: ["Intel Core Ultra Laptops", "AMD Ryzen Slim Notebooks", "Apple MacBook Air & Pro", "2-in-1 Convertible Laptops", "Student Budget Laptops"] },
        { label: "Gaming Laptops & Rigs", icon: "solar:laptop-bold", subChildren: ["RTX 40 Series Gaming Laptops", "Custom Liquid-Cooled Desktop PCs", "Esports Tournament Rigs", "Small Form Factor Mini PCs", "High-FPS Gaming Desktops"] },
        { label: "Tablets & Digital Pads", icon: "solar:tablet-bold", subChildren: ["Apple iPad Pro & Air", "Samsung Galaxy Tab S Series", "Android Productivity Tablets", "Graphic Drawing Tablets", "e-Ink Digital Paper Readers"] },
        { label: "Monitors & Curved Screens", icon: "solar:monitor-bold", subChildren: ["4K UHD Productivity Monitors", "240Hz Fast IPS Gaming Displays", "Curved Ultrawide Monitors", "Portable USB-C Displays", "High-Color HDR Displays"] },
        { label: "Keyboards & Typing Devices", icon: "solar:keyboard-bold", subChildren: ["Wireless Mechanical Keyboards", "Ergonomic Split Keyboards", "Low Profile Custom Keyboards", "Hot-Swappable Boards", "Quiet Office Keyboards"] },
        { label: "Mice & Precision Pointers", icon: "solar:mouse-bold", subChildren: ["Ultra-Lightweight Wireless Mice", "Ergonomic Vertical Trackballs", "Multi-Device Bluetooth Mice", "Large Gaming Desk Mats", "Precision Trackpads"] },
        { label: "PC Components & Hardware", icon: "solar:cpu-bolt-bold", subChildren: ["Desktop Processors (CPUs)", "Graphics Processing Units (GPUs)", "Gaming Motherboards", "High-Speed DDR5 RAM", "Modular 80+ Power Supplies"] },
        { label: "Data Storage & SSDs", icon: "solar:server-bold", subChildren: ["NVMe PCIe Gen4 M.2 SSDs", "External Portable SSD Drives", "High-Capacity Desktop HDDs", "NAS Network Storage Servers", "Encrypted USB Drives"] },
        { label: "Networking & WiFi", icon: "solar:cloud-bold", subChildren: ["WiFi 7 Tri-Band Routers", "Whole-Home Mesh Systems", "Gigabit Managed Switches", "PCIe High-Gain WiFi Cards", "Long-Range Range Extenders"] },
        { label: "Docks, Hubs & Accessories", icon: "solar:devices-bold", subChildren: ["Thunderbolt 4 Docking Stations", "Multi-Port USB-C Hubs", "Adjustable Aluminum Laptop Stands", "Heavy Duty Monitor Arms", "Cable Management Trays"] },
      ],
    },
    {
      match: (n) => /tv|audio|television/i.test(n),
      children: [
        { label: "Smart Televisions", icon: "solar:tv-bold", subChildren: ["OLED & QD-OLED Smart TVs", "QLED & Mini-LED 4K TVs", "Google TV & Android OS TVs", "Lifestyle Frame Art TVs", "8K Ultra HD Flagship Displays"] },
        { label: "Soundbars & Subwoofers", icon: "solar:soundwave-bold", subChildren: ["Dolby Atmos 9.1.4 Soundbars", "Wireless Subwoofer Combos", "Compact All-in-One Soundbars", "Bluetooth Soundbase Systems", "Rear Satellite Speaker Kits"] },
        { label: "Over-Ear & Studio Headphones", icon: "solar:headphones-round-bold", subChildren: ["Active Noise Cancelling Headphones", "Audiophile Open-Back Headphones", "Wireless Travel Headphones", "DJ & Studio Monitors", "Lightweight Office Headsets"] },
        { label: "Wireless Earbuds & IEMs", icon: "solar:headphones-round-bold", subChildren: ["Spatial Audio Wireless Earbuds", "Multi-Driver IEMs for Audiophiles", "Sports Sweatproof Earphones", "Bone Conduction Headphones", "Sleep Noise-Masking Earbuds"] },
        { label: "Home Theater Systems", icon: "solar:videocamera-record-bold", subChildren: ["4K Laser Projectors", "Motorized Projector Screens", "7.2 Channel AV Receivers", "Architectural In-Wall Speakers", "Floorstanding Tower Speakers"] },
        { label: "Portable & Party Speakers", icon: "solar:volume-loud-bold", subChildren: ["Rugged Waterproof Bluetooth Speakers", "High-Power Party Lights Speakers", "Vintage Retro Bluetooth Speakers", "360-Degree Omnidirectional Speakers", "Clip-On Micro Speakers"] },
        { label: "Streaming & Media Players", icon: "solar:clapperboard-bold", subChildren: ["4K HDR Streaming Sticks", "Apple TV & Android TV Boxes", "Wireless HDMI Transmitters", "High-Resolution Audio DACs", "Smart Voice Assistant Displays"] },
        { label: "DJ & Pro Audio Equipment", icon: "solar:music-library-bold", subChildren: ["Multi-Channel DJ Controllers", "Professional Studio Monitors", "Dynamic Vocal Microphones", "Multi-Channel USB Audio Interfaces", "Sound Isolation Shields"] },
        { label: "Hi-Fi & Vinyl Turntables", icon: "solar:vinyl-record-bold", subChildren: ["Stereated Amplifiers", "Turntables & Record Players", "Phono Preamplifiers", "Balanced Headphone Amplifiers", "Lossless Network Streamers"] },
        { label: "TV Mounts, Cables & Stands", icon: "solar:widget-bold", subChildren: ["Full-Motion Swivel Wall Brackets", "Ultra-Thin Fixed Wall Mounts", "Ultra High Speed HDMI 2.1 Cables", "Optical Digital & Audio Cables", "Modern Wooden TV Media Consoles"] },
      ],
    },
    {
      match: (n) => /kitchen/i.test(n),
      children: [
        { label: "Refrigerators & Freezers", icon: "solar:fridge-bold", subChildren: ["French Door Multi-Zone Fridges", "Side-by-Side Inverter Refrigerators", "Double Door Frost-Free Fridges", "Undercounter Wine Coolers", "Deep Chest Freezers"] },
        { label: "Microwaves & Smart Ovens", icon: "solar:fire-bold", subChildren: ["Convection Grill Microwaves", "Built-in Electric Wall Ovens", "Countertop Toaster Steam Ovens", "WiFi Enabled Air Fryer Ovens", "Over-the-Range Microwaves"] },
        { label: "Air Fryers & Deep Fryers", icon: "solar:cup-bold", subChildren: ["Dual Basket Digital Air Fryers", "Large Family Size Air Fryers", "Rotisserie Air Fryer Toasters", "Stainless Steel Deep Fryers", "Healthy Oil-Free Cookers"] },
        { label: "Blenders, Mixers & Grinders", icon: "solar:cup-bold", subChildren: ["High-Speed Heavy Duty Blenders", "Multi-Purpose Mixer Grinders", "Kitchen Food Processors", "Immersion Hand Blenders", "Personal Smoothie Blenders"] },
        { label: "Coffee & Espresso Machines", icon: "solar:cup-bold", subChildren: ["Automatic Bean-to-Cup Machines", "15-Bar Manual Espresso Machines", "Programmable Drip Coffee Makers", "Cold Brew Coffee Pitchers", "Automatic Milk Steamers"] },
        { label: "Cooktops, Hobs & Burners", icon: "solar:fire-bold", subChildren: ["Smart Induction Cooktops", "Automatic Infrared Ceramic Hobs", "Built-in Tempered Glass Gas Hobs", "Double Burner Tabletop Stoves", "Portable Travel Cooktops"] },
        { label: "Electric Cookers & Steamers", icon: "solar:dishes-bold", subChildren: ["Multi-Functional Pressure Cookers", "Fuzzy Logic Rice Cookers", "3-Tier Electric Food Steamers", "Digital Slow Cookers", "Sous Vide Precision Cookers"] },
        { label: "Dishwashers & Sanitizers", icon: "solar:dishes-bold", subChildren: ["14-Place Built-in Dishwashers", "Compact Tabletop Dishwashers", "UV Knife & Board Sanitizers", "Garbage Disposal Units", "Ultrasonic Veggie Washers"] },
        { label: "Kettles, Toasters & Breakfast", icon: "solar:cup-bold", subChildren: ["Temperature Control Electric Kettles", "4-Slice Stainless Steel Toasters", "Belgian Waffle Makers", "Electric Egg Cookers", "Panini Sandwich Press Grills"] },
        { label: "Water Purifiers & Dispensers", icon: "solar:drop-bold", subChildren: ["Multi-Stage RO UV UF Purifiers", "Hot & Cold Water Dispensers", "Alkaline Hydrogen Water Filters", "Under-Sink Filtration Systems", "Instant Boiling Water Taps"] },
      ],
    },
    {
      match: (n) => /home appliance/i.test(n),
      children: [
        { label: "Air Conditioners & Cooling", icon: "solar:cloud-snow-bold", subChildren: ["Dual Inverter Split Air Conditioners", "Portable Rolling Room AC Units", "Energy Efficient Window ACs", "Silent Bladeless Tower Fans", "Smart WiFi Ceiling Fans"] },
        { label: "Washing Machines & Dryers", icon: "solar:washing-machine-minimalistic-bold", subChildren: ["AI Direct Drive Front Load Washers", "Large Capacity Top Load Washers", "Heat Pump Ventless Dryers", "Washer Dryer Combos", "Compact Portable Mini Washers"] },
        { label: "Vacuum Cleaners & Mops", icon: "solar:magic-stick-3-bold", subChildren: ["LiDAR Laser Robot Vacuums", "Cordless Stick Vacuums with HEPA", "Wet & Dry Heavy Duty Vacuums", "All-in-One Cordless Floor Washers", "High-Temperature Steam Mops"] },
        { label: "Air Purifiers & Dehumidifiers", icon: "solar:wind-bold", subChildren: ["True HEPA Carbon Air Purifiers", "Ultrasonic Cool Mist Humidifiers", "Refrigerant Compressor Dehumidifiers", "Smart Air Quality Monitor Towers", "Desktop Personal Purifiers"] },
        { label: "Water Heaters & Geysers", icon: "solar:drop-bold", subChildren: ["Digital Storage Tank Water Heaters", "Instant Tankless Electric Water Heaters", "Solar Eco Water Heating Systems", "Smart WiFi Controlled Geysers", "Gas Continuous Water Heaters"] },
        { label: "Irons & Garment Care", icon: "solar:magic-stick-bold", subChildren: ["Continuous Steam Station Generators", "Professional Standing Fabric Steamers", "Cordless Ceramic Steam Irons", "Handheld Portable Travel Steamers", "Electronic Lint Shavers"] },
        { label: "Room Heaters & Fireplaces", icon: "solar:fire-bold", subChildren: ["Oil Filled Radiator Silent Heaters", "Ceramic PTC Oscillating Heaters", "Infrared Carbon Tube Radiant Heaters", "Electric Wall-Mounted Fireplaces", "Overheat Protected Fan Heaters"] },
        { label: "Sewing & Craft Machines", icon: "solar:scissors-square-bold", subChildren: ["Computerized Sewing Machines", "Overlock Serger 4-Thread Machines", "Digital Embroidery Machines", "Portable Beginner Sewing Kits", "Heavy-Duty Leather Sewing"] },
        { label: "Power Backup & Inverters", icon: "solar:battery-charge-bold", subChildren: ["Pure Sine Wave Home Inverters", "Solar Hybrid Inverters", "Lithium LiFePO4 Inverter Batteries", "Automatic Voltage Line Stabilizers", "Emergency Auto-Cutoff Surge Protectors"] },
        { label: "Cleaning & Maintenance Tools", icon: "solar:hammer-bold", subChildren: ["High Pressure Washer Sprayers", "Cordless Window Vacuum Cleaners", "Electric Drain Cleaner Snakes", "Heavy Duty Wet Vacuum Blowers", "UV Mattress Dust Mite Cleaners"] },
      ],
    },
    {
      match: (n) => /smart/i.test(n),
      children: [
        { label: "Smart Home Security", icon: "solar:shield-check-bold", subChildren: ["Fingerprint & Face Unlock Smart Locks", "2K Wireless Battery Security Cameras", "2-Way Talk Video Doorbells", "Multi-Zone Smart Alarm Siren Kits", "Smart Floodlight Cameras"] },
        { label: "Smart Lighting & Ambiance", icon: "solar:lightbulb-bolt-bold", subChildren: ["Matter-Compatible RGB Smart Bulbs", "Dynamic Music Sync LED Strips", "Smart Hexagon Modular Wall Panels", "Ambient TV Backlight Camera Sync", "Solar Outdoor Garden Lights"] },
        { label: "Smart Hubs, Displays & Voice", icon: "solar:cpu-bolt-bold", subChildren: ["10-Inch Touch Smart Home Displays", "Zigbee & Thread Multi-Protocol Hubs", "Universal Smart Infrared RF Remotes", "Voice Controlled Room Assistants", "Central Wall Mount Panels"] },
        { label: "Smart Power & Energy", icon: "solar:plug-circle-bold", subChildren: ["Energy Monitoring Smart WiFi Plugs", "Smart Touch Wall Light Switches", "Surge Protected Smart Power Strips", "DIN Rail Smart Energy Meters", "Smart WiFi Circuit Breakers"] },
        { label: "Drones & Aerial Imaging", icon: "solar:camera-bold", subChildren: ["4K HDR GPS Foldable Drones", "FPV Racing Drones with Goggles", "Obstacle Avoidance Camera Drones", "Lightweight Mini Travel Drones", "Replacement Drone Batteries"] },
        { label: "Action Cameras & Stabilizers", icon: "solar:videocamera-record-bold", subChildren: ["5.3K 60FPS Waterproof Action Cameras", "360-Degree Dual Lens Action Cams", "3-Axis Smartphone & Camera Gimbals", "Body & Chest Mount Action Straps", "Magnetic POV Neck Mounts"] },
        { label: "Smart Sensors & Climate", icon: "solar:radar-bold", subChildren: ["Wireless Door & Window Sensors", "PIR Motion & Presence Radar Sensors", "Temperature & Humidity LCD Sensors", "Smart Water Leak & Flood Detectors", "Smoke & Gas Detectors"] },
        { label: "Smart Window & Shading", icon: "solar:sun-bold", subChildren: ["Motorized Roller Blind Motors", "Smart Automatic Curtain Tracks", "Solar Powered Blind Tilters", "Automatic Window Openers", "Weather Sensor Retractable Awnings"] },
        { label: "Smart Pet Technology", icon: "solar:heart-bold", subChildren: ["Automatic Scheduled Pet Feeders", "Motion Activated Water Fountains", "Self-Cleaning Smart Litter Boxes", "GPS Pet Collar Activity Trackers", "Laser Interactive Pet Cameras"] },
        { label: "Wearable & Health Tech", icon: "solar:watch-round-bold", subChildren: ["ECG & Blood Pressure Smart Bands", "Smart Sleep Tracking Headbands", "Smart Posture Correction Reminders", "Smart Heated Therapy Jackets", "AI-Powered Translation Earbuds"] },
      ],
    },
    {
      match: (n) => /personal|health/i.test(n),
      children: [
        { label: "Shavers & Beard Grooming", icon: "solar:scissors-square-bold", subChildren: ["3-Blade & 5-Blade Rotary Shavers", "Precision Beard & Stubble Trimmers", "All-in-One Multi-Grooming Kits", "Cordless Professional Hair Clippers", "Waterproof Nose & Ear Trimmers"] },
        { label: "Hair Care & Styling Tools", icon: "solar:magic-stick-bold", subChildren: ["Brushless Ionic High-Speed Dryers", "Ceramic Tourmaline Straighteners", "Automatic Rotating Curling Wands", "Hot Air Styling Brushes", "Cordless Heated Straightening Brushes"] },
        { label: "Oral Health & Dental Care", icon: "solar:smile-circle-bold", subChildren: ["Sonic Magnetic Electric Toothbrushes", "Cordless IPX7 Water Dental Flossers", "Replacement Brush Heads Multi-Packs", "Blue Light Teeth Whitening Kits", "UV Toothbrush Sterilizer Holders"] },
        { label: "Health & Vital Sign Monitors", icon: "solar:heart-pulse-bold", subChildren: ["Upper Arm Digital Blood Pressure Monitors", "Fingertip SpO2 Pulse Oximeters", "Non-Contact Forehead Thermometers", "Bluetooth Smart Body Composition Scales", "Continuous Glucose Monitors"] },
        { label: "Massage & Muscle Recovery", icon: "solar:bath-bold", subChildren: ["Brushless Deep Tissue Percussion Guns", "3D Shiatsu Neck & Shoulder Massagers", "Compression Air Leg & Calf Massagers", "Heated Foot Reflexology Massagers", "Warm Compression Eye Massagers"] },
        { label: "Skin Care & Facial Tools", icon: "solar:face-mask-bold", subChildren: ["Ultrasonic Skin Scrubber Spatulas", "Red & Blue Light LED Face Therapy Masks", "Microcurrent Facial Sculpting Rollers", "Nano Ionic Warm Facial Steamers", "Blackhead Vacuum Pore Extractors"] },
        { label: "Therapy, Heat & Pain Relief", icon: "solar:fire-bold", subChildren: ["Digital TENS & EMS Muscle Stimulators", "Far-Infrared Heating Pads for Back", "Microwaveable Moist Heat Neck Wraps", "Electric Heated Blankets with Timer", "Joint Pain Laser Red Light Wraps"] },
        { label: "Respiratory & Air Wellness", icon: "solar:wind-bold", subChildren: ["Portable Mesh Nebulizer Inhalers", "Ultrasonic Cool Mist Essential Oil Diffusers", "Steam Inhalers for Sinus Relief", "Saline Nasal Irrigation Cleaners", "Medical Grade Oxygen Concentrators"] },
        { label: "Mobility & Living Aids", icon: "solar:wheelchair-bold", subChildren: ["Lightweight Folding Wheelchairs", "Ergonomic Adjustable Walking Canes", "Memory Foam Orthopedic Cushions", "Bedside Assist Safety Rails", "Shower Safety Chairs with Non-Slip Feet"] },
        { label: "Mother, Baby & Infant Care", icon: "solar:heart-bold", subChildren: ["Hands-Free Wireless Breast Pumps", "Digital Baby Room Video Monitors", "Baby Bottle Steam Sterilizers & Warmers", "Gentle Baby Nail Trimmer Files", "Smart Baby Movement Trackers"] },
      ],
    },
  ];

  // Apply proportional expansion: Ensure at least 10 children per parent and at least 5 sub-children per child
  for (const root of rootNodes) {
    const catalogEntry = E_COMMERCE_10x5_CATALOG.find((c) => c.match(root.label));
    if (catalogEntry) {
      for (const catChild of catalogEntry.children) {
        let existingChild = root.children.find(
          (c) => c.label.toLowerCase().includes(catChild.label.toLowerCase()) || catChild.label.toLowerCase().includes(c.label.toLowerCase())
        );

        if (!existingChild) {
          if (root.children.length < 10) {
            existingChild = {
              level: 2,
              label: catChild.label,
              url: "#",
              icon: catChild.icon,
              children: [],
            };
            root.children.push(existingChild);
          }
        }

        // Now ensure existingChild has at least 5 sub-children
        if (existingChild) {
          for (const subTitle of catChild.subChildren) {
            const hasSub = existingChild.children.some(
              (s) => s.label.toLowerCase() === subTitle.toLowerCase()
            );
            if (!hasSub && existingChild.children.length < 5) {
              existingChild.children.push({
                level: 3,
                label: subTitle,
                url: "#",
                icon: getIconForLabel(subTitle),
                children: [],
              });
            }
          }
        }
      }
    }
  }

  const convert = (nodes: RawNode[], prefix = "parsed", startOrder = 0): GeneratedMenuItem[] => {
    return nodes.map((n, idx) => {
      const id = `${prefix}-${idx}-${Date.now().toString(36)}`;
      const children = convert(n.children, `${id}-c`);
      return {
        id,
        type: "custom",
        label: n.label,
        url: n.url || "#",
        icon: n.icon || "solar:link-bold",
        showMode: "both",
        displayStyle: children.length > 3 ? "mega" : "none",
        children,
        order: startOrder + idx,
      };
    });
  };

  return convert(rootNodes);
}

// ── Recursive normalize helper ──────────────────────────────────────────────
function normalizeItems(rawItems: any[], prefix = "ai-gen", orderStart = 0): GeneratedMenuItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, idx) => {
    const itemId = item.id || `${prefix}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
    const children = Array.isArray(item.children) ? normalizeItems(item.children, `${itemId}-c`) : [];

    return {
      id: itemId,
      type: item.type || "custom",
      label: String(item.label || item.title || "Menu Item"),
      url: String(item.url || "#"),
      icon: item.icon ? String(item.icon) : undefined,
      showMode: item.showMode === "icon" || item.showMode === "text" ? item.showMode : "both",
      displayStyle: item.displayStyle || (children.length > 3 ? "mega" : "none"),
      gridNumber: typeof item.gridNumber === "number" ? item.gridNumber : (item.displayStyle === "mega" ? 4 : undefined),
      showPosts: Boolean(item.showPosts),
      layoutType: item.layoutType === "slider" ? "slider" : (item.showPosts ? "grid" : undefined),
      postLimit: typeof item.postLimit === "number" ? item.postLimit : (item.showPosts ? 6 : undefined),
      children,
      order: orderStart + idx,
    };
  });
}

// ── POST /api/admin/menu/ai-generate ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const {
      prompt = "",
      customContent = "",
      targetLanguage = "original",
      existingItems = [],
      depth = 2,
      preset = "custom",
      style = "auto",
      location = "header-1",
    } = body;

    // If user provided a raw outline/list and no API key or API call is skipped
    const hasCustomOutline = Boolean(customContent && customContent.trim().length > 0);

    // Load CMS database settings for OpenAI configuration
    let cmsSettings: Record<string, any> = {};
    try {
      cmsSettings = await Settings();
    } catch (e) {
      console.warn("Could not load database settings:", e);
    }

    const apiKey =
      body.apiKey ||
      cmsSettings.openai_api_key ||
      process.env.OPENAI_API_KEY ||
      process.env.NEXT_PUBLIC_AI_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_KEY ||
      "";

    let rawBaseUrl =
      body.baseUrl ||
      cmsSettings.openai_base_url ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";

    let cleanBaseUrl = rawBaseUrl.trim().replace(/\/+$/, "");
    if (!cleanBaseUrl.includes("/v1") && !cleanBaseUrl.includes("googleapis.com")) {
      cleanBaseUrl = `${cleanBaseUrl}/v1`;
    }

    const model =
      body.model ||
      cmsSettings.openai_model ||
      process.env.OPENAI_MODEL ||
      "gpt-4o-mini";

    // If no API key is provided:
    // If user provided custom content/outline, parse it directly!
    if (!apiKey) {
      if (hasCustomOutline) {
        const parsedItems = parseTextToMenuItems(customContent, existingItems);
        return NextResponse.json({
          success: true,
          isDemo: false,
          title: prompt ? `${prompt.slice(0, 24)} Navigation` : "Custom Navigation Menu",
          location,
          explanation: "Menu hierarchy parsed and structured directly from your provided outline and items.",
          items: parsedItems,
        });
      }

      const demo = getDemoMenu(preset || "ecommerce", depth);
      return NextResponse.json({
        success: true,
        isDemo: true,
        message: "No OpenAI API key configured. Generated using built-in high-level menu architect demo.",
        title: demo.title,
        location: demo.location,
        explanation: demo.explanation,
        items: demo.items,
      });
    }

    // Call OpenAI Compatible Chat Completion API
    const systemInstruction = `
You are an expert Information Architect, UX Strategist, and CMS Navigation Engineer.
Your task is to generate a comprehensive, modern, responsive website menu structure in strictly valid JSON format.

CRITICAL INSTRUCTIONS:
1. STRICT USER DATA RESPECT:
   - If "USER PROVIDED MENU OUTLINE / CONTENT" is provided below, YOU MUST BUILD THE MENU SPECIFICALLY AND DIRECTLY FROM THAT CONTENT. Do NOT invent unrelated items or overwrite user topics.
   - If the user provides item names, pages, or bullet points, every provided item must be represented in the hierarchy.
2. LANGUAGE & TRANSLATION SUPPORT:
   - Target Language preference is: "${targetLanguage}".
   - If targetLanguage is "original": Preserve the EXACT language and script provided by the user (e.g. if written in Bengali/বাংলা, Sylheti, French, or English, keep the exact original script and spelling!).
   - If targetLanguage is "bn": Translate/write all menu labels in Bengali (বাংলা).
   - If targetLanguage is "sylheti": Translate/write labels in Sylheti / regional Bengali colloquial style.
   - If targetLanguage is "en": Translate/write all labels in clean English.
   - If targetLanguage is "bilingual": Format labels bilingually, e.g. "বাংলা (English)" or "English (বাংলা)".
3. URL & ATTRIBUTES MAPPING:
   - Match items to "EXISTING CMS PAGES / CATEGORIES" if provided, using their exact slugs/URLs.
   - Assign appropriate modern Iconify icons (e.g. "solar:home-2-bold", "solar:bag-3-bold", "solar:document-bold", etc.).
4. Return a JSON object matching this structure:
   - "title": Concise name for the menu (e.g. "Main Navigation", "প্রধান মেনু").
   - "location": Location string ("header-1", "header-2", "mobile-1", or "footer-1").
   - "explanation": Brief 1-2 sentence explanation of the design hierarchy in the requested language.
   - "items": Array of menu items:
     - "label": string (display name)
     - "url": string (URL path)
     - "icon": string (Iconify icon name like "solar:home-2-bold")
     - "showMode": "both" | "text" | "icon"
     - "displayStyle": "none" | "left" | "right" | "mega" | "style-1"
     - "showPosts": boolean (true if category should show recent posts grid)
     - "children": nested menu items up to depth ${depth}.
5. Output raw JSON only. Do not wrap in markdown backticks or commentary.
`;

    const userPromptText = `
Generate a website navigation menu based on these exact specifications:
- User Provided Menu Outline / Content:
"""
${customContent || prompt || "Create a clean navigation menu based on preset: " + preset}
"""
- Target Language / Translation: "${targetLanguage}"
- Hierarchy Depth Limit: ${depth} level(s)
- Preferred Display Style: "${style}"
- Suggested Location: "${location}"
- Existing CMS Database Pages / Categories:
${existingItems && existingItems.length > 0 ? JSON.stringify(existingItems.slice(0, 30)) : "None provided"}
`;

    try {
      const endpoint = `${cleanBaseUrl}/chat/completions`;
      const aiRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPromptText },
          ],
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        console.warn(`[AI Menu API Error] (${aiRes.status}):`, errorText);
        // Graceful fallback to user custom outline or demo
        if (hasCustomOutline) {
          const parsed = parseTextToMenuItems(customContent, existingItems);
          return NextResponse.json({
            success: true,
            isDemo: false,
            title: prompt ? `${prompt.slice(0, 24)} Navigation` : "Custom Navigation Menu",
            location,
            explanation: "Menu structured directly from your provided items outline.",
            items: parsed,
          });
        }
        const demo = getDemoMenu(preset, depth);
        return NextResponse.json({
          success: true,
          isDemo: true,
          error: `API returned HTTP ${aiRes.status}. Loaded contextual demo menu instead.`,
          title: prompt ? `${prompt.slice(0, 24)} Navigation` : demo.title,
          location: demo.location,
          explanation: demo.explanation,
          items: demo.items,
        });
      }

      const data = await aiRes.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from OpenAI endpoint");
      }

      // Parse JSON from model
      let parsed: any;
      try {
        const cleanContent = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        parsed = JSON.parse(cleanContent);
      } catch (jsonErr) {
        console.error("Failed to parse AI JSON response:", jsonErr, content);
        if (hasCustomOutline) {
          const parsedLocal = parseTextToMenuItems(customContent, existingItems);
          return NextResponse.json({
            success: true,
            isDemo: false,
            title: prompt ? `${prompt.slice(0, 24)} Navigation` : "Custom Navigation Menu",
            location,
            explanation: "Menu structured directly from your outline.",
            items: parsedLocal,
          });
        }
        const demo = getDemoMenu(preset, depth);
        return NextResponse.json({
          success: true,
          isDemo: true,
          title: demo.title,
          location: demo.location,
          explanation: demo.explanation,
          items: demo.items,
        });
      }

      const normalizedItems = normalizeItems(parsed.items || []);

      return NextResponse.json({
        success: true,
        isDemo: false,
        modelUsed: model,
        title: parsed.title || "AI Generated Menu",
        location: parsed.location || location || "header-1",
        explanation: parsed.explanation || "Menu structure generated based on requirements.",
        items: normalizedItems,
      });
    } catch (networkError: any) {
      console.warn("AI API fetch exception, fallback to demo/parser:", networkError.message);
      if (hasCustomOutline) {
        const parsed = parseTextToMenuItems(customContent, existingItems);
        return NextResponse.json({
          success: true,
          isDemo: false,
          title: prompt ? `${prompt.slice(0, 24)} Navigation` : "Custom Navigation Menu",
          location,
          explanation: "Menu structured directly from your provided items outline.",
          items: parsed,
        });
      }
      const demo = getDemoMenu(preset, depth);
      return NextResponse.json({
        success: true,
        isDemo: true,
        error: networkError.message || "Failed to contact OpenAI compatible endpoint",
        title: demo.title,
        location: demo.location,
        explanation: demo.explanation,
        items: demo.items,
      });
    }
  } catch (error: any) {
    console.error("AI Menu Generation API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate menu" },
      { status: 500 }
    );
  }
}
