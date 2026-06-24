'use client';

/**
 * AppearanceVars.tsx
 *
 * Mounted in (root)/layout.tsx. Receives the initial settings values
 * as props from the server component so they are applied synchronously
 * on first render — no flash of unstyled content, no hydration mismatch.
 *
 * Afterwards it listens for the localStorage 'cms_settings_updated'
 * signal (fired by FormSettings after every save) and re-fetches the
 * latest values from /api/settings, so changes made in the admin panel
 * propagate to the live site instantly without a page reload.
 */

import { useEffect, useRef } from 'react';

export interface AppearanceVarsProps {
    colorMain:      string;
    colorSecondary: string;
    colorPrimary:   string;
    colorFf:        string;
    width:          string;
    googleFont:     string;
}

function applyVars(
    colorMain: string,
    colorSecondary: string,
    colorPrimary: string,
    colorFf: string,
    width: string,
    googleFont: string,
) {
    const style = document.documentElement.style;
    style.setProperty('--color-main',      colorMain      || '#00aaa6');
    style.setProperty('--color-secondary', colorSecondary || '#ffc800');
    style.setProperty('--color-primary',   colorPrimary   || '#10846f');
    style.setProperty('--color-ff',        colorFf        || '#fff9f3');

    // Container width — write into a dedicated <style> tag so specificity
    // works correctly without touching inline styles on .container elements.
    const w = parseInt(width || '1600', 10) || 1600;
    let el = document.getElementById('cms-container') as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement('style');
        el.id = 'cms-container';
        document.head.appendChild(el);
    }
    el.textContent = `.container { max-width: ${w}px; }`;

    // Google Font — load only when font name is set and not already loaded
    const font = googleFont || '';
    if (font) {
        const linkId = 'cms-google-font';
        const href   = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700&display=swap`;
        const existing = document.getElementById(linkId) as HTMLLinkElement | null;
        if (!existing || existing.href !== href) {
            existing?.remove();
            const link = Object.assign(document.createElement('link'), {
                id: linkId, rel: 'stylesheet', href,
            });
            document.head.appendChild(link);
        }
        document.body.style.fontFamily = `'${font}', sans-serif`;
    }
}

async function fetchAndApply() {
    try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (!res.ok) return;
        const s: Record<string, any> = await res.json();
        applyVars(
            s.color_main      || '',
            s.color_secondary || '',
            s.color_primary   || '',
            s.color_ff        || '',
            s.width           || '',
            s.google_font     || '',
        );
    } catch { /* non-critical */ }
}

export default function AppearanceVars({
    colorMain,
    colorSecondary,
    colorPrimary,
    colorFf,
    width,
    googleFont,
}: AppearanceVarsProps) {
    const applied = useRef(false);

    useEffect(() => {
        // Apply initial server-provided values immediately on first mount —
        // this is synchronous with the first paint so there is no FOUC.
        if (!applied.current) {
            applied.current = true;
            applyVars(colorMain, colorSecondary, colorPrimary, colorFf, width, googleFont);
        }

        // Listen for saves from any tab (admin panel fires this signal)
        const handler = (e: StorageEvent) => {
            if (e.key === 'cms_settings_updated') fetchAndApply();
        };
        window.addEventListener('storage', handler);

        // Also listen for saves in the SAME tab (storage events don't fire
        // for the originating tab, so FormSettings dispatches a custom event).
        const sameTabHandler = () => fetchAndApply();
        window.addEventListener('cms_settings_updated', sameTabHandler);

        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('cms_settings_updated', sameTabHandler);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
