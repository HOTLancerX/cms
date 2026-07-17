import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ContactUs from "@/models/ContactUs";

// Helper to check if IP is private
function isPrivateIp(ip: string): boolean {
    return (
        ip === "::1" ||
        ip === "127.0.0.1" ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        ip.startsWith("172.16.") ||
        ip.startsWith("::ffff:127.0.0.1")
    );
}

// Helper to fetch geo information from IP
async function fetchGeoLocation(ip: string): Promise<string> {
    if (!ip || isPrivateIp(ip)) {
        return "Local Development (localhost)";
    }
    try {
        const cleanIp = ip.split(",")[0].trim();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const res = await fetch(`http://ip-api.com/json/${cleanIp}`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
                return `${data.city || ""}, ${data.regionName || ""}, ${data.country || ""}`.trim().replace(/^,|,$/g, "");
            }
        }
    } catch (e) {
        console.error("Geo IP lookup failed:", e);
    }
    return "Unknown Location";
}

// Simple User-Agent parser to extract Device, Browser, and OS
function parseUserAgent(userAgent: string): string {
    if (!userAgent) return "Unknown Device";
    
    let os = "Unknown OS";
    let browser = "Unknown Browser";
    let device = "Desktop";

    // Detect OS
    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
    else if (/iphone|ipad|ipod/i.test(userAgent)) {
        os = "iOS";
        device = /ipad/i.test(userAgent) ? "Tablet" : "Mobile";
    } else if (/android/i.test(userAgent)) {
        os = "Android";
        device = "Mobile";
    } else if (/linux/i.test(userAgent)) os = "Linux";

    // Detect Browser
    if (/chrome|crios/i.test(userAgent) && !/edge|edg/i.test(userAgent) && !/opr/i.test(userAgent)) browser = "Chrome";
    else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = "Safari";
    else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
    else if (/edge|edg/i.test(userAgent)) browser = "Edge";
    else if (/opr/i.test(userAgent)) browser = "Opera";

    return `${device} (${os} / ${browser})`;
}

// POST: Submit contact form
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const { fields = {}, files = [], webhookUrl } = body;

        // Gather IP
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
        
        // Gather Location
        // Check standard edge country/city headers first (Cloudflare/Vercel)
        let location = "Unknown Location";
        const headerCountry = request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country");
        const headerCity = request.headers.get("x-vercel-ip-city");
        const headerRegion = request.headers.get("x-vercel-ip-country-region");
        
        if (headerCountry) {
            location = `${headerCity ? headerCity + ", " : ""}${headerRegion ? headerRegion + ", " : ""}${headerCountry}`;
        } else {
            location = await fetchGeoLocation(ip);
        }

        // Gather User Agent / Device
        const userAgent = request.headers.get("user-agent") || "";
        const device = parseUserAgent(userAgent);

        const newSubmission = await ContactUs.create({
            fields,
            files,
            ip,
            location,
            device,
            status: "unread",
        });

        // Trigger optional webhook (Elementor form feature)
        if (webhookUrl) {
            try {
                // Fire and forget or quick fetch with 2s timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fields,
                        files,
                        ip,
                        location,
                        device,
                        createdAt: new Date(),
                    }),
                    signal: controller.signal,
                }).then(() => clearTimeout(timeoutId))
                  .catch((e) => console.error("Webhook fetch failed:", e));
            } catch (e) {
                console.error("Webhook trigger failed:", e);
            }
        }

        return NextResponse.json({ success: true, data: newSubmission }, { status: 201 });
    } catch (error: any) {
        console.error("Failed to save contact submission:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// GET: Retrieve list of submissions or a single submission
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (id) {
            const doc = await ContactUs.findById(id);
            if (!doc) {
                return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
            }
            return NextResponse.json({ success: true, data: doc });
        }

        // Get all sorted by latest
        const docs = await ContactUs.find().sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: docs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Update status of a submission
export async function PATCH(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ success: false, error: "Missing submission ID" }, { status: 400 });
        }

        const body = await request.json();
        const { status } = body;

        const doc = await ContactUs.findByIdAndUpdate(id, { status }, { new: true });
        if (!doc) {
            return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: doc });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a submission
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ success: false, error: "Missing submission ID" }, { status: 400 });
        }

        const doc = await ContactUs.findByIdAndDelete(id);
        if (!doc) {
            return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Submission deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
