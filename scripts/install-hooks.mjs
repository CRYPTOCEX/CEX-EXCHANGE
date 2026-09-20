#!/usr/bin/env node
/**
 * Point git at the TRACKED hook directory.
 * ============================================================================
 *
 *   pnpm hooks:install
 *
 * Two decisions worth recording, because both look like extra work until the
 * day they are not:
 *
 * 1. `core.hooksPath` -> `scripts/hooks`, rather than copying files into
 *    `.git/hooks` or adding husky. The hook is then version-controlled,
 *    reviewable in a diff, and re-pointed by one command. A copy in .git/hooks
 *    is invisible to everyone but the machine that made it.
 *
 * 2. There is deliberately NO `prepare` script calling this. pnpm runs
 *    `prepare` on every install — including a customer running `pnpm updator`
 *    on an extracted zip with no `.git` directory at all, where it would either
 *    fail the install outright or configure nothing while looking like it
 *    worked.
 *
 * Windows note: Git for Windows runs hooks through its bundled sh.exe, so the
 * `#!/bin/sh` shebang is honoured — but the file also needs the executable bit
 * IN THE INDEX. A Windows checkout has no filesystem exec bit to inherit, so
 * committing the hook without `--chmod=+x` produces a hook git silently never
 * runs. That is what the update-index call below is for.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/*
  EVERY tracked hook, because the exec bit has to be set on each of them
  individually. A hook git cannot execute is a hook that silently never runs, and
  on Windows there is no filesystem exec bit for the index to inherit.
*/
const HOOKS = ["scripts/hooks/pre-push", "scripts/hooks/pre-commit"];

if (!fs.existsSync(path.join(ROOT, ".git"))) {
  console.log("hooks:install: no .git directory here — nothing to configure.");
  console.log("  (expected on a customer install: releases ship without git metadata)");
  process.exit(0);
}

const git = (...args) => spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });

const set = git("config", "core.hooksPath", "scripts/hooks");
if (set.status !== 0) {
  console.error(`hooks:install: git config failed — ${(set.stderr || "").trim()}`);
  process.exit(1);
}

/* Only meaningful once each hook is tracked; on the commit that introduces one,
   the file may not be in the index yet. Not fatal — say so and move on. */
for (const hook of HOOKS) {
  const chmod = git("update-index", "--chmod=+x", hook);
  if (chmod.status !== 0) {
    console.warn(`hooks:install: could not set the exec bit on ${hook}.`);
    console.warn(`  Run this after the file is staged:  git add ${hook} && git update-index --chmod=+x ${hook}`);
    console.warn("  Without it git will not execute the hook on a fresh clone.");
  }
}

console.log(`core.hooksPath = ${(git("config", "--get", "core.hooksPath").stdout || "").trim()}`);
console.log("pre-push  runs `node scripts/gate.mjs --fast`.                  Bypass: GATE_SKIP=1 git push");
console.log("pre-commit runs the staged duplicate-declaration check.           Bypass: HOOK_SKIP=1 git commit");
