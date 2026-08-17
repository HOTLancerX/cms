import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Universal HLS / Live Stream Reverse Proxy
 * Supports dynamic Cookies, User-Agent, Referer, and automatic .m3u8 URI rewriting.
 */
export async function GET(req: NextRequest) {
    try {
        const urlObj = new URL(req.url, "http://localhost");
        const searchParams = urlObj.searchParams;
        const targetUrl = searchParams.get("url");
        const cookie = searchParams.get("cookie");
        const userAgent = searchParams.get("ua") || searchParams.get("userAgent");
        const referer = searchParams.get("referer");
        const rawHeaders = searchParams.get("headers");

        if (!targetUrl) {
            return new NextResponse("Missing url parameter", { status: 400 });
        }

        // Build clean headers for backend fetch
        const reqHeaders: Record<string, string> = {
            "Accept": "*/*",
            "User-Agent": userAgent || "Toffee (Linux;Android 14)",
        };

        if (cookie) {
            reqHeaders["Cookie"] = cookie;
        }

        if (referer) {
            reqHeaders["Referer"] = referer;
        }

        if (rawHeaders) {
            try {
                const parsed = JSON.parse(rawHeaders);
                if (typeof parsed === "object" && parsed !== null) {
                    for (const [k, v] of Object.entries(parsed)) {
                        if (typeof v === "string" && v.trim()) {
                            // Normalize header key (case-insensitive deduplication)
                            const lower = k.toLowerCase();
                            if (lower === "cookie") {
                                reqHeaders["Cookie"] = v;
                            } else if (lower === "user-agent") {
                                reqHeaders["User-Agent"] = v;
                            } else if (lower === "referer") {
                                reqHeaders["Referer"] = v;
                            } else {
                                reqHeaders[k] = v;
                            }
                        }
                    }
                }
            } catch {}
        }

        const res = await fetch(targetUrl, {
            headers: reqHeaders,
            redirect: "follow",
        });

        if (!res.ok) {
            return new NextResponse(`Stream server responded with ${res.status} ${res.statusText}`, {
                status: res.status,
                headers: { "Access-Control-Allow-Origin": "*" },
            });
        }

        const contentType = res.headers.get("content-type") || "";
        const isM3u8 =
            targetUrl.includes(".m3u8") ||
            contentType.includes("mpegurl") ||
            contentType.includes("application/x-mpegURL") ||
            contentType.includes("application/vnd.apple.mpegurl");

        // Helper to encode proxy URL for child segments/playlists
        const makeProxyUrl = (uri: string, baseUrl: string) => {
            let resolved = uri;
            try {
                resolved = new URL(uri, baseUrl).toString();
            } catch {}

            const p = new URLSearchParams();
            p.set("url", resolved);
            if (cookie) p.set("cookie", cookie);
            if (userAgent) p.set("ua", userAgent);
            if (referer) p.set("referer", referer);
            if (rawHeaders) p.set("headers", rawHeaders);

            return `/api/stream-proxy?${p.toString()}`;
        };

        // If HLS Playlist, rewrite URLs so all chunks, keys, and child playlists pass through proxy with auth
        if (isM3u8) {
            const playlistText = await res.text();
            const rewrittenLines = playlistText.split(/\r?\n/).map((line) => {
                const trimmed = line.trim();
                // Skip empty lines
                if (!trimmed) return line;

                // Rewrite URI inside tags like #EXT-X-KEY:METHOD=AES-128,URI="/keys/..."
                if (trimmed.startsWith("#")) {
                    if (trimmed.includes('URI="')) {
                        return trimmed.replace(/URI="([^"]+)"/, (_, uri) => `URI="${makeProxyUrl(uri, targetUrl)}"`);
                    }
                    return line;
                }

                // Rewrite segment / child playlist URL
                return makeProxyUrl(trimmed, targetUrl);
            });

            const rewrittenPlaylist = rewrittenLines.join("\n");

            return new NextResponse(rewrittenPlaylist, {
                status: 200,
                headers: {
                    "Content-Type": "application/vnd.apple.mpegurl",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                },
            });
        }

        // Binary streaming (e.g. .ts video chunks, AES keys, .mp4, audio)
        const arrayBuf = await res.arrayBuffer();

        return new NextResponse(arrayBuf, {
            status: 200,
            headers: {
                "Content-Type": contentType || "video/MP2T",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (err: any) {
        console.error("[Stream Proxy Error]:", err);
        return new NextResponse(`Proxy Error: ${err?.message || "Failed to fetch stream"}`, {
            status: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
        });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    });
}
