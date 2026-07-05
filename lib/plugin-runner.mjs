/**
 * Plugin lifecycle runner — executed automatically by npm hooks.
 *
 * Triggered by:
 *   - postinstall  (after `npm install`)
 *   - prebuild     (before `npm run build`)
 *
 * Three-pass strategy:
 *
 *   Pass 0 — CMS origin sync
 *     Reads CMS_ORIGIN_URL from .env.local (or process.env).
 *     Updates the local git remote "origin" to that URL so every
 *     deploy always tracks the correct upstream.
 *     Silently skipped in non-git environments.
 *
 *   Pass 1 — Pending actions
 *     Calls Express GET /plugin/installed (license-keyed, tenant-scoped).
 *     For each plugin with status "install" | "update":
 *       - Looks up the repo URL from Express GET /plugin/available
 *       - Clones the repo, merges deps, runs npm install
 *       - Calls Express PUT /plugin/installed → sets status "active"
 *     For each plugin with status "delete":
 *       - Removes the plugin folder from disk
 *       - Calls Express DELETE /plugin/installed?id=<id>
 *
 *   Pass 2 — Active-but-missing recovery
 *     Re-clones any "active" plugin whose folder is absent on disk.
 *     Handles fresh deploys / CI environments where the filesystem
 *     is wiped but the tenant DB still holds the previous active state.
 *
 * Written as plain ESM (.mjs) — runs with Node.js directly, no compilation.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Resolve project root ─────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PLUGIN_DIR = path.join(PROJECT_ROOT, "plugin");

// ─── Load .env.local into process.env ────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(PROJECT_ROOT, ".env.local");
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
    }
}

// ─── Express API helpers ──────────────────────────────────────────────────────
function getExpressBase() {
    return (process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000").replace(/\/$/, "");
}

function getLicenseKey() {
    return process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
}

function expressHeaders() {
    return {
        "Content-Type": "application/json",
        "x-license-key": getLicenseKey(),
    };
}

async function expressGet(path) {
    const res = await fetch(`${getExpressBase()}${path}`, { headers: expressHeaders() });
    if (!res.ok) throw new Error(`Express GET ${path} → ${res.status}`);
    return res.json();
}

async function expressPut(path, body) {
    const res = await fetch(`${getExpressBase()}${path}`, {
        method: "PUT",
        headers: expressHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Express PUT ${path} → ${res.status}`);
    return res.json();
}

async function expressDelete(path) {
    const res = await fetch(`${getExpressBase()}${path}`, {
        method: "DELETE",
        headers: expressHeaders(),
    });
    if (!res.ok) throw new Error(`Express DELETE ${path} → ${res.status}`);
    return res.json();
}

// ─── Filesystem helpers ───────────────────────────────────────────────────────
function folderName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function cloneRepo(repoUrl, targetDir) {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    console.log(`[plugin-runner] Cloning ${repoUrl} → ${targetDir}`);
    execSync(`git clone "${repoUrl}" "${targetDir}"`, {
        stdio: "inherit",
        cwd: PROJECT_ROOT,
    });
}

function installPluginDependencies(pluginDir) {
    const pluginPkgPath = path.join(pluginDir, "package.json");
    if (!fs.existsSync(pluginPkgPath)) return;

    let pluginPkg;
    try {
        pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, "utf-8"));
    } catch {
        console.warn(`[plugin-runner] Could not parse ${pluginPkgPath}, skipping deps.`);
        return;
    }

    const mainPkgPath = path.join(PROJECT_ROOT, "package.json");
    const mainPkg = JSON.parse(fs.readFileSync(mainPkgPath, "utf-8"));

    let changed = false;
    for (const depKey of ["dependencies", "devDependencies"]) {
        const pluginDeps = pluginPkg[depKey] ?? {};
        if (!Object.keys(pluginDeps).length) continue;
        if (!mainPkg[depKey]) mainPkg[depKey] = {};
        for (const [pkg, version] of Object.entries(pluginDeps)) {
            if (!mainPkg[depKey][pkg]) {
                mainPkg[depKey][pkg] = version;
                changed = true;
                console.log(`[plugin-runner] Adding ${depKey} "${pkg}": "${version}"`);
            }
        }
    }

    if (changed) {
        fs.writeFileSync(mainPkgPath, JSON.stringify(mainPkg, null, 2) + "\n", "utf-8");
        console.log("[plugin-runner] Running npm install for new dependencies…");
        execSync("npm install", { stdio: "inherit", cwd: PROJECT_ROOT });
    }
}

function removePluginFolder(targetDir) {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`[plugin-runner] Removed ${targetDir}`);
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    loadEnv();

    // ── Pass 0: CMS origin sync ───────────────────────────────────────────────
    // CMS_ORIGIN_URL can be set in .env.local. If absent, this pass is skipped.
    const cmsOriginUrl = process.env.CMS_ORIGIN_URL;
    if (cmsOriginUrl) {
        const gitDir = path.join(PROJECT_ROOT, ".git");
        if (fs.existsSync(gitDir)) {
            try {
                let currentRemote = "";
                try {
                    currentRemote = execSync("git remote get-url origin", {
                        cwd: PROJECT_ROOT,
                        stdio: ["pipe", "pipe", "pipe"],
                    }).toString().trim();
                } catch { /* no remote named "origin" yet */ }

                if (currentRemote !== cmsOriginUrl) {
                    if (currentRemote) {
                        execSync(`git remote set-url origin "${cmsOriginUrl}"`, {
                            cwd: PROJECT_ROOT,
                            stdio: "inherit",
                        });
                        console.log(`[plugin-runner] Pass 0 — updated git remote origin → ${cmsOriginUrl}`);
                    } else {
                        execSync(`git remote add origin "${cmsOriginUrl}"`, {
                            cwd: PROJECT_ROOT,
                            stdio: "inherit",
                        });
                        console.log(`[plugin-runner] Pass 0 — added git remote origin → ${cmsOriginUrl}`);
                    }
                } else {
                    console.log(`[plugin-runner] Pass 0 — git remote origin already correct.`);
                }
            } catch (err) {
                console.warn(`[plugin-runner] Pass 0 — could not update git remote: ${err.message}`);
            }
        } else {
            console.log("[plugin-runner] Pass 0 — no .git directory (zip/Docker deploy), skipping.");
        }
    } else {
        console.log("[plugin-runner] Pass 0 — CMS_ORIGIN_URL not set, skipping remote sync.");
    }

    // ── Check Express is reachable ────────────────────────────────────────────
    const expressBase = getExpressBase();
    const licenseKey = getLicenseKey();

    if (!licenseKey) {
        console.log("[plugin-runner] NEXT_PUBLIC_LICENSE_KEY not set — skipping plugin sync.");
        return;
    }

    try {
        await expressGet("/health");
        console.log(`[plugin-runner] Express reachable at ${expressBase}`);
    } catch {
        console.log(`[plugin-runner] Express not reachable at ${expressBase} — skipping plugin sync.`);
        return;
    }

    // Ensure plugin/ directory exists
    fs.mkdirSync(PLUGIN_DIR, { recursive: true });

    // Build nx → repoUrl map from Express catalog (root DB)
    let catalog;
    try {
        const { plugins: available } = await expressGet("/plugin/available");
        catalog = new Map(available.map((p) => [p.nx, p.path]));
        console.log(`[plugin-runner] Catalog loaded: ${catalog.size} entries`);
    } catch (err) {
        console.error(`[plugin-runner] Failed to load catalog: ${err.message}`);
        return;
    }

    // Get tenant's installed plugins
    let installedPlugins;
    try {
        const { plugins } = await expressGet("/plugin/installed");
        installedPlugins = plugins;
        console.log(`[plugin-runner] Installed plugins loaded: ${installedPlugins.length}`);
    } catch (err) {
        console.error(`[plugin-runner] Failed to load installed plugins: ${err.message}`);
        return;
    }

    // ── Pass 1: pending actions (install / update / delete) ──────────────────
    const pending = installedPlugins.filter((p) =>
        p.status === "install" || p.status === "update" || p.status === "delete"
    );

    if (pending.length > 0) {
        console.log(`[plugin-runner] Pass 1 — ${pending.length} pending action(s)…`);

        for (const plugin of pending) {
            const { _id, nx, name, status } = plugin;
            const folder = folderName(name);
            const targetDir = path.join(PLUGIN_DIR, folder);
            const repoUrl = catalog.get(nx);

            if (!repoUrl && (status === "install" || status === "update")) {
                console.error(`[plugin-runner] No catalog entry for nx="${nx}", skipping.`);
                continue;
            }

            console.log(`\n[plugin-runner] "${name}" (${nx}) | ${status}`);

            try {
                if (status === "install" || status === "inactive" || status === "update") {
                    cloneRepo(repoUrl, targetDir);
                    installPluginDependencies(targetDir);
                    await expressPut("/plugin/installed", { id: _id, status: "active" });
                    console.log(`[plugin-runner] "${name}" → active`);
                } else if (status === "delete") {
                    removePluginFolder(targetDir);
                    await expressDelete(`/plugin/installed?id=${_id}`);
                    console.log(`[plugin-runner] "${name}" → deleted`);
                }
            } catch (err) {
                console.error(`[plugin-runner] Error processing "${name}":`, err.message);
            }
        }
    } else {
        console.log("[plugin-runner] Pass 1 — no pending actions.");
    }

    // ── Pass 2: active-but-missing recovery ───────────────────────────────────
    // Re-fetch to pick up any status changes from Pass 1
    try {
        const { plugins: fresh } = await expressGet("/plugin/installed");
        installedPlugins = fresh;
    } catch { /* keep original list */ }

    const missing = installedPlugins.filter((p) => {
        if (p.status !== "active") return false;
        const targetDir = path.join(PLUGIN_DIR, folderName(p.name));
        return !fs.existsSync(targetDir);
    });

    if (missing.length > 0) {
        console.log(`\n[plugin-runner] Pass 2 — ${missing.length} active plugin(s) missing from disk, restoring…`);

        for (const plugin of missing) {
            const { nx, name } = plugin;
            const targetDir = path.join(PLUGIN_DIR, folderName(name));
            const repoUrl = catalog.get(nx);

            if (!repoUrl) {
                console.warn(`[plugin-runner] No catalog entry for nx="${nx}" — cannot restore "${name}", skipping.`);
                continue;
            }

            console.log(`\n[plugin-runner] Restoring "${name}" (${nx})…`);
            try {
                cloneRepo(repoUrl, targetDir);
                installPluginDependencies(targetDir);
                console.log(`[plugin-runner] "${name}" restored successfully.`);
            } catch (err) {
                console.error(`[plugin-runner] Failed to restore "${name}":`, err.message);
            }
        }
    } else {
        console.log("[plugin-runner] Pass 2 — all active plugins present on disk.");
    }
}

main().catch((err) => {
    console.error("[plugin-runner] Fatal error:", err.message);
    process.exit(1);
});
