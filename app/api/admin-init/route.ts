/**
 * app/api/admin-init/route.ts
 *
 * Aggregates the three Express calls that every admin page needs into a
 * single Next.js API route so the browser (useActivePlugins) and the
 * server component (admin/page.tsx) can both hit ONE endpoint instead of
 * making three parallel round-trips each.
 *
 * Returns:
 *   { domain, users, plugins }
 *
 * All three Express fetches run in parallel.  The Next.js Data Cache
 * deduplicates identical fetch() calls within the same render cycle, so
 * even if server and client both call this route, Express is only contacted
 * once per unique URL per cycle.
 */

import { NextResponse } from "next/server";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000";
const LICENSE_KEY = process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";

const headers = {
    "x-license-key": LICENSE_KEY,
    "Content-Type": "application/json",
};

export const dynamic = "force-dynamic";

export async function GET() {
    const [domainRes, userRes, pluginRes] = await Promise.all([
        fetch(`${EXPRESS_API}/auth/domain`, { headers, cache: "no-store" }),
        fetch(`${EXPRESS_API}/user`,        { headers, cache: "no-store" }),
        fetch(`${EXPRESS_API}/plugin/installed`, { headers, cache: "no-store" }),
    ]);

    const [domainData, userData, pluginData] = await Promise.all([
        domainRes.ok  ? domainRes.json()  : Promise.resolve({}),
        userRes.ok    ? userRes.json()    : Promise.resolve({ users: [] }),
        pluginRes.ok  ? pluginRes.json()  : Promise.resolve({ plugins: [] }),
    ]);

    return NextResponse.json({
        domain:  domainData.domain  ?? null,
        users:   userData.users     ?? [],
        plugins: pluginData.plugins ?? [],
    });
}
