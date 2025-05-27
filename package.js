const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_PACKAGE_PATH = path.resolve(__dirname, 'package.json');
const PLUGINS_DIR = path.resolve(__dirname, 'plugins');
const GIT_JSON_PATH = path.resolve(__dirname, 'git.json');

// Step 1: Clone missing repos
const gitLinks = require(GIT_JSON_PATH);
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR);
}

gitLinks.forEach((url) => {
  const repoName = url.split('/').pop().replace(/\.git$/, '');
  const destPath = path.join(PLUGINS_DIR, repoName);

  if (!fs.existsSync(destPath)) {
    console.log(`⬇️ Cloning ${url} into plugins/${repoName}`);
    try {
      execSync(`git clone ${url} ${destPath}`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`❌ Failed to clone ${url}:`, err.message);
    }
  } else {
    console.log(`✅ Already exists: plugins/${repoName}`);
  }
});

// Step 2: Merge plugin dependencies
const rootPkg = JSON.parse(fs.readFileSync(ROOT_PACKAGE_PATH, 'utf-8'));
rootPkg.dependencies = rootPkg.dependencies || {};
rootPkg.devDependencies = rootPkg.devDependencies || {};

const pluginDirs = fs.readdirSync(PLUGINS_DIR).filter((dir) => {
  const fullPath = path.join(PLUGINS_DIR, dir);
  return fs.statSync(fullPath).isDirectory();
});

for (const dir of pluginDirs) {
  const pluginPkgPath = path.join(PLUGINS_DIR, dir, 'package.json');
  if (fs.existsSync(pluginPkgPath)) {
    const pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf-8'));

    if (pluginPkg.dependencies) {
      for (const [pkg, ver] of Object.entries(pluginPkg.dependencies)) {
        if (!rootPkg.dependencies[pkg]) {
          rootPkg.dependencies[pkg] = ver;
        }
      }
    }

    if (pluginPkg.devDependencies) {
      for (const [pkg, ver] of Object.entries(pluginPkg.devDependencies)) {
        if (!rootPkg.devDependencies[pkg]) {
          rootPkg.devDependencies[pkg] = ver;
        }
      }
    }
  }
}

fs.writeFileSync(ROOT_PACKAGE_PATH, JSON.stringify(rootPkg, null, 2));
console.log("✅ Plugin dependencies merged into root package.json");