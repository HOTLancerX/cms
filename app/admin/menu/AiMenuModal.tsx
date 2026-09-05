'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import useSettings from '@/lib/useSettings';
import type { MenuItem, ItemGroup } from './MenuForm';

interface AiMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (
        items: MenuItem[],
        options: { title?: string; location?: string; mode: 'replace' | 'append' }
    ) => void;
    groups: ItemGroup[];
    existingMenuItemsCount?: number;
}

export default function AiMenuModal({
    isOpen,
    onClose,
    onApply,
    groups,
    existingMenuItemsCount = 0,
}: AiMenuModalProps) {
    const { settings: cmsSettings } = useSettings();

    // Mode: Custom outline vs Industry preset
    const [aiInputMode,      setAiInputMode]      = useState<'custom' | 'preset'>('custom');
    const [aiCustomContent,  setAiCustomContent]  = useState('');
    const [aiTargetLanguage, setAiTargetLanguage] = useState<'original' | 'en' | 'bn' | 'sylheti' | 'bilingual'>('original');
    const [aiPrompt,         setAiPrompt]         = useState('Modern high-converting online fashion & tech store with categories and mega panels');
    const [aiPreset,         setAiPreset]         = useState<'ecommerce' | 'news' | 'saas' | 'blog' | 'restaurant'>('ecommerce');
    const [aiDepth,          setAiDepth]          = useState<number>(2);
    const [aiStyle,          setAiStyle]          = useState<string>('auto');
    const [aiLocation,       setAiLocation]       = useState<string>('header-1');
    const [aiLoading,        setAiLoading]        = useState(false);
    const [aiAutoTitle,      setAiAutoTitle]      = useState(true);
    const [aiAutoLocation,   setAiAutoLocation]   = useState(true);
    const [aiResult,         setAiResult]         = useState<{
        title: string;
        location: string;
        explanation: string;
        items: MenuItem[];
        isDemo?: boolean;
        error?: string;
    } | null>(null);

    if (!isOpen || typeof window === 'undefined') return null;

    const generateMenuWithAi = async (customPreset?: string, customDepth?: number, overrideContent?: string, overrideLang?: string) => {
        setAiLoading(true);
        const activePreset = customPreset ?? aiPreset;
        const activeDepth = customDepth ?? aiDepth;
        const activeContent = overrideContent !== undefined ? overrideContent : aiCustomContent;
        const activeLang = overrideLang !== undefined ? overrideLang : aiTargetLanguage;
        const existingItems = groups.flatMap((g) => g.items);

        try {
            const res = await fetch('/api/admin/menu/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    customContent: activeContent,
                    targetLanguage: activeLang,
                    existingItems,
                    preset: activePreset,
                    depth: activeDepth,
                    style: aiStyle,
                    location: aiLocation,
                    apiKey: cmsSettings?.openai_api_key,
                    baseUrl: cmsSettings?.openai_base_url,
                    model: cmsSettings?.openai_model,
                }),
            });
            const data = await res.json();
            if (data.items) {
                setAiResult(data);
            } else {
                alert(data.error || 'Failed to generate menu');
            }
        } catch (err: any) {
            console.error('AI generation error:', err);
            alert(err.message || 'Error generating menu');
        } finally {
            setAiLoading(false);
        }
    };

    const handleApply = (mode: 'replace' | 'append') => {
        if (!aiResult || !aiResult.items) return;
        onApply(aiResult.items, {
            title: aiAutoTitle ? aiResult.title : undefined,
            location: aiAutoLocation ? aiResult.location : undefined,
            mode,
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
                {/* ── Modal Header ── */}
                <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                            <Icon icon="solar:stars-bold" width={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base font-bold text-white">AI Menu Architect & Translator</h2>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">
                                    Multi-Language AI
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-mono border border-white/10">
                                    {cmsSettings?.openai_model || 'OpenAI Compatible'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-300 mt-0.5">
                                Provide your custom outline or select site pages — AI builds the exact hierarchy with translation support.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition text-lg cursor-pointer"
                        title="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Modal Content (Scrollable) ── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gray-50/50">
                    {/* How It Works Guidance Box */}
                    <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/90 border border-indigo-100/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                        <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                            <Icon icon="solar:lightbulb-bolt-bold" width={18} className="text-amber-500 shrink-0" />
                            <span>How AI Menu Creation Works</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-indigo-900/80">
                            <div className="bg-white/80 rounded-xl p-3 border border-indigo-100/60 space-y-1">
                                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                                    <span className="w-4.5 h-4.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                                    Provide Outline
                                </div>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Type or paste each item on a new line. Indent with 2 spaces for dropdown / sub-items (e.g. <code>&nbsp;&nbsp;- Sub Item</code>).
                                </p>
                            </div>
                            <div className="bg-white/80 rounded-xl p-3 border border-indigo-100/60 space-y-1">
                                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                                    <span className="w-4.5 h-4.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                                    Choose Language
                                </div>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Select <strong>Keep Original</strong> to preserve exact text, or choose <strong>English</strong>, <strong>Bengali</strong>, <strong>Sylheti</strong>, or <strong>Bilingual</strong>.
                                </p>
                            </div>
                            <div className="bg-white/80 rounded-xl p-3 border border-indigo-100/60 space-y-1">
                                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                                    <span className="w-4.5 h-4.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                                    Preview & Apply
                                </div>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Inspect the responsive hierarchy preview, then click <strong>"Apply to Menu"</strong> to populate your menu builder.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mode Switcher Tabs */}
                    <div className="flex border-b border-gray-200 gap-2">
                        <button
                            type="button"
                            onClick={() => setAiInputMode('custom')}
                            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
                                aiInputMode === 'custom'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Icon icon="solar:pen-new-square-bold" width={16} />
                            <span>Custom Outline & Translation</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAiInputMode('preset')}
                            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
                                aiInputMode === 'preset'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Icon icon="solar:widget-2-bold" width={16} />
                            <span>Industry Presets</span>
                        </button>
                    </div>

                    {/* ── Tab 1: Custom Outline & Translation ── */}
                    {aiInputMode === 'custom' && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-800 block">
                                        Menu Items & Hierarchy Outline
                                    </label>
                                    <span className="text-[11px] text-gray-500">
                                        Type or paste your menu outline below in any language (English, Bengali, Sylheti, etc.):
                                    </span>
                                </div>

                                {/* Quick Example Loaders */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-gray-400 font-medium">Quick Examples:</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const megaCommerceDemo = `- Mobiles & Accessories (#)
  - Mobiles (#)
    - Galaxy AI Phones (#)
    - iPhones (#)
    - Smart Phones (#)
    - Basic Phones (#)
    - Foldable Phones (#)
  - Cases, Covers & Protectors (#)
    - Silicon Cases (#)
    - Shockproof Armor Covers (#)
    - Flip Wallet Cases (#)
    - Tempered Glass Protectors (#)
    - Camera Lens Protectors (#)
  - Fast Chargers & Cables (#)
    - 65W GaN Fast Chargers (#)
    - MagSafe Wireless Chargers (#)
    - Multi-Port Car Chargers (#)
    - Braided USB-C Cables (#)
    - Fast Lightning Cables (#)
  - Power Banks & Portable Power (#)
    - 10000mAh Slim Power Banks (#)
    - 20000mAh Fast Charging Banks (#)
    - Magnetic Wireless Power Banks (#)
    - Solar Emergency Banks (#)
    - Laptop PD Power Banks (#)
  - Smart Wearables & Bands (#)
    - AMOLED Smart Watches (#)
    - Fitness & Health Trackers (#)
    - GPS Sports Watches (#)
    - Kids GPS Calling Watches (#)
    - Water Resistant Bands (#)
  - Bluetooth Audio & Earbuds (#)
    - True Wireless ANC Earbuds (#)
    - Wireless Neckbands (#)
    - Over-Ear Studio Headphones (#)
    - Portable Bass Speakers (#)
    - Sports Waterproof Earbuds (#)
  - Holders, Mounts & Stands (#)
    - Magnetic Car Vent Mounts (#)
    - Desktop Metal Phone Stands (#)
    - Adjustable Long-Arm Mounts (#)
    - Bike & Motorcycle Holders (#)
    - MagSafe Charging Stands (#)
  - Photography & Vlogging Gear (#)
    - 3-Axis Smartphone Gimbals (#)
    - Ring Lights with Tripods (#)
    - Clip-On Macro Lenses (#)
    - Wireless Lavalier Microphones (#)
    - Handheld Selfie Sticks (#)
  - Mobile Gaming Accessories (#)
    - Phone Cooling Fans (#)
    - Mobile Gaming Triggers (#)
    - Bluetooth Gamepads (#)
    - Gaming Finger Sleeves (#)
    - Low-Latency Gaming Earbuds (#)
  - Storage & OTG Adapters (#)
    - High-Speed MicroSD Cards (#)
    - Dual OTG Type-C Drives (#)
    - USB-C to 3.5mm DAC Adapters (#)
    - Multi-Port OTG Hubs (#)
    - High-Speed Card Readers (#)
- Computers & Tablets (#)
  - Laptops & Ultrabooks (#)
    - Intel Core Ultra Laptops (#)
    - AMD Ryzen Slim Notebooks (#)
    - Apple MacBook Air & Pro (#)
    - 2-in-1 Convertible Laptops (#)
    - Student Budget Laptops (#)
  - Gaming Laptops & Rigs (#)
    - RTX 40 Series Gaming Laptops (#)
    - Custom Liquid-Cooled Desktop PCs (#)
    - Esports Tournament Rigs (#)
    - Small Form Factor Mini PCs (#)
    - High-FPS Gaming Desktops (#)
  - Tablets & Digital Pads (#)
    - Apple iPad Pro & Air (#)
    - Samsung Galaxy Tab S Series (#)
    - Android Productivity Tablets (#)
    - Graphic Drawing Tablets (#)
    - e-Ink Digital Paper Readers (#)
  - Monitors & Curved Screens (#)
    - 4K UHD Productivity Monitors (#)
    - 240Hz Fast IPS Gaming Displays (#)
    - Curved Ultrawide Monitors (#)
    - Portable USB-C Displays (#)
    - High-Color HDR Displays (#)
  - Keyboards & Typing Devices (#)
    - Wireless Mechanical Keyboards (#)
    - Ergonomic Split Keyboards (#)
    - Low Profile Custom Keyboards (#)
    - Hot-Swappable Boards (#)
    - Quiet Office Keyboards (#)
  - Mice & Precision Pointers (#)
    - Ultra-Lightweight Wireless Mice (#)
    - Ergonomic Vertical Trackballs (#)
    - Multi-Device Bluetooth Mice (#)
    - Large Gaming Desk Mats (#)
    - Precision Trackpads (#)
  - PC Components & Hardware (#)
    - Desktop Processors (CPUs) (#)
    - Graphics Processing Units (GPUs) (#)
    - Gaming Motherboards (#)
    - High-Speed DDR5 RAM (#)
    - Modular 80+ Power Supplies (#)
  - Data Storage & SSDs (#)
    - NVMe PCIe Gen4 M.2 SSDs (#)
    - External Portable SSD Drives (#)
    - High-Capacity Desktop HDDs (#)
    - NAS Network Storage Servers (#)
    - Encrypted USB Drives (#)
  - Networking & WiFi (#)
    - WiFi 7 Tri-Band Routers (#)
    - Whole-Home Mesh Systems (#)
    - Gigabit Managed Switches (#)
    - PCIe High-Gain WiFi Cards (#)
    - Long-Range Range Extenders (#)
  - Docks, Hubs & Accessories (#)
    - Thunderbolt 4 Docking Stations (#)
    - Multi-Port USB-C Hubs (#)
    - Adjustable Aluminum Laptop Stands (#)
    - Heavy Duty Monitor Arms (#)
    - Cable Management Trays (#)
- TV & Audio (#)
  - Smart Televisions (#)
    - OLED & QD-OLED Smart TVs (#)
    - QLED & Mini-LED 4K TVs (#)
    - Google TV & Android OS TVs (#)
    - Lifestyle Frame Art TVs (#)
    - 8K Ultra HD Flagship Displays (#)
  - Soundbars & Subwoofers (#)
    - Dolby Atmos 9.1.4 Soundbars (#)
    - Wireless Subwoofer Combos (#)
    - Compact All-in-One Soundbars (#)
    - Bluetooth Soundbase Systems (#)
    - Rear Satellite Speaker Kits (#)
  - Over-Ear & Studio Headphones (#)
    - Active Noise Cancelling Headphones (#)
    - Audiophile Open-Back Headphones (#)
    - Wireless Travel Headphones (#)
    - DJ & Studio Monitors (#)
    - Lightweight Office Headsets (#)
  - Wireless Earbuds & IEMs (#)
    - Spatial Audio Wireless Earbuds (#)
    - Multi-Driver IEMs for Audiophiles (#)
    - Sports Sweatproof Earphones (#)
    - Bone Conduction Headphones (#)
    - Sleep Noise-Masking Earbuds (#)
  - Home Theater Systems (#)
    - 4K Laser Projectors (#)
    - Motorized Projector Screens (#)
    - 7.2 Channel AV Receivers (#)
    - Architectural In-Wall Speakers (#)
    - Floorstanding Tower Speakers (#)
  - Portable & Party Speakers (#)
    - Rugged Waterproof Bluetooth Speakers (#)
    - High-Power Party Lights Speakers (#)
    - Vintage Retro Bluetooth Speakers (#)
    - 360-Degree Omnidirectional Speakers (#)
    - Clip-On Micro Speakers (#)
  - Streaming & Media Players (#)
    - 4K HDR Streaming Sticks (#)
    - Apple TV & Android TV Boxes (#)
    - Wireless HDMI Transmitters (#)
    - High-Resolution Audio DACs (#)
    - Smart Voice Assistant Displays (#)
  - DJ & Pro Audio Equipment (#)
    - Multi-Channel DJ Controllers (#)
    - Professional Studio Monitors (#)
    - Dynamic Vocal Microphones (#)
    - Multi-Channel USB Audio Interfaces (#)
    - Sound Isolation Shields (#)
  - Hi-Fi & Vinyl Turntables (#)
    - Stereo Integrated Amplifiers (#)
    - Turntables & Record Players (#)
    - Phono Preamplifiers (#)
    - Balanced Headphone Amplifiers (#)
    - Lossless Network Streamers (#)
  - TV Mounts, Cables & Stands (#)
    - Full-Motion Swivel Wall Brackets (#)
    - Ultra-Thin Fixed Wall Mounts (#)
    - Ultra High Speed HDMI 2.1 Cables (#)
    - Optical Digital & Audio Cables (#)
    - Modern Wooden TV Media Consoles (#)
- Kitchen Appliances (#)
  - Refrigerators & Freezers (#)
    - French Door Multi-Zone Fridges (#)
    - Side-by-Side Inverter Refrigerators (#)
    - Double Door Frost-Free Fridges (#)
    - Undercounter Wine Coolers (#)
    - Deep Chest Freezers (#)
  - Microwaves & Smart Ovens (#)
    - Convection Grill Microwaves (#)
    - Built-in Electric Wall Ovens (#)
    - Countertop Toaster Steam Ovens (#)
    - WiFi Enabled Air Fryer Ovens (#)
    - Over-the-Range Microwaves (#)
  - Air Fryers & Deep Fryers (#)
    - Dual Basket Digital Air Fryers (#)
    - Large Family Size Air Fryers (#)
    - Rotisserie Air Fryer Toasters (#)
    - Stainless Steel Deep Fryers (#)
    - Healthy Oil-Free Cookers (#)
  - Blenders, Mixers & Grinders (#)
    - High-Speed Heavy Duty Blenders (#)
    - Multi-Purpose Mixer Grinders (#)
    - Kitchen Food Processors (#)
    - Immersion Hand Blenders (#)
    - Personal Smoothie Blenders (#)
  - Coffee & Espresso Machines (#)
    - Automatic Bean-to-Cup Machines (#)
    - 15-Bar Manual Espresso Machines (#)
    - Programmable Drip Coffee Makers (#)
    - Cold Brew Coffee Pitchers (#)
    - Automatic Milk Steamers (#)
  - Cooktops, Hobs & Burners (#)
    - Smart Induction Cooktops (#)
    - Automatic Infrared Ceramic Hobs (#)
    - Built-in Tempered Glass Gas Hobs (#)
    - Double Burner Tabletop Stoves (#)
    - Portable Travel Cooktops (#)
  - Electric Cookers & Steamers (#)
    - Multi-Functional Pressure Cookers (#)
    - Fuzzy Logic Rice Cookers (#)
    - 3-Tier Electric Food Steamers (#)
    - Digital Slow Cookers (#)
    - Sous Vide Precision Cookers (#)
  - Dishwashers & Sanitizers (#)
    - 14-Place Built-in Dishwashers (#)
    - Compact Tabletop Dishwashers (#)
    - UV Knife & Board Sanitizers (#)
    - Garbage Disposal Units (#)
    - Ultrasonic Veggie Washers (#)
  - Kettles, Toasters & Breakfast (#)
    - Temperature Control Electric Kettles (#)
    - 4-Slice Stainless Steel Toasters (#)
    - Belgian Waffle Makers (#)
    - Electric Egg Cookers (#)
    - Panini Sandwich Press Grills (#)
  - Water Purifiers & Dispensers (#)
    - Multi-Stage RO UV UF Purifiers (#)
    - Hot & Cold Water Dispensers (#)
    - Alkaline Hydrogen Water Filters (#)
    - Under-Sink Filtration Systems (#)
    - Instant Boiling Water Taps (#)
- Home Appliances (#)
  - Air Conditioners & Cooling (#)
    - Dual Inverter Split Air Conditioners (#)
    - Portable Rolling Room AC Units (#)
    - Energy Efficient Window ACs (#)
    - Silent Bladeless Tower Fans (#)
    - Smart WiFi Ceiling Fans (#)
  - Washing Machines & Dryers (#)
    - AI Direct Drive Front Load Washers (#)
    - Large Capacity Top Load Washers (#)
    - Heat Pump Ventless Dryers (#)
    - Washer Dryer Combos (#)
    - Compact Portable Mini Washers (#)
  - Vacuum Cleaners & Mops (#)
    - LiDAR Laser Robot Vacuums (#)
    - Cordless Stick Vacuums with HEPA (#)
    - Wet & Dry Heavy Duty Vacuums (#)
    - All-in-One Cordless Floor Washers (#)
    - High-Temperature Steam Mops (#)
  - Air Purifiers & Dehumidifiers (#)
    - True HEPA Carbon Air Purifiers (#)
    - Ultrasonic Cool Mist Humidifiers (#)
    - Refrigerant Compressor Dehumidifiers (#)
    - Smart Air Quality Monitor Towers (#)
    - Desktop Personal Purifiers (#)
  - Water Heaters & Geysers (#)
    - Digital Storage Tank Water Heaters (#)
    - Instant Tankless Electric Water Heaters (#)
    - Solar Eco Water Heating Systems (#)
    - Smart WiFi Controlled Geysers (#)
    - Gas Continuous Water Heaters (#)
  - Irons & Garment Care (#)
    - Continuous Steam Station Generators (#)
    - Professional Standing Fabric Steamers (#)
    - Cordless Ceramic Steam Irons (#)
    - Handheld Portable Travel Steamers (#)
    - Electronic Lint Shavers (#)
  - Room Heaters & Fireplaces (#)
    - Oil Filled Radiator Silent Heaters (#)
    - Ceramic PTC Oscillating Heaters (#)
    - Infrared Carbon Tube Radiant Heaters (#)
    - Electric Wall-Mounted Fireplaces (#)
    - Overheat Protected Fan Heaters (#)
  - Sewing & Craft Machines (#)
    - Computerized Sewing Machines (#)
    - Overlock Serger 4-Thread Machines (#)
    - Digital Embroidery Machines (#)
    - Portable Beginner Sewing Kits (#)
    - Heavy-Duty Leather Sewing (#)
  - Power Backup & Inverters (#)
    - Pure Sine Wave Home Inverters (#)
    - Solar Hybrid Inverters (#)
    - Lithium LiFePO4 Inverter Batteries (#)
    - Automatic Voltage Line Stabilizers (#)
    - Emergency Auto-Cutoff Surge Protectors (#)
  - Cleaning & Maintenance Tools (#)
    - High Pressure Washer Sprayers (#)
    - Cordless Window Vacuum Cleaners (#)
    - Electric Drain Cleaner Snakes (#)
    - Heavy Duty Wet Vacuum Blowers (#)
    - UV Mattress Dust Mite Cleaners (#)
- Smart Technology (#)
  - Smart Home Security (#)
    - Fingerprint & Face Unlock Smart Locks (#)
    - 2K Wireless Battery Security Cameras (#)
    - 2-Way Talk Video Doorbells (#)
    - Multi-Zone Smart Alarm Siren Kits (#)
    - Smart Floodlight Cameras (#)
  - Smart Lighting & Ambiance (#)
    - Matter-Compatible RGB Smart Bulbs (#)
    - Dynamic Music Sync LED Strips (#)
    - Smart Hexagon Modular Wall Panels (#)
    - Ambient TV Backlight Camera Sync (#)
    - Solar Outdoor Garden Lights (#)
  - Smart Hubs, Displays & Voice (#)
    - 10-Inch Touch Smart Home Displays (#)
    - Zigbee & Thread Multi-Protocol Hubs (#)
    - Universal Smart Infrared RF Remotes (#)
    - Voice Controlled Room Assistants (#)
    - Central Wall Mount Panels (#)
  - Smart Power & Energy (#)
    - Energy Monitoring Smart WiFi Plugs (#)
    - Smart Touch Wall Light Switches (#)
    - Surge Protected Smart Power Strips (#)
    - DIN Rail Smart Energy Meters (#)
    - Smart WiFi Circuit Breakers (#)
  - Drones & Aerial Imaging (#)
    - 4K HDR GPS Foldable Drones (#)
    - FPV Racing Drones with Goggles (#)
    - Obstacle Avoidance Camera Drones (#)
    - Lightweight Mini Travel Drones (#)
    - Replacement Drone Batteries (#)
  - Action Cameras & Stabilizers (#)
    - 5.3K 60FPS Waterproof Action Cameras (#)
    - 360-Degree Dual Lens Action Cams (#)
    - 3-Axis Smartphone & Camera Gimbals (#)
    - Body & Chest Mount Action Straps (#)
    - Magnetic POV Neck Mounts (#)
  - Smart Sensors & Climate (#)
    - Wireless Door & Window Sensors (#)
    - PIR Motion & Presence Radar Sensors (#)
    - Temperature & Humidity LCD Sensors (#)
    - Smart Water Leak & Flood Detectors (#)
    - Smoke & Gas Detectors (#)
  - Smart Window & Shading (#)
    - Motorized Roller Blind Motors (#)
    - Smart Automatic Curtain Tracks (#)
    - Solar Powered Blind Tilters (#)
    - Automatic Window Openers (#)
    - Weather Sensor Retractable Awnings (#)
  - Smart Pet Technology (#)
    - Automatic Scheduled Pet Feeders (#)
    - Motion Activated Water Fountains (#)
    - Self-Cleaning Smart Litter Boxes (#)
    - GPS Pet Collar Activity Trackers (#)
    - Laser Interactive Pet Cameras (#)
  - Wearable & Health Tech (#)
    - ECG & Blood Pressure Smart Bands (#)
    - Smart Sleep Tracking Headbands (#)
    - Smart Posture Correction Reminders (#)
    - Smart Heated Therapy Jackets (#)
    - AI-Powered Translation Earbuds (#)
- Personal & Health Care (#)
  - Shavers & Beard Grooming (#)
    - 3-Blade & 5-Blade Rotary Shavers (#)
    - Precision Beard & Stubble Trimmers (#)
    - All-in-One Multi-Grooming Kits (#)
    - Cordless Professional Hair Clippers (#)
    - Waterproof Nose & Ear Trimmers (#)
  - Hair Care & Styling Tools (#)
    - Brushless Ionic High-Speed Dryers (#)
    - Ceramic Tourmaline Straighteners (#)
    - Automatic Rotating Curling Wands (#)
    - Hot Air Styling Brushes (#)
    - Cordless Heated Straightening Brushes (#)
  - Oral Health & Dental Care (#)
    - Sonic Magnetic Electric Toothbrushes (#)
    - Cordless IPX7 Water Dental Flossers (#)
    - Replacement Brush Heads Multi-Packs (#)
    - Blue Light Teeth Whitening Kits (#)
    - UV Toothbrush Sterilizer Holders (#)
  - Health & Vital Sign Monitors (#)
    - Upper Arm Digital Blood Pressure Monitors (#)
    - Fingertip SpO2 Pulse Oximeters (#)
    - Non-Contact Forehead Thermometers (#)
    - Bluetooth Smart Body Composition Scales (#)
    - Continuous Glucose Monitors (#)
  - Massage & Muscle Recovery (#)
    - Brushless Deep Tissue Percussion Guns (#)
    - 3D Shiatsu Neck & Shoulder Massagers (#)
    - Compression Air Leg & Calf Massagers (#)
    - Heated Foot Reflexology Massagers (#)
    - Warm Compression Eye Massagers (#)
  - Skin Care & Facial Tools (#)
    - Ultrasonic Skin Scrubber Spatulas (#)
    - Red & Blue Light LED Face Therapy Masks (#)
    - Microcurrent Facial Sculpting Rollers (#)
    - Nano Ionic Warm Facial Steamers (#)
    - Blackhead Vacuum Pore Extractors (#)
  - Therapy, Heat & Pain Relief (#)
    - Digital TENS & EMS Muscle Stimulators (#)
    - Far-Infrared Heating Pads for Back (#)
    - Microwaveable Moist Heat Neck Wraps (#)
    - Electric Heated Blankets with Timer (#)
    - Joint Pain Laser Red Light Wraps (#)
  - Respiratory & Air Wellness (#)
    - Portable Mesh Nebulizer Inhalers (#)
    - Ultrasonic Cool Mist Essential Oil Diffusers (#)
    - Steam Inhalers for Sinus Relief (#)
    - Saline Nasal Irrigation Cleaners (#)
    - Medical Grade Oxygen Concentrators (#)
  - Mobility & Living Aids (#)
    - Lightweight Folding Wheelchairs (#)
    - Ergonomic Adjustable Walking Canes (#)
    - Memory Foam Orthopedic Cushions (#)
    - Bedside Assist Safety Rails (#)
    - Shower Safety Chairs with Non-Slip Feet (#)
  - Mother, Baby & Infant Care (#)
    - Hands-Free Wireless Breast Pumps (#)
    - Digital Baby Room Video Monitors (#)
    - Baby Bottle Steam Sterilizers & Warmers (#)
    - Gentle Baby Nail Trimmer Files (#)
    - Smart Baby Movement Trackers (#)`;
                                            setAiCustomContent(megaCommerceDemo);
                                            setAiDepth(3);
                                            setAiTargetLanguage('original');
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                                        title="Load Mega E-Commerce (10 Children × 5 Sub-Children, all link #)"
                                    >
                                        <span>🛒 Mega E-Commerce (10×5, Link #)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const mobileDemo = `- Mobiles & Accessories (#)\n  - Mobiles (#)\n    - Galaxy AI Phones (#)\n    - iPhones (#)\n    - Smart Phones (#)\n    - Basic Phones (#)\n- Computers & Tablets (#)\n- TV & Audio (#)\n- Kitchen Appliances (#)\n- Home Appliances (#)\n- Smart Technology (#)\n- Personal & Health Care (#)`;
                                            setAiCustomContent(mobileDemo);
                                            setAiDepth(3);
                                            setAiTargetLanguage('original');
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                                        title="Load 7 Main Categories (auto-expands to 10×5 with # links)"
                                    >
                                        <span>📱 Auto 10×5 Expander</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const enDemo = `- Home\n- About Us\n  - Our Story\n  - Leadership Team\n  - Branch Offices\n- Services\n  - Web & Software Development\n  - Cloud Infrastructure\n  - Digital Marketing\n- News & Articles\n- Portfolio & Projects\n- Contact Us\n  - Sylhet Office\n  - Dhaka HQ`;
                                            setAiCustomContent(enDemo);
                                            setAiTargetLanguage('original');
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                                        title="Load English template"
                                    >
                                        <span>Corporate Example</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const servicesDemo = `- Home\n- Products & Store\n  - Electronics & Gadgets\n  - Fashion & Apparel\n  - Home & Living\n- Solutions\n  - Enterprise Consulting\n  - Cloud & Hosting\n  - Managed IT Support\n- Company\n  - About Us\n  - Careers\n  - Press & News\n- Contact & Support`;
                                            setAiCustomContent(servicesDemo);
                                            setAiTargetLanguage('original');
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                                        title="Load Multi-Tier template"
                                    >
                                        <span>Multi-Tier Example</span>
                                    </button>
                                    {aiCustomContent && (
                                        <button
                                            type="button"
                                            onClick={() => setAiCustomContent('')}
                                            className="px-2 py-1 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Textarea */}
                            <div className="relative">
                                <textarea
                                    rows={8}
                                    value={aiCustomContent}
                                    onChange={(e) => setAiCustomContent(e.target.value)}
                                    placeholder={`- Mobiles & Accessories\n  - Mobiles\n    - Galaxy AI Phones\n    - iPhones\n    - Smart Phones\n    - Basic Phones\n- Computers & Tablets\n- TV & Audio\n- Kitchen Appliances\n- Home Appliances\n- Smart Technology\n- Personal & Health Care`}
                                    className="w-full p-3 font-mono text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-50/50 leading-relaxed"
                                />
                            </div>

                            {/* Database Pages & Categories Quick-Add Chips */}
                            {groups.length > 0 && (
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                                    <div className="flex items-center justify-between text-xs text-indigo-900 font-semibold">
                                        <span className="flex items-center gap-1.5">
                                            <Icon icon="solar:folder-with-files-bold" width={14} className="text-indigo-600" />
                                            Click to Add Pages & Categories from your Site Database:
                                        </span>
                                        <span className="text-[11px] text-indigo-500 font-normal">
                                            {groups.reduce((acc, g) => acc + g.items.length, 0)} items available
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                        {groups.flatMap((g) => g.items).slice(0, 30).map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setAiCustomContent((prev) => {
                                                        const trimmed = prev.trim();
                                                        const line = `- ${item.title}`;
                                                        return trimmed ? `${trimmed}\n${line}` : line;
                                                    });
                                                }}
                                                className="px-2 py-1 bg-white hover:bg-indigo-100 text-gray-800 text-[11px] rounded-md border border-gray-200 shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                                title={`Click to add "${item.title}" (${item.slug})`}
                                            >
                                                <Icon icon="solar:add-circle-bold" width={12} className="text-indigo-500" />
                                                <span>{item.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Controls: Target Language, Depth, Location, and Generate */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                                {/* Target Language */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                        <Icon icon="solar:global-bold" width={14} className="text-indigo-600" />
                                        Target Language
                                    </label>
                                    <select
                                        value={aiTargetLanguage}
                                        onChange={(e) => setAiTargetLanguage(e.target.value as any)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                                    >
                                        <option value="original">Keep Original (As Entered)</option>
                                        <option value="en">English</option>
                                        <option value="bn">Bengali</option>
                                        <option value="sylheti">Sylheti</option>
                                        <option value="bilingual">Bilingual (English + Bengali)</option>
                                    </select>
                                </div>

                                {/* Hierarchy Depth */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">Hierarchy Depth</label>
                                    <div className="grid grid-cols-3 gap-1">
                                        {[
                                            { level: 1, label: 'L1', desc: 'Flat' },
                                            { level: 2, label: 'L2', desc: 'Dropdown' },
                                            { level: 3, label: 'L3', desc: 'Mega' },
                                        ].map((lvl) => (
                                            <button
                                                key={lvl.level}
                                                type="button"
                                                onClick={() => setAiDepth(lvl.level)}
                                                className={`py-1.5 px-1 text-center rounded-lg border text-xs font-semibold transition-all ${
                                                    aiDepth === lvl.level
                                                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                                }`}
                                                title={`Depth Level ${lvl.level}: ${lvl.desc}`}
                                            >
                                                <div>{lvl.label}</div>
                                                <div className={`text-[9px] ${aiDepth === lvl.level ? 'text-indigo-200' : 'text-gray-400'}`}>{lvl.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Target Location */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">Menu Location</label>
                                    <select
                                        value={aiLocation}
                                        onChange={(e) => setAiLocation(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                                    >
                                        <option value="header-1">Header 1 (Main Header)</option>
                                        <option value="header-2">Header 2 (Secondary Header)</option>
                                        <option value="mobile-1">Mobile Menu</option>
                                        <option value="footer-1">Footer Menu</option>
                                    </select>
                                </div>

                                {/* Action Generate Button */}
                                <div className="space-y-1 flex flex-col justify-end">
                                    <button
                                        type="button"
                                        onClick={() => generateMenuWithAi()}
                                        disabled={aiLoading}
                                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                                    >
                                        {aiLoading ? (
                                            <>
                                                <Icon icon="svg-spinners:ring-resize" width={16} />
                                                <span>Architecting Menu...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="solar:stars-bold" width={16} className="text-amber-300" />
                                                <span>Generate Menu</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 2: Ready Industry Presets ── */}
                    {aiInputMode === 'preset' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                    <Icon icon="solar:widget-2-bold" className="text-indigo-600" />
                                    Ready Industry Templates
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                    {[
                                        { id: 'ecommerce', label: 'E-Commerce', sub: 'Shop & Store', icon: 'solar:bag-3-bold', desc: 'Shop, Mega menu, Brands, Sale', prompt: 'Modern high-converting online fashion & tech store with categories and mega panels' },
                                        { id: 'news', label: 'News & Media', sub: 'Portal & Magazine', icon: 'solar:document-bold', desc: 'World, Politics, Tech post grids', prompt: 'News and digital magazine portal with category post sliders and multimedia tabs' },
                                        { id: 'saas', label: 'SaaS Platform', sub: 'Software & Cloud', icon: 'solar:rocket-bold', desc: 'Platform, Solutions, Pricing, Docs', prompt: 'Modern B2B SaaS software platform with product solutions mega menu and pricing' },
                                        { id: 'blog', label: 'Blog & Content', sub: 'Editorial & Stories', icon: 'solar:pen-new-square-bold', desc: 'Topics, Articles, Newsletter', prompt: 'Personal or corporate editorial blog with topics, featured articles, and about' },
                                        { id: 'restaurant', label: 'Restaurant / Cafe', sub: 'Food & Dining', icon: 'solar:cup-bold', desc: 'Dining menu, Specials, Booking', prompt: 'Artisan restaurant & cafe with dining menus, reservation booking, and story' },
                                    ].map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => {
                                                setAiPreset(preset.id as any);
                                                setAiPrompt(preset.prompt);
                                                generateMenuWithAi(preset.id, aiDepth, '', aiTargetLanguage);
                                            }}
                                            className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                                                aiPreset === preset.id
                                                    ? 'border-indigo-600 bg-indigo-50/60 shadow-xs scale-[1.01]'
                                                    : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50/60'
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
                                                    aiPreset === preset.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    <Icon icon={preset.icon} width={16} />
                                                </span>
                                                <div className="font-bold text-xs text-gray-900">{preset.label}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">{preset.sub}</div>
                                                <div className="text-[10px] text-gray-500 leading-tight line-clamp-2 mt-0.5">{preset.desc}</div>
                                            </div>
                                            <div className="mt-2 pt-1 border-t border-gray-100 text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                                                <span>Load Demo</span>
                                                <Icon icon="solar:arrow-right-bold" width={10} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Topic Instructions */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800">
                                        Custom Instructions & Topic Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        placeholder="Describe the website or industry (e.g., 'A travel booking site featuring tour packages, destinations, hotels, and seasonal discounts')..."
                                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={aiTargetLanguage}
                                            onChange={(e) => setAiTargetLanguage(e.target.value as any)}
                                            className="p-2 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                                        >
                                            <option value="original">Keep Original</option>
                                            <option value="en">English</option>
                                            <option value="bn">Bengali</option>
                                            <option value="sylheti">Sylheti</option>
                                            <option value="bilingual">Bilingual (English + Bengali)</option>
                                        </select>
                                        <select
                                            value={aiLocation}
                                            onChange={(e) => setAiLocation(e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                                        >
                                            <option value="header-1">Header 1</option>
                                            <option value="header-2">Header 2</option>
                                            <option value="mobile-1">Mobile Menu</option>
                                            <option value="footer-1">Footer</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => generateMenuWithAi()}
                                        disabled={aiLoading}
                                        className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                    >
                                        <Icon icon="solar:stars-bold" width={14} className="text-amber-300" />
                                        <span>Generate Menu</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Demo Preview Tree ── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:eye-bold" className="text-indigo-600" />
                                <h3 className="text-xs font-bold text-gray-800">
                                    Generated Menu Preview Tree
                                </h3>
                                {aiResult?.items && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                        {aiResult.items.length} top items • Depth Level {aiDepth}
                                    </span>
                                )}
                            </div>
                            {aiResult?.isDemo && (
                                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                    <Icon icon="solar:info-circle-bold" width={12} />
                                    Demo Preview (Built-in Architecture)
                                </span>
                            )}
                        </div>

                        {aiLoading ? (
                            <div className="py-16 text-center bg-white border border-gray-200 rounded-2xl space-y-3">
                                <Icon icon="svg-spinners:ring-resize" width={32} className="mx-auto text-indigo-600" />
                                <p className="text-xs font-semibold text-gray-700">AI is architecting your menu hierarchy...</p>
                                <p className="text-[11px] text-gray-400">Assigning responsive layouts, Iconify icons, and sub-items</p>
                            </div>
                        ) : aiResult ? (
                            <div className="bg-white border border-gray-200 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                                {/* Title & Explanation */}
                                <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{aiResult.title}</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">{aiResult.explanation}</p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-semibold">
                                        {aiResult.location}
                                    </span>
                                </div>

                                {/* Nested Items Tree */}
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {aiResult.items.map((item, idx) => (
                                        <div key={item.id || idx} className="space-y-1.5">
                                            {/* Top Level Item */}
                                            <div className="flex items-center justify-between p-2.5 bg-gray-50/80 hover:bg-indigo-50/40 border border-gray-200 rounded-xl transition">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                                        L0
                                                    </span>
                                                    {item.icon && (
                                                        <span className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-indigo-600 shrink-0">
                                                            <Icon icon={item.icon} width={14} />
                                                        </span>
                                                    )}
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-xs text-gray-900 truncate block">{item.label}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono truncate block">{item.url}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {item.displayStyle === 'mega' && (
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Mega</span>
                                                    )}
                                                    {item.showPosts && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                                                            {item.layoutType === 'slider' ? 'Slider' : 'Grid'} Posts
                                                        </span>
                                                    )}
                                                    {(item.children?.length ?? 0) > 0 && (
                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                                                            {item.children!.length} sub-items
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Level 1 Sub-items */}
                                            {(item.children?.length ?? 0) > 0 && (
                                                <div className="pl-6 space-y-1.5 border-l-2 border-indigo-200 ml-3">
                                                    {item.children!.map((sub, sIdx) => (
                                                        <div key={sub.id || sIdx} className="space-y-1">
                                                            <div className="flex items-center justify-between p-2 bg-white border border-gray-200/80 rounded-lg">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="w-4 h-4 rounded bg-purple-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                                                        L1
                                                                    </span>
                                                                    {sub.icon && (
                                                                        <Icon icon={sub.icon} width={13} className="text-gray-500 shrink-0" />
                                                                    )}
                                                                    <span className="font-medium text-xs text-gray-800 truncate">{sub.label}</span>
                                                                    <span className="text-[10px] text-gray-400 font-mono">({sub.url})</span>
                                                                </div>
                                                                {(sub.children?.length ?? 0) > 0 && (
                                                                    <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                                        {sub.children!.length} items
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Level 2 Sub-items */}
                                                            {(sub.children?.length ?? 0) > 0 && (
                                                                <div className="pl-5 space-y-1 border-l-2 border-purple-200 ml-2">
                                                                    {sub.children!.map((sub2, s2Idx) => (
                                                                        <div key={sub2.id || s2Idx} className="flex items-center gap-2 p-1.5 bg-gray-50/60 border border-gray-200/60 rounded text-[11px] text-gray-700">
                                                                            <span className="w-3.5 h-3.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                                                                                L2
                                                                            </span>
                                                                            <span className="truncate font-normal">{sub2.label}</span>
                                                                            <span className="text-[9px] text-gray-400 font-mono">({sub2.url})</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-10 text-center bg-white border border-dashed rounded-xl space-y-1.5">
                                <Icon icon="solar:notes-minimalistic-bold" width={28} className="mx-auto text-gray-300" />
                                <p className="text-xs text-gray-600 font-medium">No menu generated yet</p>
                                <p className="text-[11px] text-gray-400">
                                    Enter your menu outline above or load an example, then click <strong>"Generate Menu"</strong>.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modal Footer ── */}
                <div className="p-4 sm:p-4.5 border-t bg-white flex items-center justify-between flex-wrap gap-3 shrink-0">
                    <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 font-medium">
                            <input
                                type="checkbox"
                                checked={aiAutoTitle}
                                onChange={(e) => setAiAutoTitle(e.target.checked)}
                                className="w-4 h-4 accent-indigo-600 rounded"
                            />
                            <span>Set Menu Title</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 font-medium">
                            <input
                                type="checkbox"
                                checked={aiAutoLocation}
                                onChange={(e) => setAiAutoLocation(e.target.checked)}
                                className="w-4 h-4 accent-indigo-600 rounded"
                            />
                            <span>Assign Location</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        {existingMenuItemsCount > 0 && (
                            <button
                                type="button"
                                onClick={() => handleApply('append')}
                                disabled={!aiResult || !aiResult.items}
                                className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50 cursor-pointer"
                            >
                                + Append to Menu
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleApply('replace')}
                            disabled={!aiResult || !aiResult.items}
                            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                            <Icon icon="solar:check-circle-bold" width={16} />
                            <span>Apply to Menu</span>
                       </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
