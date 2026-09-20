/**
 * Copy non-TypeScript assets from `src/` to `dist/` after `tsc` runs.
 *
 * `tsc` only emits compiled JS for .ts/.js inputs — anything else (PHP plugin
 * archives, .ejs email templates, .json fixtures, .txt files, ...) gets left
 * behind in `src/` and never reaches production. Without this step the
 * Gateway "download integration plugin" endpoint can't find its plugin tree
 * under `dist/` and falls back to "Integration plugins directory is missing
 * from the deployment."
 *
 * Add new asset roots to ASSET_DIRS below. Each entry is copied wholesale
 * (everything that isn't .ts/.tsx) to the matching path inside `dist/`.
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "..");

const SRC_ROOT = path.join(BACKEND_ROOT, "src");
const DIST_SRC_ROOT = path.join(BACKEND_ROOT, "dist", "src");

// Source-relative roots whose non-TS contents need to ship with `dist`.
// Paths are interpreted relative to `backend/src/`.
const ASSET_DIRS = [
  "api/(ext)/gateway/integration/plugins",
  // Forex A-book operator runbook (+ README): served in-product by
  // admin/forex-trading/execution/runbook/index.get.ts, whose first
  // (__dirname-relative) candidate must resolve inside dist/src too.
  "api/(ext)/forex-trading",
];

// Files/extensions tsc would have already emitted — skip them so we don't
// clobber compiled output with raw sources.
const SKIP_EXTENSIONS = new Set([".ts", ".tsx"]);

let filesCopied = 0;
let dirsTouched = 0;

/** Where `p` really is, or null if it is not there. */
async function realOrNull(p) {
  try {
    return path.resolve(await fs.realpath(p));
  } catch {
    return null;
  }
}

async function copyAssetDir(relPath) {
  const src = path.join(SRC_ROOT, relPath);
  const dest = path.join(DIST_SRC_ROOT, relPath);

  if (!(await fs.pathExists(src))) {
    console.warn(`[copy-static-assets] Skipping missing source: ${relPath}`);
    return;
  }

  /*
   * ALREADY IN PLACE IS THE SUCCESS CASE, NOT AN ERROR.
   *
   * A distribution install ships `dist/` and no `src/` — the sources are not
   * in the release at all. Operators who want `backend/src` to exist anyway
   * point it at the compiled tree (`src -> dist/src`), which makes both sides
   * of this copy the SAME directory. fs-extra then refuses with "Source and
   * destination must not be the same" and the non-zero exit takes down the
   * whole `pnpm build` — on a step whose work was already done.
   *
   * Compared by resolved path rather than by inode: `fs.stat().ino` is not
   * meaningful on Windows, where this also runs.
   */
  const [realSrc, realDest] = await Promise.all([realOrNull(src), realOrNull(dest)]);
  if (realSrc && realDest && realSrc === realDest) {
    console.log(
      `[copy-static-assets] ${relPath}: source and destination are the same directory; already in place.`
    );
    return;
  }

  await fs.ensureDir(dest);
  dirsTouched++;

  await fs.copy(src, dest, {
    overwrite: true,
    errorOnExist: false,
    filter: (srcPath) => {
      const ext = path.extname(srcPath).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) return false;
      return true;
    },
  });

  // fs-extra doesn't give us a copied-file count; do a quick walk to report it.
  const entries = await walk(dest);
  filesCopied += entries.length;
  console.log(`[copy-static-assets] Copied ${entries.length} file(s) → ${path.relative(BACKEND_ROOT, dest)}`);
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

(async () => {
  if (!(await fs.pathExists(DIST_SRC_ROOT))) {
    console.warn(
      `[copy-static-assets] dist/ not found at ${DIST_SRC_ROOT}; nothing to do. Run \`npm run build\` first.`
    );
    return;
  }

  for (const rel of ASSET_DIRS) {
    await copyAssetDir(rel);
  }

  console.log(
    `[copy-static-assets] Done. ${filesCopied} file(s) across ${dirsTouched} asset root(s).`
  );
})().catch((err) => {
  console.error("[copy-static-assets] Failed:", err);
  process.exitCode = 1;
});
