/**
 * The SERVER's chunk reader: `public/i18n` off the local disk.
 *
 * ---------------------------------------------------------------------------
 * THIS MODULE MUST NEVER BE REACHED FROM A `"use client"` FILE.
 * ---------------------------------------------------------------------------
 * It is the only place in the i18n system that imports `node:fs/promises`, and
 * that import is the entire reason it is a separate file. Put it in `loader.ts`
 * and it travels into the client bundle with every client component that asks
 * for a translation, and the client build fails to resolve it. Isolated here,
 * the invariant is one line long and checkable: nothing under a `"use client"`
 * directive may import this module, `i18n/server.ts`, or `next-intl/server`.
 *
 * Importing it for its side effect is the intended use:
 *
 *   import "./loader-fs.server";
 *
 * `i18n/server.ts` does exactly that, so any server caller reaching the loaders
 * through `@/i18n/server` (or through the `next-intl/server` alias) has the
 * reader installed before it runs.
 *
 * ---------------------------------------------------------------------------
 * WHY DISK AND NOT `fetch`
 * ---------------------------------------------------------------------------
 * The long note above `registerChunkReader` in `loader.ts` has the history. The
 * short version: `fetch("/i18n/core.en.json")` has no origin to resolve against
 * on the server and throws, the throw was swallowed, and the server quietly
 * loaded the entire 1.45 MB catalogue on every request instead. The file is on
 * this machine's own disk; reading it is a `readFile`, not a round-trip through
 * the app's own public URL — which the process does not reliably know anyway
 * behind a proxy, in a container, or on a customer's self-hosted box.
 *
 * ---------------------------------------------------------------------------
 * WHY EVERY PATH BELOW CARRIES `turbopackIgnore`
 * ---------------------------------------------------------------------------
 * Turbopack statically analyses server modules for filesystem access and traces
 * whatever it decides they might open into the route's file trace. Left alone it
 * resolves `path.join(process.cwd(), "public", "i18n")` to a real directory,
 * sees a `readFile` of a name it cannot pin down, and concludes that the whole
 * of `public/i18n` belongs in the server output — and once the directory itself
 * is a variable (`resolvedDir`), that the whole project does. Measured on this
 * repo: five build warnings, one dir pattern matching 48,512 files and two
 * matching 339,466. `public/i18n` is legitimately that big (504 routes × 90
 * locales, plus menus and cores); it is not rot, so the count will not shrink.
 *
 * The trace is wrong on the facts. `public/` is read off disk by the running
 * server and is never bundled, and this app does not set `output: "standalone"`,
 * so nothing here consumes the trace. The comments are Next's own documented
 * opt-out for exactly this shape — its `image-optimizer` and
 * `load-manifest.external` mark their cache reads the same way — and they change
 * nothing at runtime: the same reads still happen off the same paths, and the
 * chunks still ship, as part of `public/`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { registerChunkReader, type ChunkReader } from "./loader";

/*
 * Where `public/i18n` is, relative to the process.
 *
 * `next start` runs from `frontend/`, and this project does not use
 * `output: "standalone"`, so the first candidate is the real one today. The
 * second exists because pm2 is sometimes started a tier up, from the repo root,
 * and a wrong cwd would otherwise turn every chunk read into a silent miss.
 *
 * Both candidates are tried on the FIRST read and the winner is remembered; a
 * miss on both leaves `resolvedDir` null and the reader returns null, which the
 * loader degrades from by falling back to `loadAllNamespaces`. A wrong cwd
 * therefore costs payload size, never correctness.
 */
const CANDIDATE_DIRS = [
  path.join(/* turbopackIgnore: true */ process.cwd(), "public", "i18n"),
  path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "frontend",
    "public",
    "i18n"
  ),
];

let resolvedDir: string | null = null;

/*
 * A chunk name arrives from `routes.json` and from the loader's own filename
 * builders, never from a user, but it ends up in a path join — so it is checked
 * anyway. Anything with a separator or a `..` in it is not a chunk name.
 */
function isSafeChunkName(name: string): boolean {
  return /^[A-Za-z0-9._-]+\.json$/.test(name) && !name.includes("..");
}

const diskChunkReader: ChunkReader = async (name) => {
  if (!isSafeChunkName(name)) return null;

  if (resolvedDir) {
    return readJson(path.join(/* turbopackIgnore: true */ resolvedDir, name));
  }

  for (const dir of CANDIDATE_DIRS) {
    const parsed = await readJson(
      path.join(/* turbopackIgnore: true */ dir, name)
    );
    if (parsed !== null) {
      resolvedDir = dir;
      return parsed;
    }
  }

  return null;
};

async function readJson(filePath: string): Promise<unknown | null> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ filePath, "utf-8");
    return JSON.parse(raw) as unknown;
  } catch {
    // Missing file, unreadable file, or truncated JSON. All three mean the same
    // thing to the caller — no usable chunk — and all three are recoverable.
    return null;
  }
}

registerChunkReader(diskChunkReader);

export {};
