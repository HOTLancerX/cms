import Link from 'next/link';
import MenuClients from '@/components/MenuClients';
import MobileDrawer from './MobileDrawer';
import type { MenuItem } from '@/models/Menu';
import AuthAc from '@/components/AuthAc';

interface Header1Props {
    settings?: Record<string, any>;
    topItems?:       MenuItem[];
    mainItems?:      MenuItem[];
    rightItems?:     MenuItem[];
    mobileItems?:    MenuItem[];
    builderContent?: Record<string, any[]>;
}

export default function Header1({
    settings = {},
    topItems       = [],
    mainItems      = [],
    rightItems     = [],
    mobileItems    = [],
    builderContent = {},
}: Header1Props) {
    const isSticky      = settings.header_sticky      !== 'false';
    const isTransparent = settings.header_transparent === 'true';

    return (
        <header className={`z-50 border-b border-gray-200 shadow-sm ${isSticky ? 'sticky top-0' : 'relative'} ${isTransparent ? 'bg-transparent' : 'bg-white'}`}>
            {topItems.length > 0 && (
                <div className="bg-gray-900 text-gray-300 text-xs px-6 py-1.5">
                    <div className="container flex items-center justify-end">
                        <MenuClients menuItems={topItems} settings={settings} builderContent={builderContent} className="flex items-center" />
                    </div>
                </div>
            )}
            <div className="container h-16 flex items-center justify-between w-full gap-6">
                <Link href="/" className="text-xl font-extrabold text-gray-900 tracking-tight shrink-0">
                    {settings.siteName || 'MySite'}
                </Link>
                <MobileDrawer items={mobileItems} siteName={settings.siteName} iconColor="#374151" />
                {mainItems.length > 0 ? (
                    <div className="hidden md:flex justify-end flex-1">
                        <MenuClients menuItems={mainItems} settings={settings} builderContent={builderContent} className="flex items-center" />
                    </div>
                ) : <div className="flex-1" />}
                {rightItems.length > 0 && (
                    <div className="hidden md:flex justify-end items-center">
                        <MenuClients menuItems={rightItems} settings={settings} builderContent={builderContent} className="flex items-center" />
                    </div>
                )}
                <AuthAc />
            </div>
        </header>
    );
}
