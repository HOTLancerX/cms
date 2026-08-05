import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPlaylist = searchParams.get("playlistId") || searchParams.get("id") || "";

  let playlistId = rawPlaylist.trim();
  const match = playlistId.match(/[?&]list=([^#&?]+)/);
  if (match && match[1]) {
    playlistId = match[1];
  }

  if (!playlistId) {
    return NextResponse.json({ error: "Missing playlistId parameter", items: [] }, { status: 400 });
  }

  try {
    // Fetch public RSS feed for YouTube playlist
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) {
      // Fallback: scrape public playlist page
      return await scrapePlaylistPage(playlistId);
    }

    const xmlText = await res.text();
    const items: Array<{ id: string; title: string; videoId: string; thumbnail: string; author: string }> = [];

    // Simple regex parser for RSS XML entries
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let entryMatch: RegExpExecArray | null;

    while ((entryMatch = entryRegex.exec(xmlText)) !== null) {
      const entryContent = entryMatch[1];

      const videoIdMatch = entryContent.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || entryContent.match(/<id>yt:video:(.*?)<\/id>/);
      const titleMatch = entryContent.match(/<title>(.*?)<\/title>/);
      const authorMatch = entryContent.match(/<name>(.*?)<\/name>/);
      const mediaThumbMatch = entryContent.match(/<media:thumbnail[^>]+url="([^"]+)"/);

      const videoId = videoIdMatch ? videoIdMatch[1].trim() : "";
      let title = titleMatch ? titleMatch[1].trim() : "";
      // Unescape basic XML entities
      title = title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

      const author = authorMatch ? authorMatch[1].trim() : "";
      const thumbnail = mediaThumbMatch
        ? mediaThumbMatch[1]
        : videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : "";

      if (videoId) {
        items.push({
          id: videoId,
          title: title || `Video ${videoId}`,
          videoId,
          thumbnail,
          author,
        });
      }
    }

    if (items.length > 0) {
      return NextResponse.json({ playlistId, count: items.length, items });
    }

    // Fallback if RSS parsing yielded 0 entries
    return await scrapePlaylistPage(playlistId);
  } catch (err: any) {
    console.error("YouTube playlist fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch playlist", items: [] },
      { status: 500 }
    );
  }
}

async function scrapePlaylistPage(playlistId: string) {
  try {
    const pageUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!pageRes.ok) {
      return NextResponse.json({ playlistId, items: [] });
    }

    const html = await pageRes.text();
    const items: Array<{ id: string; title: string; videoId: string; thumbnail: string; author: string }> = [];

    // Extract ytInitialData video details
    const videoRegex = /"playlistVideoRenderer":\{"videoId":"([^"]+)","thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"[\s\S]*?"title":\{"runs":\[\{"text":"([^"]+)"\}/g;
    let match: RegExpExecArray | null;

    while ((match = videoRegex.exec(html)) !== null && items.length < 50) {
      const videoId = match[1];
      const thumb = match[2];
      const title = match[3];

      if (videoId && !items.some((i) => i.videoId === videoId)) {
        items.push({
          id: videoId,
          title: title || `Video ${videoId}`,
          videoId,
          thumbnail: thumb || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          author: "",
        });
      }
    }

    return NextResponse.json({ playlistId, count: items.length, items });
  } catch {
    return NextResponse.json({ playlistId, items: [] });
  }
}
