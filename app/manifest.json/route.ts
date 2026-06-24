import { Settings } from '@/lib/settings';

export async function GET() {
    const settings = await Settings();

    const name = settings.site_title || 'My App';
    const description = settings.site_description || '';
    const favicon = settings.favicon || '';
    const themeColor = settings.header_bg || '#000000';
    const bgColor = '#ffffff';
    const siteUrl = settings.siteurl || '';

    // Use the favicon from settings as the PWA icon if available,
    // otherwise fall back to the static pre-generated icon set.
    const icons = favicon
        ? [
            { src: favicon, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: favicon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ]
        : [
            { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ];

    const manifest = {
        name,
        short_name: name,
        description,
        start_url: siteUrl ? siteUrl : '/',
        scope: '/',
        display: 'standalone',
        background_color: bgColor,
        theme_color: themeColor,
        orientation: 'portrait-primary',
        icons,
    };

    return new Response(JSON.stringify(manifest), {
        headers: {
            'Content-Type': 'application/manifest+json',
            // Revalidate every hour so changes in settings propagate
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
    });
}
