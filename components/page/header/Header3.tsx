import Link from 'next/link';
import MenuClients from '@/components/MenuClients';
import MobileDrawer from './MobileDrawer';
import type { MenuItem } from '@/models/Menu';

interface Header3Props {
    settings?: Record<string, any>;
    topItems?:       MenuItem[];
    mainItems?:      MenuItem[];
    rightItems?:     MenuItem[];
    mobileItems?:    MenuItem[];
    builderContent?: Record<string, any[]>;
}

export default function Header3({
    settings = {},
    topItems       = [],
    mainItems      = [],
    rightItems     = [],
    mobileItems    = [],
    builderContent = {},
}: Header3Props) {
    const isSticky      = settings.header_sticky      !== 'false';
    const isTransparent = settings.header_transparent === 'true';

    const darkSettings = {
        ...settings,
        nav_text:         settings.nav_text         || '#9ca3af',
        nav_hover_text:   settings.nav_hover_text   || '#ffffff',
        nav_hover_bg:     settings.nav_hover_bg     || 'rgba(255,255,255,0.08)',
        nav_box_bg:       settings.nav_box_bg       || '#1a1d2e',
        nav_box_text:     settings.nav_box_text     || '#e5e7eb',
        nav_border_color: settings.nav_border_color || 'rgba(255,255,255,0.1)',
    };

    return (
        <header className={`z-50 border-b border-white/10 backdrop-blur-sm ${isSticky ? 'sticky top-0' : 'relative'} ${isTransparent ? 'bg-transparent' : 'bg-[#0f1117]/95'}`}>
            {topItems.length > 0 && (
                <div className="bg-black/30 text-gray-400 text-xs px-6 py-1.5">
                    <div className="max-w-6xl mx-auto flex items-center justify-end">
                        <MenuClients menuItems={topItems} settings={darkSettings} builderContent={builderContent} className="flex items-center" />
                    </div>
                </div>
            )}
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
                <Link href="/" className="text-xl font-extrabold text-white tracking-tight shrink-0">
                    {settings.siteName || <><span>My</span><span className="text-violet-400">Site</span></>}
                </Link>
                {mainItems.length > 0 ? (
                    <div className="hidden md:flex flex-1">
                        <MenuClients menuItems={mainItems} settings={darkSettings} builderContent={builderContent} className="flex items-center" />
                    </div>
                ) : <div className="flex-1" />}
                {rightItems.length > 0 && (
                    <div className="hidden md:flex items-center">
                        <MenuClients menuItems={rightItems} settings={darkSettings} builderContent={builderContent} className="flex items-center" />
                    </div>
                )}
                <MobileDrawer items={mobileItems} siteName={settings.siteName} iconColor="#9ca3af" />
            </div>
        </header>
    );
}
