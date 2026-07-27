import { NextRequest, NextResponse } from "next/server";
import connectDB, { exportDatabase, exportTypeProportion, getCollection } from "@/lib/mongodb";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const collectionsList = await db.listCollections().toArray();
    const stats: Record<string, number> = {};

    for (const col of collectionsList) {
      if (col.name.startsWith("system.")) continue;
      const count = await db.collection(col.name).countDocuments();
      stats[col.name] = count;
    }

    return NextResponse.json({
      success: true,
      stats,
      collections: Object.keys(stats),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch export stats" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const { mode = "all", selectedCollections, proportions } = body;

    let dumpResult;

    if (mode === "proportion" && proportions && typeof proportions === "object") {
      dumpResult = await exportTypeProportion(proportions);
    } else {
      dumpResult = await exportDatabase(selectedCollections);
    }

    return NextResponse.json(dumpResult, {
      headers: {
        "Content-Disposition": `attachment; filename="cms-export-${Date.now()}.json"`,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Export execution failed" },
      { status: 500 }
    );
  }
}
