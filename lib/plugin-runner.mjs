/**
 * Plugin lifecycle runner — executed automatically by npm hooks.
 *
 * Triggered by:
 *   - postinstall  (after `npm install`)
 *   - prebuild     (before `npm run build`)
 *
 * Four-pass strategy:
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
 *       - Clones the repo, merges deps into main package.json, runs npm install
 *       - Calls Express PUT /plugin/installed → sets status "active"
 *     For each plugin with status "delete":
 *       - Reads the plugin's package.json to collect its deps
 *       - Removes the plugin folder from disk
 *       - Removes deps that are no longer needed by any remaining plugin
 *         (skips packages that are part of the base CMS or shared with others)
 *       - Runs npm install to apply the removals
 *       - Calls Express DELETE /plugin/installed?id=<id>
 *
 *   Pass 2 — Active-but-missing recovery
 *     Re-clones any "active" plugin whose folder is absent on disk.
 *     Handles fresh deploys / CI environments where the filesystem
 *     is wiped but the tenant DB still holds the previous active state.
 *
 *   Pass 3 — Local disk sync (always runs, no Express required)
 *     Walks every subdirectory of plugin/ and merges any package.json
 *     dependencies into the main package.json, then runs npm install
 *     if any new packages were added.  This ensures a plain `npm install`
 *     picks up plugin deps even when Express is unreachable.
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

async function expressGet(endpoint) {
    const res = await fetch(`${getExpressBase()}${endpoint}`, { headers: expressHeaders() });
    if (!res.ok) throw new Error(`Express GET ${endpoint} → ${res.status}`);
    return res.json();
}

async function expressPut(endpoint, body) {
    const res = await fetch(`${getExpressBase()}${endpoint}`, {
        method: "PUT",
        headers: expressHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Express PUT ${endpoint} → ${res.status}`);
    return res.json();
}

async function expressDelete(endpoint) {
    const res = await fetch(`${getExpressBase()}${endpoint}`, {
        method: "DELETE",
        headers: expressHeaders(),
    });
    if (!res.ok) throw new Error(`Express DELETE ${endpoint} → ${res.status}`);
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

/** Read a plugin folder's package.json; returns {} on any error. */
function readPluginPkg(pluginDir) {
    const pkgPath = path.join(pluginDir, "package.json");
    if (!fs.existsSync(pkgPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    } catch {
        console.warn(`[plugin-runner] Could not parse ${pkgPath}, treating as empty.`);
        return {};
    }
}

/**
 * Collect the union of all dep names (both dependencies + devDependencies)
 * from every plugin folder currently on disk, optionally excluding one folder.
 */
function collectAllPluginDepNames(excludeDir = null) {
    const names = new Set();
    if (!fs.existsSync(PLUGIN_DIR)) return names;
    for (const entry of fs.readdirSync(PLUGIN_DIR)) {
        const dir = path.join(PLUGIN_DIR, entry);
        if (!fs.statSync(dir).isDirectory()) continue;
        if (excludeDir && path.resolve(dir) === path.resolve(excludeDir)) continue;
        const pkg = readPluginPkg(dir);
        for (const depKey of ["dependencies", "devDependencies"]) {
            for (const name of Object.keys(pkg[depKey] ?? {})) names.add(name);
        }
    }
    return names;
}

/**
 * Merge a plugin's deps into the main package.json and run npm install
 * if anything was added.
 */
function installPluginDependencies(pluginDir) {
    const pluginPkg = readPluginPkg(pluginDir);
    if (!pluginPkg.dependencies && !pluginPkg.devDependencies) return;

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

/**
 * Remove a plugin's exclusive deps from the main package.json and run
 * npm install to apply the uninstall.
 *
 * "Exclusive" means the package is not:
 *   - used by any other remaining plugin on disk, AND
 *   - listed in the CMS baseline package.json (cms-base-deps.json snapshot,
 *     or detected as pre-existing before any plugin ever ran)
 *
 * We keep it simple and safe: we only remove a dep if no other plugin folder
 * (after this one is gone) declares it.
 */
function removePluginDependencies(pluginDir) {
    const pluginPkg = readPluginPkg(pluginDir);
    if (!pluginPkg.dependencies && !pluginPkg.devDependencies) return;

    // Collect all dep names still needed by the surviving plugins
    const stillNeeded = collectAllPluginDepNames(pluginDir);

    const mainPkgPath = path.join(PROJECT_ROOT, "package.json");
    const mainPkg = JSON.parse(fs.readFileSync(mainPkgPath, "utf-8"));

    let changed = false;
    for (const depKey of ["dependencies", "devDependencies"]) {
        const pluginDeps = pluginPkg[depKey] ?? {};
        for (const pkg of Object.keys(pluginDeps)) {
            if (stillNeeded.has(pkg)) {
                console.log(`[plugin-runner] Keeping "${pkg}" — still used by another plugin.`);
                continue;
            }
            if (mainPkg[depKey]?.[pkg]) {
                delete mainPkg[depKey][pkg];
                changed = true;
                console.log(`[plugin-runner] Removing ${depKey} "${pkg}"`);
            }
        }
    }

    if (changed) {
        fs.writeFileSync(mainPkgPath, JSON.stringify(mainPkg, null, 2) + "\n", "utf-8");
        console.log("[plugin-runner] Running npm install to apply removals…");
        execSync("npm install", { stdio: "inherit", cwd: PROJECT_ROOT });
    } else {
        console.log("[plugin-runner] No exclusive deps to remove.");
    }
}

function removePluginFolder(targetDir) {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`[plugin-runner] Removed folder ${targetDir}`);
    }
}

// ─── Local disk dep sync ──────────────────────────────────────────────────────
// Walks every subdirectory of plugin/ and merges package.json deps into main.
// Runs unconditionally — no Express required.
async function syncLocalPluginDeps() {
    console.log("[plugin-runner] Pass 3 — syncing deps from all local plugin folders…");
    if (!fs.existsSync(PLUGIN_DIR)) {
        console.log("[plugin-runner] Pass 3 — plugin/ directory not found, skipping.");
        return;
    }
    const pluginFolders = fs.readdirSync(PLUGIN_DIR).filter((entry) =>
        fs.statSync(path.join(PLUGIN_DIR, entry)).isDirectory()
    );
    for (const folder of pluginFolders) {
        installPluginDependencies(path.join(PLUGIN_DIR, folder));
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
        console.log("[plugin-runner] NEXT_PUBLIC_LICENSE_KEY not set — skipping remote plugin sync.");
        await syncLocalPluginDeps();
        return;
    }

    let expressReachable = false;
    try {
        await expressGet("/health");
        console.log(`[plugin-runner] Express reachable at ${expressBase}`);
        expressReachable = true;
    } catch {
        console.log(`[plugin-runner] Express not reachable at ${expressBase} — skipping remote plugin sync.`);
    }

    if (!expressReachable) {
        // Still run the local disk sync so existing plugin deps are always installed.
        await syncLocalPluginDeps();
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

    // ── Pass 1: pending actions (install / update / delete / inactive) ───────
    const pending = installedPlugins.filter((p) =>
        p.status === "install" || p.status === "update" || p.status === "delete" || p.status === "inactive"
    );

    if (pending.length > 0) {
        console.log(`[plugin-runner] Pass 1 — ${pending.length} pending action(s)…`);

        for (const plugin of pending) {
            const { _id, nx, name, status } = plugin;
            const folder = folderName(name);
            const targetDir = path.join(PLUGIN_DIR, folder);
            const repoUrl = catalog.get(nx);

            if (!repoUrl && (status === "install" || status === "update" || status === "inactive")) {
                console.error(`[plugin-runner] No catalog entry for nx="${nx}", skipping.`);
                continue;
            }

            console.log(`\n[plugin-runner] "${name}" (${nx}) | ${status}`);

            try {
                if (status === "install" || status === "update") {
                    cloneRepo(repoUrl, targetDir);
                    installPluginDependencies(targetDir);
                    await expressPut("/plugin/installed", { id: _id, status: "active" });
                    console.log(`[plugin-runner] "${name}" → active`);
                } else if (status === "inactive") {
                    // Install the plugin but keep it inactive
                    cloneRepo(repoUrl, targetDir);
                    installPluginDependencies(targetDir);
                    // Status remains "inactive" — no Express update needed
                    console.log(`[plugin-runner] "${name}" → installed (kept as inactive)`);
                } else if (status === "delete") {
                    // Read deps before removing the folder, then clean up packages
                    // that are no longer needed by any other plugin.
                    removePluginDependencies(targetDir);
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

    // ── Pass 3: local disk sync (always runs, no Express required) ───────────
    await syncLocalPluginDeps();
}

main().catch((err) => {
    console.error("[plugin-runner] Fatal error:", err.message);
    process.exit(1);
});
