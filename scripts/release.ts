#!/usr/bin/env bun
/**
 * Release script: build all packages, publish in dependency order.
 * Idempotent — skips a package if its version already exists on npm.
 *
 * Usage:
 *   bun scripts/release.ts            # publish current versions
 *   VERSION=1.5.0 bun scripts/release.ts   # (optional) override version
 *
 * Packages are published in dependency order: sdk → cli → mcp.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

function readPkg(dir: string): { name: string; version: string } {
  return JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
}

function run(cmd: string, cwd: string): void {
  console.log(`\n$ ${cmd}  (${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function npmVersionExists(name: string, version: string): boolean {
  try {
    const out = execSync(`npm view ${name}@${version} version 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
    return out === version;
  } catch {
    return false;
  }
}

// Step 1: build everything.
run("bun run build", root);

// Step 2: (optional) bump versions if VERSION env var is set.
const versionOverride = process.env.VERSION;
if (versionOverride) {
  for (const dir of ["packages/sdk", "packages/cli", "packages/mcp"]) {
    run(`npm version ${versionOverride} --no-git-tag-version`, join(root, dir));
  }
}

// Step 3: publish each package (sdk → cli → mcp).
const packages = [
  { dir: "packages/sdk", ...readPkg("packages/sdk") },
  { dir: "packages/cli", ...readPkg("packages/cli") },
  { dir: "packages/mcp", ...readPkg("packages/mcp") },
];

// Re-read after optional version bump.
const toPublish = packages.map((p) => ({ dir: p.dir, ...readPkg(p.dir) }));

let anyPublished = false;
for (const pkg of toPublish) {
  if (npmVersionExists(pkg.name, pkg.version)) {
    console.log(`\nSkipping ${pkg.name}@${pkg.version} — already on npm.`);
    continue;
  }
  run("npm publish --access public", join(root, pkg.dir));
  anyPublished = true;
}

if (!anyPublished) {
  console.log("\nAll packages already published — nothing to do.");
  process.exit(0);
}

// Step 4: git tag.
const tagVersion = toPublish[0]?.version ?? "unknown";
try {
  run(`git tag v${tagVersion}`, root);
  run(`git push origin v${tagVersion}`, root);
  console.log(`\nTagged v${tagVersion} and pushed.`);
} catch {
  console.warn(`\nWarning: could not push tag v${tagVersion} — tag it manually if needed.`);
}

console.log("\nRelease complete.");
