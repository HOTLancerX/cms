import Link from 'next/link';
import MenuClients from '@/components/MenuClients';
import MobileDrawer from './MobileDrawer';
import type { MenuItem } from '@/models/Menu';

interface Header2Props {
    settings?: Record<string, any>;
    topItems?:       MenuItem[];
    mainItems?:      MenuItem[];
    rightItems?:     MenuItem[];
    mobileItems?:    MenuItem[];
    builderContent?: Record<string, any[]>;
}

export default function Header2({
    settings = {},
    topItems       = [],
    mainItems      = [],
    rightItems     = [],
    mobileItems    = [],
    builderContent = {},
}: Header2Props) {
    const isSticky = settings.header_sticky !== 'false';

    const darkSettings = {
        ...settings,
        nav_text:       settings.nav_text       || '#e9d5ff',
        nav_hover_text: settings.nav_hover_text || '#ffffff',
        nav_hover_bg:   settings.nav_hover_bg   || 'rgba(255,255,255,0.12)',
        nav_box_bg:     settings.nav_box_bg     || '#4c1d95',
        nav_box_text:   settings.nav_box_text   || '#f3e8ff',
    };

    return (
        <header className={`z-50 shadow-lg bg-gradient-to-r from-violet-600 to-purple-700 ${isSticky ? 'sticky top-0' : 'relative'}`}>
            {topItems.length > 0 && (
                <div className="bg-violet-900/60 text-violet-200 text-xs px-6 py-1.5">
                    <div className="max-w-6xl mx-auto flex items-center justify-end">
                        <MenuClients menuItems={topItems} settings={darkSettings} builderContent={builderContent} className="flex items-center" />
                    </div>
                </div>
            )}
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
                <Link href="/" className="text-xl font-extrabold text-white tracking-tight shrink-0">
                    {settings.siteName || 'MySite'}
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
                <MobileDrawer items={mobileItems} siteName={settings.siteName} iconColor="#ede9fe" />
            </div>
        </header>
    );
}
