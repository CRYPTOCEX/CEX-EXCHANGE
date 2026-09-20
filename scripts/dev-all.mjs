#!/usr/bin/env node
/**
 * `pnpm dev` — start the three dev processes, each in its own terminal.
 *
 * Production runs three PM2 apps — frontend, backend (CRON_MODE=off) and cron
 * (CRON_MODE=only) — so development runs the same three, or a scheduler bug
 * simply does not exist locally until it reaches a server.
 *
 * `pnpm dev` used to run two of them through `concurrently`, which interleaved
 * their output into one stream. Separate terminals is the point: once the
 * scheduler is its own process, "is the cron process doing this, or the web
 * process?" is most of debugging, and a merged log cannot answer it.
 *
 * The individual scripts still exist for running one at a time:
 *   pnpm dev:frontend · pnpm dev:backend · pnpm dev:cron
 * and `pnpm dev:concurrent` is the old single-terminal interleaved run.
 *
 * Layout, in order of preference:
 *   1. Windows Terminal — one window, three panes, all visible at once.
 *   2. Plain cmd        — three separate windows.
 *   3. macOS / Linux    — Terminal.app / the first terminal emulator found.
 *
 * Flags:
 *   --tabs   Windows Terminal only: tabs instead of panes.
 *   --dry    Print the command that would run and exit. Useful when a terminal
 *            fails to open and you want to see what was attempted.
 */

import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const useTabs = argv.includes("--tabs");
const dryRun = argv.includes("--dry");

/**
 * `pnpm --filter` rather than a cd: it resolves the workspace package from the
 * repo root, so these do not care where the terminal opens.
 *
 * `dev:web` and `dev:cron` set CRON_MODE explicitly instead of relying on the
 * default. Unset means "inline" — one process running both roles — which is the
 * one arrangement that would hide a split-specific bug.
 */
const PROCS = [
  { title: "frontend", color: "#1f6feb", cmd: "pnpm --filter frontend dev" },
  { title: "backend", color: "#238636", cmd: "pnpm --filter backend dev:web" },
  { title: "cron", color: "#9e6a03", cmd: "pnpm --filter backend dev:cron" },
];

function has(bin) {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [bin], { stdio: "ignore" }).status === 0;
}

/**
 * Generate the model types ONCE, here, before any terminal opens.
 *
 * Both backend processes run `nodemon`, and the backend's `predev` hook runs
 * types:generate. Two of them racing on the same output file is a corrupt
 * `types/models.ts` and two confusing failures. Only `dev` has that hook —
 * `dev:web` and `dev:cron` deliberately do not — so it happens here instead,
 * once, with the terminals starting after it has finished.
 */
function prepare() {
  console.log("Generating model types (once, before starting)…");
  const r = spawnSync("pnpm", ["--filter", "backend", "types:generate"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) {
    console.error("\ntypes:generate failed — fix that first; the dev servers would fail the same way.");
    process.exit(r.status ?? 1);
  }
  const s = spawnSync("node", ["backend/scripts/ensure-dev-sentinel.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (s.status !== 0) process.exit(s.status ?? 1);
}

function launchWindowsTerminal() {
  // `-w 0` targets the current window if one is open, so re-running does not
  // scatter panes across several windows.
  const args = ["-w", "0"];
  PROCS.forEach((p, i) => {
    if (i > 0) args.push(";");
    if (i === 0 || useTabs) args.push("new-tab");
    // Split the pane created immediately before this one, which is what keeps
    // the three evenly sized rather than halving the last pane each time.
    else args.push("split-pane", "-V");
    args.push(
      "--title", p.title,
      "--tabColor", p.color,
      "-d", ROOT,
      "cmd", "/k", p.cmd
    );
  });
  return { bin: "wt", args };
}

function launchWindowsCmd() {
  // One `start` per process: `start` returns immediately, so three calls give
  // three independent windows. /k keeps the window open when the process exits,
  // which matters — a dev server that dies on boot must leave its error on
  // screen rather than closing the window that explains why.
  //
  // Passed as ONE STRING with shell:true, not as an argv array. With an array,
  // Node quotes every element to make it a single argument — so the title
  // arrives as ""frontend"" and the command as one over-quoted token, and cmd
  // answers "The filename, directory name, or volume label syntax is
  // incorrect." `start` parses its own command line and has to receive it
  // verbatim.
  //
  // `/D` is start's own working-directory flag, used instead of prefixing
  // `cd /d "..." &&` to the command: it keeps the inner quotes one level
  // shallower, which is the level at which this breaks.
  let failed = 0;
  for (const p of PROCS) {
    const line = `start "${p.title}" /D "${ROOT}" cmd /k "${p.cmd}"`;
    const r = spawnSync(line, { shell: true, stdio: "ignore" });
    if (r.status !== 0 || r.error) {
      failed++;
      console.error(`Could not open a terminal for ${p.title}: ${r.error?.message ?? `exit ${r.status}`}`);
      console.error(`  tried: ${line}`);
    }
  }
  if (failed) {
    console.error(`\n${failed} terminal(s) did not open. Run those commands yourself, one per terminal.`);
  }
  return null;
}

function launchUnix() {
  if (process.platform === "darwin") {
    for (const p of PROCS) {
      const script = `tell application "Terminal" to do script "cd '${ROOT}' && ${p.cmd}"`;
      spawnSync("osascript", ["-e", script], { stdio: "ignore" });
    }
    return null;
  }
  const term = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"].find(has);
  if (!term) {
    console.error(
      "No terminal emulator found. Run these three yourself, one per terminal:\n" +
        PROCS.map((p) => `  ${p.cmd}`).join("\n")
    );
    process.exit(1);
  }
  for (const p of PROCS) {
    const inner = `cd '${ROOT}' && ${p.cmd}; exec $SHELL`;
    const args =
      term === "gnome-terminal"
        ? ["--title", p.title, "--", "bash", "-lc", inner]
        : ["-e", `bash -lc "${inner}"`];
    spawn(term, args, { detached: true, stdio: "ignore" }).unref();
  }
  return null;
}

if (dryRun) {
  console.log(`platform: ${process.platform}, wt: ${process.platform === "win32" ? has("wt") : "n/a"}`);
  for (const p of PROCS) console.log(`  [${p.title}] ${p.cmd}`);
  process.exit(0);
}

prepare();

if (process.platform === "win32") {
  // Windows Terminal is preferred (one window, three panes) but is not present
  // on every machine and parses its own command line. If it is missing OR fails
  // for any reason, drop to plain cmd windows rather than leaving the developer
  // with nothing — the fallback is the arrangement that always works.
  let launched = false;
  if (has("wt")) {
    const plan = launchWindowsTerminal();
    const r = spawnSync(plan.bin, plan.args, { cwd: ROOT, stdio: "ignore" });
    launched = !r.error && r.status === 0;
    if (!launched) {
      console.error("Windows Terminal did not start; falling back to separate cmd windows.");
    }
  }
  if (!launched) launchWindowsCmd();
} else {
  launchUnix();
}

console.log(
  `\nStarted 3 dev processes in separate terminals:\n` +
    PROCS.map((p) => `  ${p.title.padEnd(9)} ${p.cmd}`).join("\n") +
    `\n\n  frontend  http://localhost:3000` +
    `\n  backend   http://localhost:4000   (CRON_MODE=off — serves requests, runs no jobs)` +
    `\n  cron      port 4001               (CRON_MODE=only — runs jobs, serves nothing)` +
    `\n\nThis mirrors production: exactly one process registers cron jobs.` +
    // The two backend windows run the same code and used to print the same
    // banner, which made the split invisible at a glance — say what to look for.
    `\nThe two backend windows identify themselves: a green WEB / API banner vs an amber` +
    `\nCRON / SCHEDULER one, and every log line carries a "WEB"/"CRON" tag.` +
    `\nThey also restart independently — a cron job edit no longer reloads the web tier.\n`
);
