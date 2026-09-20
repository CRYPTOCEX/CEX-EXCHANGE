#!/usr/bin/env node
/**
 * AlmaLinux 9 (glibc 2.34) cannot load official uWebSockets.js Linux
 * prebuilds (they need GLIBC 2.38). `pnpm install` / `ensure-deps` restores
 * those prebuilds. Copy our locally-built Node 26 addon back into place.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(__dirname, "uws_linux_x64_147.node.alma9");
const abi = "147";
const destName = `uws_linux_x64_${abi}.node`;

if (!fs.existsSync(src)) process.exit(0);

const buf = fs.readFileSync(src);
const dests = new Set();

function addFromResolve(base) {
  try {
    dests.add(
      path.join(
        path.dirname(require.resolve("uWebSockets.js", { paths: [base] })),
        destName
      )
    );
  } catch {
    /* not installed from this base */
  }
}

addFromResolve(path.join(root, "backend"));
addFromResolve(root);

function walk(dir, depth) {
  if (depth > 12) return;
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of ents) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === ".pnpm-store" || ent.name === ".git") continue;
      walk(p, depth + 1);
    } else if (ent.name === destName) {
      dests.add(p);
    }
  }
}

for (const base of [
  path.join(root, "node_modules"),
  path.join(root, "backend", "node_modules"),
]) {
  if (fs.existsSync(base)) walk(base, 0);
}

let n = 0;
for (const dest of dests) {
  if (dest.includes(`${path.sep}.pnpm-store${path.sep}`)) continue;
  const cur = fs.existsSync(dest) ? fs.readFileSync(dest) : Buffer.alloc(0);
  if (cur.equals(buf)) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  try {
    fs.chmodSync(dest, 0o755);
  } catch {
    /* ignore */
  }
  n++;
}

if (n) {
  console.log(`[uws] patched ${n} AlmaLinux-compatible ${destName}`);
}
