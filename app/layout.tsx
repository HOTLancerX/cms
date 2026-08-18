import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/context/Provider";
import { Settings } from "@/lib/settings";
import { getRootPages } from "@/hook/rootPages";
import { getActivePluginNames } from "@/hook/PluginListServer";
import { withCache } from "@/lib/cache";

const CORE_NX = "com.system.core";

// Cache active plugin names
const getActivePluginNamesCached = () =>
  withCache("plugins:active", getActivePluginNames)();

export async function generateMetadata(): Promise<Metadata> {
  const settings = await Settings();
  const siteTitle = settings.site_title || "NxCMS";
  const favicon = settings.favicon || "";
  const description = settings.site_description || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Dynamic webmaster & platform verification tokens from settings
  const otherVerification: Record<string, string> = {};
  if (settings.tag_bing_site_verification || settings.bing_site_verification) {
    otherVerification["msvalidate.01"] = settings.tag_bing_site_verification || settings.bing_site_verification;
  }
  if (settings.tag_baidu_verification) {
    otherVerification["baidu-site-verification"] = settings.tag_baidu_verification;
  }
  if (settings.tag_naver_verification) {
    otherVerification["naver-site-verification"] = settings.tag_naver_verification;
  }
  if (settings.tag_seznam_verification) {
    otherVerification["seznam-wmt"] = settings.tag_seznam_verification;
  }
  if (settings.tag_ahrefs_verification) {
    otherVerification["ahrefs-site-verification"] = settings.tag_ahrefs_verification;
  }
  if (settings.tag_semrush_verification) {
    otherVerification["semrush-site-verification"] = settings.tag_semrush_verification;
  }
  if (settings.tag_pinterest_verification) {
    otherVerification["p:domain_verify"] = settings.tag_pinterest_verification;
  }
  if (settings.tag_facebook_verification) {
    otherVerification["facebook-domain-verification"] = settings.tag_facebook_verification;
  }
  if (settings.tag_linkedin_verification) {
    otherVerification["linkedin-site-verification"] = settings.tag_linkedin_verification;
  }
  if (settings.tag_apple_verification) {
    otherVerification["apple-developer-merchantid-domain-association"] = settings.tag_apple_verification;
  }

  const googleVerify = settings.tag_google_site_verification || settings.google_site_verification || undefined;
  const yandexVerify = settings.tag_yandex_verification || settings.yandex_verification || undefined;

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description,
    keywords: settings.keywords?.length ? settings.keywords : undefined,
    metadataBase: baseUrl ? new URL(baseUrl) : undefined,
    alternates: {
      canonical: baseUrl || undefined,
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: siteTitle,
    },
    icons: favicon ? {
      icon: [{ url: favicon }],
      apple: [{ url: favicon }],
    } : undefined,
    verification: (googleVerify || yandexVerify || Object.keys(otherVerification).length > 0) ? {
      google: googleVerify,
      yandex: yandexVerify,
      other: Object.keys(otherVerification).length > 0 ? otherVerification : undefined,
    } : undefined,
    robots: settings.tag_robots_meta ? {
      index: !settings.tag_robots_meta.includes("noindex"),
      follow: !settings.tag_robots_meta.includes("nofollow"),
    } : undefined,
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await Settings();
  return {
    themeColor: settings.color_main || "#000000",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, activeNxList] = await Promise.all([
    Settings(),
    getActivePluginNamesCached(),
  ]);

  const activeNxSet = new Set([CORE_NX, ...activeNxList]);
  const rootPages = getRootPages();

  // Dynamic head widgets (type="head" or slug="head") registered by active plugins
  const headWidgets = rootPages.filter(
    (p) =>
      (p.type === "head" || p.slug === "head") &&
      (p.pluginNx === CORE_NX || (p.pluginNx && activeNxSet.has(p.pluginNx))) &&
      p.component
  );

  // Dynamic body widgets (type="body" or slug="body") registered by active plugins
  const bodyWidgets = rootPages.filter(
    (p) =>
      (p.type === "body" || p.slug === "body") &&
      (p.pluginNx === CORE_NX || (p.pluginNx && activeNxSet.has(p.pluginNx))) &&
      p.component
  );

  const favicon = settings.favicon || "";
  const googleFont = settings.google_font || "";
  const fontFamily = googleFont ? `'${googleFont}', sans-serif` : "sans-serif";
  const fontImportUrl = googleFont ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(googleFont)}:wght@300;400;500;600;700&display=swap` : null;

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {favicon && <link rel="apple-touch-icon" href={favicon} />}
        {fontImportUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={fontImportUrl} />
          </>
        )}
        {googleFont && (
          <style dangerouslySetInnerHTML={{ __html: `body { font-family: ${fontFamily}; }` }} />
        )}
        <style>{`.container {max-width: ${settings.width || 1600}px;}`}</style>
        <style dangerouslySetInnerHTML={{
          __html: `:root {
            --color-main: ${settings.color_main || "#00aaa6"};
            --color-secondary: ${settings.color_secondary || "#ffc800"};
            --color-primary: ${settings.color_primary || "#10846f"};
            --color-ff: ${settings.color_ff || "#fff9f3"};
          }`
        }} />

        {/* Dynamically rendered <head> widgets from active plugins */}
        {headWidgets.map((widget) => {
          const WidgetComponent = widget.component as React.ComponentType<any>;
          return (
            <WidgetComponent
              key={`${widget.pluginNx}-${widget.key}`}
              settings={settings}
            />
          );
        })}
      </head>
      <body className="bg-ff">
        <Providers>{children}</Providers>
        {/* Dynamically rendered <body> widgets from active plugins */}
        {bodyWidgets.map((widget) => {
          const WidgetComponent = widget.component as React.ComponentType<any>;
          return (
            <WidgetComponent
              key={`${widget.pluginNx}-${widget.key}`}
              settings={settings}
            />
          );
        })}
      </body>
    </html>
  );
}
