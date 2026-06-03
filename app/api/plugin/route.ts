import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import connectDB from "@/lib/mongodb";
import Plugin from "@/models/plugin";
import { NextResponse } from "next/server";

// ─── Helpers (server-only, no TS path aliases needed) ────────────────────────

const PROJECT_ROOT = path.resolve(process.cwd());
const PLUGIN_DIR = path.join(PROJECT_ROOT, "plugin");

function folderName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function cloneRepo(repoUrl: string, targetDir: string): void {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    execSync(`git clone "${repoUrl}" "${targetDir}"`, {
        stdio: "inherit",
        cwd: PROJECT_ROOT,
    });
}

function installPluginDependencies(pluginDir: string): void {
    const pluginPkgPath = path.join(pluginDir, "package.json");
    if (!fs.existsSync(pluginPkgPath)) return;

    let pluginPkg: Record<string, any>;
    try {
        pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, "utf-8"));
    } catch {
        console.warn(`[plugin] Could not parse ${pluginPkgPath}, skipping deps.`);
        return;
    }

    const mainPkgPath = path.join(PROJECT_ROOT, "package.json");
    const mainPkg: Record<string, any> = JSON.parse(fs.readFileSync(mainPkgPath, "utf-8"));

    let changed = false;
    for (const depKey of ["dependencies", "devDependencies"] as const) {
        const pluginDeps: Record<string, string> = pluginPkg[depKey] ?? {};
        if (!Object.keys(pluginDeps).length) continue;
        if (!mainPkg[depKey]) mainPkg[depKey] = {};
        for (const [pkg, version] of Object.entries(pluginDeps)) {
            if (!mainPkg[depKey][pkg]) {
                mainPkg[depKey][pkg] = version;
                changed = true;
                console.log(`[plugin] Adding ${depKey} "${pkg}": "${version}"`);
            }
        }
    }

    if (changed) {
        fs.writeFileSync(mainPkgPath, JSON.stringify(mainPkg, null, 2) + "\n", "utf-8");
        console.log("[plugin] Running npm install for new dependencies…");
        execSync("npm install", { stdio: "inherit", cwd: PROJECT_ROOT });
    }
}

function removePluginFolder(targetDir: string): void {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`[plugin] Removed folder: ${targetDir}`);
    }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function GET() {
    await connectDB();
    const plugins = await Plugin.find({}).lean();
    return NextResponse.json(plugins);
}

export async function POST(req: Request) {
    try {
        await connectDB();
        const { nx, name, version, icon, color, status } = await req.json();

        // Caller may pass an explicit status ("install", "update", etc.).
        // Fall back to "active" for backwards-compatibility.
        const resolvedStatus = status ?? "active";

        const existing = await Plugin.findOne({ nx });
        if (existing) {
            existing.name = name;
            existing.version = version;
            existing.icon = icon;
            existing.color = color;
            existing.status = resolvedStatus;
            await existing.save();
        } else {
            await Plugin.create({ nx, name, version, icon, color, status: resolvedStatus });
        }
        return NextResponse.json({ success: true, status: resolvedStatus });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save plugin" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        await connectDB();
        const { id, status } = await req.json();

        // ── inactive: do nothing ──────────────────────────────────────────
        if (status === "inactive") {
            await Plugin.findByIdAndUpdate(id, { status });
            return NextResponse.json({ success: true });
        }

        // ── install / update: clone repo, install deps, set active ────────
        if (status === "install" || status === "update") {
            const plugin = await Plugin.findById(id);
            if (!plugin) {
                return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
            }

            // Load catalog dynamically at runtime to avoid Turbopack tracing
            // Use require with @ alias - Turbopack will ignore this when webpackIgnore is set
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { AVAILABLE_PLUGINS } = require("@/data/plugin") as typeof import("@/data/plugin");
            const repoUrl = AVAILABLE_PLUGINS.find((p) => p.nx === plugin.nx)?.path;
            if (!repoUrl) {
                return NextResponse.json(
                    { error: `Plugin "${plugin.nx}" not found in store catalog` },
                    { status: 400 }
                );
            }

            const targetDir = path.join(PLUGIN_DIR, folderName(plugin.name));
            cloneRepo(repoUrl, targetDir);
            installPluginDependencies(targetDir);

            plugin.status = "active";
            await plugin.save();
            return NextResponse.json({ success: true, status: "active" });
        }

        // ── delete: remove folder and delete DB record entirely ───────────
        if (status === "delete") {
            const plugin = await Plugin.findById(id);
            if (!plugin) {
                return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
            }

            const targetDir = path.join(PLUGIN_DIR, folderName(plugin.name));
            removePluginFolder(targetDir);
            await Plugin.findByIdAndDelete(id);
            return NextResponse.json({ success: true, status: "deleted" });
        }

        // ── active: simple status update ──────────────────────────────────
        await Plugin.findByIdAndUpdate(id, { status });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[api/plugin PUT]", error);
        return NextResponse.json(
            { error: error?.message ?? "Failed to update plugin" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (id) {
            await Plugin.findByIdAndDelete(id);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete plugin" }, { status: 500 });
    }
}
