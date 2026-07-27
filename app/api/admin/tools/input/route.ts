import { NextRequest, NextResponse } from "next/server";
import connectDB, { importDatabaseDump } from "@/lib/mongodb";
import { getDataInputHooks } from "@/hook";
import { reregisterHooks, pluginList } from "@/hook/PluginList";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

async function resolveDumpFilePath(targetPath: string): Promise<string> {
  if (path.isAbsolute(targetPath)) {
    try {
      await fs.stat(targetPath);
      return targetPath;
    } catch {}
  }

  const cleanPath = targetPath.replace(/^(\.\.[\/\\])+/, "").replace(/^cms[\/\\]/, "");
  const candidates = [
    path.join(process.cwd(), targetPath),
    path.join(process.cwd(), "..", targetPath),
    path.join(process.cwd(), cleanPath),
    path.join(process.cwd(), "plugin", cleanPath.replace(/^plugin[\/\\]/, "")),
    path.join(process.cwd(), "..", "cms", "plugin", cleanPath.replace(/^plugin[\/\\]/, "")),
  ];

  for (const candidate of candidates) {
    try {
      await fs.stat(candidate);
      return candidate;
    } catch {}
  }

  throw new Error(`File not found at path: ${targetPath}`);
}

export async function GET() {
  try {
    // Ensure all plugin hooks are registered
    reregisterHooks(pluginList.map((p) => p.nx));
    const registeredHooks = getDataInputHooks();

    // Enriched hooks with file size / exists information
    const enriched = await Promise.all(
      registeredHooks.map(async (hook) => {
        let fileExists = true;
        let fileSize = 0;
        let itemCount = 0;

        // If dataset is statically imported via hook.data (Vercel serverless friendly)
        if (hook.data) {
          const parsed = hook.data;
          const collections = parsed?.collections || parsed;
          if (collections && typeof collections === "object") {
            const collectionsArray = Object.values(collections) as any[];
            itemCount = collectionsArray.reduce(
              (acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0),
              0
            );
          }
          fileSize = JSON.stringify(hook.data).length;
        }

        try {
          const absolutePath = await resolveDumpFilePath(hook.filePath);
          const stat = await fs.stat(absolutePath);
          fileExists = true;
          fileSize = stat.size;

          if (!hook.data) {
            const content = await fs.readFile(absolutePath, "utf-8");
            const parsed = JSON.parse(content);
            if (parsed?.collections) {
              const collectionsArray = Object.values(parsed.collections) as any[];
              itemCount = collectionsArray.reduce(
                (acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0),
                0
              );
            }
          }
        } catch (err) {
          // If filesystem read fails on Vercel, keep fileExists = true if hook.data exists
          if (!hook.data) {
            fileExists = false;
          }
        }

        return {
          ...hook,
          fileExists,
          fileSize,
          itemCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      hooks: enriched,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch input hooks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const { filePath, dumpData, mode = "replace" } = body;

    let collectionsToImport: Record<string, any[]> = {};

    if (filePath) {
      reregisterHooks(pluginList.map((p) => p.nx));
      const registeredHooks = getDataInputHooks();
      const matchedHook = registeredHooks.find((h) => h.filePath === filePath || h.key === filePath);

      if (matchedHook?.data) {
        const parsed = matchedHook.data;
        collectionsToImport = parsed?.collections || parsed;
      } else {
        const absolutePath = await resolveDumpFilePath(filePath);
        const fileContent = await fs.readFile(absolutePath, "utf-8");
        const parsed = JSON.parse(fileContent);

        if (parsed?.collections && typeof parsed.collections === "object") {
          collectionsToImport = parsed.collections;
        } else if (typeof parsed === "object") {
          collectionsToImport = parsed;
        }
      }
    } else if (dumpData && typeof dumpData === "object") {
      collectionsToImport = dumpData.collections || dumpData;
    } else {
      return NextResponse.json(
        { error: "No valid filePath or dumpData provided for import" },
        { status: 400 }
      );
    }

    const result = await importDatabaseDump(collectionsToImport, mode);

    return NextResponse.json({
      success: true,
      message: "Database imported and dumped successfully",
      importedCounts: result.importedCounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Import execution failed" },
      { status: 500 }
    );
  }
}
