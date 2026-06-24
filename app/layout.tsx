import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/context/Provider";
import { Settings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await Settings();
  const title = settings.site_title || "NxCMS";
  const favicon = settings.favicon || "";
  const description = settings.site_description || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return {
    title,
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
      title,
    },
    icons: favicon ? {
      icon: [{ url: favicon }],
      apple: [{ url: favicon }],
    } : undefined,
  };
}

export const viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await Settings();
  const favicon = settings.favicon || "";
  const googleFont = settings.google_font || "";
  const fontFamily = googleFont ? `'${googleFont}', sans-serif` : "sans-serif";
  const fontImportUrl = googleFont ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(googleFont)}:wght@300;400;500;600;700&display=swap` : null;

  return (
    <html>
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
      </head>
      <body className="bg-ff">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
