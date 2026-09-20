/**
 * Creates the dev restart sentinels if they are missing.
 *
 * The in-process hot-reloader (src/utils/dev/hot-reload.ts) asks for a full
 * restart by writing to one of these files, and the matching nodemon config
 * watches it. nodemon resolves its watch list once at startup and silently
 * DROPS entries that do not exist on disk — so if a file is absent when the dev
 * server starts, nothing is watching it and every "this change is not safe to
 * hot-swap" decision would quietly do nothing.
 *
 * THERE IS ONE PER ROLE, and all three are created unconditionally.
 *
 *   dev-restart.json        `pnpm --filter backend dev`      (CRON_MODE inline)
 *   dev-restart.web.json    `pnpm --filter backend dev:web`  (CRON_MODE=off)
 *   dev-restart.cron.json   `pnpm --filter backend dev:cron` (CRON_MODE=only)
 *
 * Two processes watching ONE sentinel is what made every unsafe edit restart
 * both of them; see src/utils/dev/restart-scope.ts. They are created together
 * rather than on demand because this script runs before any of them starts, and
 * it does not know which shape the developer is about to use — `pnpm dev` starts
 * two of the three, and a missing file is a silent failure rather than a loud
 * one.
 *
 * The files are gitignored, so a fresh clone always needs this. Runs from
 * `predev`, and from scripts/dev-all.mjs before it opens any terminal.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const backendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const SENTINELS = [
  ["dev-restart.json", "inline"],
  ["dev-restart.web.json", "web"],
  ["dev-restart.cron.json", "cron"],
];

const created = [];
for (const [name, role] of SENTINELS) {
  const sentinel = path.join(backendRoot, name);
  if (fs.existsSync(sentinel)) continue;
  fs.writeFileSync(
    sentinel,
    `${JSON.stringify(
      {
        note:
          `Touched by the dev hot-reloader to request a full restart of the ${role} backend ` +
          `process. Safe to delete.`,
        role,
        requestedAt: null,
        reason: null,
      },
      null,
      2
    )}\n`
  );
  created.push(name);
}

if (created.length) {
  console.log(`Created backend/${created.join(", backend/")} (hot-reload restart sentinels)`);
}
