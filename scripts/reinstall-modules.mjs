/**
 * Rebuild node_modules from scratch. The repair for a damaged pnpm store.
 *
 *     pnpm reinstall           # remove the three node_modules trees, install again
 *     pnpm reinstall --deep    # also prune pnpm's content-addressed store first
 *     pnpm reinstall --dry-run # print what would be removed, touch nothing
 *
 * WHAT THIS FIXES
 *
 * pnpm keeps a virtual store at node_modules/.pnpm and installs by linking into
 * it. `pnpm install` runs "headless" when a lockfile is present: it TRUSTS that
 * the store on disk matches the lockfile and only fills in what it thinks is
 * missing. That assumption is what breaks here — given a store that is
 * inconsistent rather than absent, it tries to create a leaf inside a package
 * directory it never checked the existence of:
 *
 *     ENOENT: no such file or directory, mkdir
 *       '.../node_modules/.pnpm/lodash.defaultsdeep@4.6.1/node_modules'
 *
 * ENOENT on mkdir means the PARENT is gone. Running `pnpm install` again cannot
 * help: an install that assumes a consistent store is the wrong tool for an
 * inconsistent one, and it fails at whatever package it reaches first.
 *
 * HOW A STORE GETS INTO THAT STATE
 *
 * Chiefly an interrupted purge. pnpm removes node_modules when the store or a
 * setting changes, asks for confirmation first, and with no TTY it ABORTS
 * mid-way rather than defaulting:
 *
 *     ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY
 *
 * which is exactly what an unattended update hits. (pnpm-workspace.yaml now sets
 * confirmModulesPurge:false so that cannot happen again — but it does not repair
 * a tree already damaged by it.) A killed install, a full disk, or two pnpm
 * processes racing do the same thing.
 *
 * WHY REMOVE RATHER THAN REPAIR: the only reliable way to make the store match
 * the lockfile is to have no store at all and let pnpm build it. Everything
 * removed here is derived from package.json and the lockfile — nothing here is
 * yours, and nothing is unrecoverable.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const DEEP = argv.includes("--deep");
const DRY = argv.includes("--dry-run");

// Every workspace project, plus the root. Missing ones are skipped, so this is
// also correct on a half-installed tree.
const TARGETS = [
  path.join(ROOT, "node_modules"),
  path.join(ROOT, "backend", "node_modules"),
  path.join(ROOT, "frontend", "node_modules"),
];

function human(bytes) {
  if (bytes > 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes > 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Best-effort size, and deliberately shallow-ish: walking a full node_modules
 * can take longer than the removal it is describing. Capped so a huge tree
 * cannot turn a repair into a stat storm.
 */
function roughSize(dir, budget = { files: 20000 }) {
  let total = 0;
  const stack = [dir];
  while (stack.length && budget.files > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (budget.files-- <= 0) break;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else {
        try {
          total += fs.statSync(full).size;
        } catch {
          /* vanished mid-walk; it is being deleted anyway */
        }
      }
    }
  }
  return total;
}

function run(command, args) {
  console.log(`\n→ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      // pnpm treats CI as "never prompt". Belt and braces alongside
      // confirmModulesPurge in pnpm-workspace.yaml, because THIS script may well
      // be run on an install whose pnpm-workspace.yaml predates that setting —
      // which is precisely the install that needs repairing.
      CI: "true",
    },
  });
  return result.status === 0;
}

console.log("\n  Rebuilding node_modules\n");

const present = TARGETS.filter((dir) => fs.existsSync(dir));

if (!present.length) {
  console.log("  Nothing to remove — no node_modules directories exist yet.");
} else {
  for (const dir of present) {
    const rel = path.relative(ROOT, dir) || ".";
    const size = roughSize(dir);
    if (DRY) {
      console.log(`    would remove  ${rel}  (~${human(size)}+)`);
      continue;
    }
    process.stdout.write(`    removing ${rel} (~${human(size)}+) ... `);
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      console.log("done");
    } catch (error) {
      console.log("FAILED");
      console.error(
        `\n  Could not remove ${rel}: ${error.message}\n` +
          `  Something is holding files open. Stop the platform first:\n` +
          `      pnpm stop\n` +
          `  On Windows, also close any editor or terminal sitting in that folder.\n`
      );
      process.exit(1);
    }
  }
}

if (DRY) {
  console.log(`\n  --dry-run: nothing was removed.${DEEP ? " (--deep would also run `pnpm store prune`)" : ""}\n`);
  process.exit(0);
}

// The content-addressed store lives outside the project and is normally fine —
// it is the LINKS that break, not the content. Pruning it means re-downloading
// everything, so it is opt-in and only worth it when the store itself is
// suspect (a full disk while writing it, for instance).
if (DEEP && !run("pnpm", ["store", "prune"])) {
  console.error("\n  `pnpm store prune` failed. Continuing to the install anyway.\n");
}

if (!run("pnpm", ["install"])) {
  console.error(
    "\n  ✗ install failed.\n" +
      "\n  If it reported ENOSPC or ran out of space, check the disk before retrying:\n" +
      "      df -h .\n" +
      "  A full disk produces exactly this class of half-written store.\n" +
      "  If it failed some other way, retry with:  pnpm reinstall --deep\n"
  );
  process.exit(1);
}

console.log(
  "\n  ✓ node_modules rebuilt.\n" +
    "\n  If you were part-way through an update, continue with:\n" +
    "      pnpm updator\n"
);
