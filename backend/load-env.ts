/**
 * Loads .env before ANY other module is imported.
 *
 * This MUST stay a separate module imported first by index.ts / thread.ts, and
 * must never be inlined back into them as top-level statements. Both entry
 * points used to do this work inline, which was correct under ts-node (tsc
 * emits `require` calls interleaved with statements, in source order) but
 * silently broke under tsx: esbuild hoists every `import` above all top-level
 * statements, so `import { MashServer } from "./src"` — and transitively
 * src/db.ts — ran before the env vars existed, and boot died with
 * "Missing required database environment variables".
 *
 * Import order between modules IS preserved by esbuild, so being the first
 * import is what makes this reliable under both compilers.
 */
import path from "path";
import fs from "fs";

// Prioritise the repo-root .env, then fall back outward.
const envPaths = [
  path.resolve(process.cwd(), ".env"), // Production/Development root .env (PRIORITY)
  path.resolve(__dirname, "../.env"), // Development relative path
  path.resolve(__dirname, ".env"), // Fallback (same directory)
  path.resolve(process.cwd(), "../.env"), // Another fallback
];

/** Absolute path the environment was loaded from, or null if no file was found. */
export let envLoadedFrom: string | null = null;

/** Every path that was probed, for diagnostics when nothing is found. */
export const triedEnvPaths = envPaths;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, quiet: true });
    envLoadedFrom = envPath;
    break;
  }
}

if (!envLoadedFrom) {
  // Fall back to the ambient process environment.
  require("dotenv").config({ quiet: true });
}
