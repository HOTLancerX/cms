import { NextResponse } from "next/server";
import { xFetch } from "@/lib/express";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const res = await xFetch("/cat/bulk-create", {
            method: "POST",
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error("Bulk category create forward error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to create categories in bulk" },
            { status: 500 }
        );
    }
}
