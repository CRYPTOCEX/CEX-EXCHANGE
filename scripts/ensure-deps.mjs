/**
 * Install dependencies, then PROVE they are actually usable — and repair them if
 * they are not. This is the install step of `pnpm updator`.
 *
 * WHY `pnpm install` ALONE IS NOT ENOUGH
 *
 * pnpm skips a workspace project whose node_modules already exists and whose
 * manifest has not changed. That is normally right, and it is wrong in exactly
 * the case an update creates: when RESOLUTION changes, pnpm rebuilds the root
 * store and the .pnpm directory, but leaves `backend/node_modules` and
 * `frontend/node_modules` in place — and their links now point into store paths
 * that were just replaced.
 *
 * A dangling link is not an empty directory. It looks present and fails at
 * require() time, so the backend dies with
 *
 *     Error: Cannot find module 'bullmq'
 *
 * and Node reports only the FIRST one it reaches. Fix that package, restart, hit
 * the next: `module-alias`, then `dotenv`, then `bullmq`. Each round is a PM2
 * crash-loop, and none of the messages says "your install is incomplete".
 *
 * The 6.5.8 upgrade triggers this by design: the dependency pins move out of
 * package.json's `pnpm` field (which pnpm 10 ignores) into pnpm-workspace.yaml,
 * so pins that were silently dead become live and the resolved tree genuinely
 * changes.
 *
 * WHAT THIS DOES INSTEAD
 *
 *   1. `pnpm install` — the normal, fast path. Almost always sufficient.
 *      If it FAILS, recover from it rather than giving up (installWithRecovery).
 *   2. Verify every declared dependency actually RESOLVES from each workspace
 *      project, which is the thing `pnpm install`'s own success does not tell us.
 *   3. If any do not, rebuild the affected projects and verify again.
 *   4. If it still fails, rebuild all three trees together.
 *   5. If it STILL fails, stop the update with the reason — never let a
 *      half-installed tree reach a schema migration.
 *
 * So the expensive repair happens only when it is needed, and the operator runs
 * one command either way.
 *
 * WHY A FAILED INSTALL IS NOT THE END
 *
 * Every one of those repair steps used to be unreachable in the case that needed
 * them most. The first `pnpm install` was fatal, so any non-zero exit ended the
 * update immediately and none of the ladder below ever ran. On a real install
 * that looked like:
 *
 *     Recreating /home/demo/public_html/node_modules
 *      ENOTEMPTY  ENOTEMPTY: directory not empty, rmdir '.../node_modules/.pnpm'
 *     [deps] pnpm install failed with exit code 217.
 *
 * — pnpm replacing a modules directory built under different settings (which
 * this release genuinely causes; see the pins note above), failing partway
 * through its own removal, and leaving a half-deleted tree, a site on the
 * maintenance page, and no instruction beyond the error text.
 *
 * A failed install is now classified and answered: retried once, then repaired
 * by removing what pnpm could not, and escalated only as far as it has to go.
 * The one failure it will NOT delete anything for is an unreachable registry —
 * there, the tree on disk is the only copy of the dependencies and the network
 * is the only way to replace it, so removing it converts "retry in a minute"
 * into a site that cannot start.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
import { spawn, spawnSync } from "child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every workspace project, INCLUDING the root.
 *
 * The root was missing and it is not a passive container: `pnpm updator` runs
 * four of its scripts, and its own `dependencies` are what the lifecycle and
 * migration scripts import. An audit that skipped it could report a healthy
 * install while the tree that drives the update was the broken one.
 */
const PROJECTS = [".", "backend", "frontend"];

/**
 * EVERY declared runtime dependency of a project — read from its package.json,
 * not from a list kept here.
 *
 * This started as a hand-picked set of seven "boot-critical" packages, and that
 * was wrong in the way hand-picked sets are always wrong: backend declares 76
 * dependencies and frontend 108, so the audit passed while any of the other 177
 * could be missing. In practice it reported a healthy install and the update
 * then died one package at a time — module-alias, dotenv, bullmq, sequelize-cli,
 * ccxt — each a separate run, each looking like a new bug.
 *
 * Reading the manifest cannot drift and cannot miss one. 184 require.resolve
 * calls cost milliseconds, which is nothing against re-running a failed update.
 */
function declaredDependencies(project) {
  const manifest = path.join(ROOT, project, "package.json");
  if (!fs.existsSync(manifest)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    return Object.keys(pkg.dependencies || {});
  } catch (error) {
    console.error(`[deps] could not read ${project}/package.json: ${error.message}`);
    return [];
  }
}

/**
 * Packages that legitimately do not install on this machine.
 *
 * Optional native binaries are published per platform and pnpm installs only the
 * matching one, so demanding all of them would fail every install on every OS.
 * Matched by the platform tuples npm uses in these package names.
 */
const PLATFORM_SPECIFIC =
  /(win32|darwin|linux|android|freebsd)[-.]|[-.](x64|arm64|ia32|arm)([-.]|$)|musl|msvc/i;

/**
 * THE SCRIPTS the update chain runs, per project. The executables it needs are
 * DERIVED from them — see requiredBinsFor.
 *
 * Checked separately from the packages above because an executable is a
 * different thing and fails differently. `require.resolve("sequelize-cli")` can
 * succeed while `node_modules/.bin/sequelize-cli` is missing — the package is
 * linked, the BIN symlink is not — and `pnpm run seed` only cares about the
 * second:
 *
 *     sh: 1: sequelize-cli: not found
 *     ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  backend@ seed
 *
 * Verifying only module resolution reported a healthy install and then let the
 * update die two steps later, at the seed — after the schema had already been
 * migrated, which is the worst place to stop.
 *
 * This used to be a hand-written list of bins: `sequelize-cli` for the backend,
 * `next` for the frontend. It made exactly the mistake this file's header
 * describes one paragraph earlier, one level down, and it failed the same way:
 *
 *     sh: 1: cross-env: not found
 *      ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  frontend@ build
 *
 * `cross-env` was in the frontend's build script and in nobody's list, so the
 * audit reported a healthy install and the update died at the LAST step — after
 * the schema had been migrated and seeded.
 *
 * Naming the SCRIPTS instead is stable in the way the old list was not: which
 * commands `pnpm updator` runs changes about once a year, while the tools inside
 * them change whenever anyone edits a script. Deriving the volatile half means
 * adding a tool to a build script cannot silently escape the check.
 */
const UPDATE_CHAIN_SCRIPTS = {
  ".": ["updator:migrate", "seed", "build:frontend", "start"],
  backend: ["seed"],
  frontend: ["build", "build:i18n"],
};

/**
 * Commands that are not project-local executables and must not be demanded from
 * `node_modules/.bin`.
 *
 * `pnpm` and `pm2` are installed globally (the update instructions say so), and
 * `node` is the interpreter running this file. Shell builtins are not programs
 * at all.
 */
const NOT_A_LOCAL_BIN = new Set([
  "node", "npm", "pnpm", "npx", "yarn", "pm2",
  "cd", "echo", "set", "export", "if", "then", "else", "fi", "for", "do", "done", "exit",
]);

/**
 * Commands that RUN ANOTHER COMMAND, so the executable that matters is further
 * along the line.
 *
 * `cross-env NODE_OPTIONS=… next build` needs `next`, not `cross-env` alone, and
 * stopping at the first token would check only half of what the script depends
 * on. Both are recorded: `cross-env` is itself a local executable, and the
 * command it wraps is the one the build actually runs.
 */
function delegatesTo(tokens, index) {
  if (tokens[index] === "cross-env") return index + 1;
  return -1;
}

/** KEY=VALUE, the shape of an inline environment assignment. */
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * A token that could plausibly be the name of an executable.
 *
 * Without this, fragments of an inline program are read as commands. The
 * backend's `clean` script is `node -e "const fs=require('fs');const p=…"`, and
 * a naive split produced "const", "if(fs.existsSync(d)){fs.rmSync(…" and
 * "console.log('Cleaned" as things to look for in `.bin`. Harmless in a report;
 * NOT harmless here, where a name nothing declares now stops the update with
 * "the release asks for a tool that nothing installs".
 */
const PLAUSIBLE_BIN = /^@?[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9._-]+)?$/;

/**
 * Split a script on shell operators, IGNORING ones inside quotes or brackets.
 *
 * Two real scripts in this repo break a naive split, and both are the same
 * mistake — treating text that a shell would never look at as shell syntax:
 *
 *   `node -e "…const d=p.join(…);if(fs.existsSync(d)){…}"`  — semicolons in JS
 *   `jest --testPathPatterns=forex-trading/(a|b|c)`          — a pipe in a regex
 *
 * Tracking quote state and bracket depth is enough for both, and for anything
 * else this repo is likely to contain. It is not a shell parser and does not
 * need to be: the worst case of not understanding a line is a check that is
 * skipped, which is how it behaved before any of this existed.
 */
function splitCommands(script) {
  const parts = [];
  let current = "";
  let quote = null;
  let depth = 0;
  for (let i = 0; i < script.length; i++) {
    const ch = script[i];
    if (quote) {
      current += ch;
      if (ch === quote && script[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    if (depth === 0) {
      if (ch === "&" && script[i + 1] === "&") { parts.push(current); current = ""; i++; continue; }
      if (ch === "|" && script[i + 1] === "|") { parts.push(current); current = ""; i++; continue; }
      if (ch === ";" || ch === "|") { parts.push(current); current = ""; continue; }
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

/**
 * Every project-local executable a script actually invokes.
 *
 * Deliberately simple parsing: split the line on shell operators, walk the
 * tokens of each part past any environment assignments, follow one level of
 * delegation, and take what is left. It does not attempt to be a shell — it does
 * not need to be, because it is reading scripts this repo owns, and the failure
 * mode of not understanding one is a check that is skipped, never a false alarm.
 */
function executablesIn(script) {
  const found = new Set();
  for (const part of splitCommands(String(script))) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    // Walk forward through assignments and delegating runners.
    for (let guard = 0; guard < 8 && i < tokens.length; guard++) {
      while (i < tokens.length && (ASSIGNMENT.test(tokens[i]) || tokens[i] === "--")) i++;
      if (i >= tokens.length) break;
      const next = delegatesTo(tokens, i);
      if (next === -1) break;
      // `cross-env` is itself a local executable AND a delegator.
      if (tokens[i] === "cross-env") found.add("cross-env");
      i = next;
    }
    const command = tokens[i];
    if (!command) continue;
    // A path (./x, ../x, dir/x) is a file, not a bin lookup.
    if (command.includes("/") || command.includes("\\")) continue;
    if (NOT_A_LOCAL_BIN.has(command)) continue;
    // Anything that cannot be an executable name is a fragment of something
    // else — see PLAUSIBLE_BIN.
    if (!PLAUSIBLE_BIN.test(command)) continue;
    found.add(command);
  }
  return [...found];
}

function requiredBinsFor(project) {
  const manifest = path.join(ROOT, project, "package.json");
  if (!fs.existsSync(manifest)) return [];
  let scripts = {};
  try {
    scripts = JSON.parse(fs.readFileSync(manifest, "utf8")).scripts || {};
  } catch {
    return [];
  }
  const bins = new Set();
  for (const name of UPDATE_CHAIN_SCRIPTS[project] || []) {
    if (typeof scripts[name] !== "string") continue;
    for (const bin of executablesIn(scripts[name])) bins.add(bin);
  }
  return [...bins];
}

/** Windows resolves a bin through .cmd/.ps1 shims rather than the bare name. */
const BIN_SUFFIXES = process.platform === "win32" ? ["", ".cmd", ".CMD", ".ps1"] : [""];

function hasBin(project, bin) {
  const binDir = path.join(ROOT, project, "node_modules", ".bin");
  return BIN_SUFFIXES.some((suffix) => fs.existsSync(path.join(binDir, bin + suffix)));
}

/** Everything a project's manifest asks for, runtime and dev alike. */
function declaredAnywhereIn(project, { includeOptional = true } = {}) {
  const manifest = path.join(ROOT, project, "package.json");
  if (!fs.existsSync(manifest)) return new Set();
  try {
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    return new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
      ...(includeOptional ? Object.keys(pkg.optionalDependencies || {}) : []),
    ]);
  } catch {
    return new Set();
  }
}

/**
 * Does some INSTALLED package in this project publish this executable?
 *
 * The bin name and the package name usually match — `next`, `vitest`,
 * `sequelize-cli` — but not always: `tsc` comes from `typescript`. When the
 * package is present and only its shim is missing, a reinstall genuinely fixes
 * it, so it is worth the directory walk to find out.
 */
function installedPackageProvides(project, bin) {
  const modules = path.join(ROOT, project, "node_modules");
  if (!fs.existsSync(modules)) return false;
  for (const name of declaredAnywhereIn(project)) {
    const pkgJson = path.join(modules, ...name.split("/"), "package.json");
    if (!fs.existsSync(pkgJson)) continue;
    try {
      const { bin: declared } = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
      if (typeof declared === "string" && name === bin) return true;
      if (declared && typeof declared === "object" && bin in declared) return true;
    } catch {
      /* unreadable manifest is not evidence either way */
    }
  }
  return false;
}

/**
 * WHY a required executable is missing — because the answer decides what to do
 * about it, and getting that wrong is expensive.
 *
 * The repair ladder below exists to fix BROKEN LINKS, and it fixes them by
 * deleting node_modules and installing again. That is the right response to a
 * package that is declared and did not link. It is exactly the wrong response to
 * a tool NOTHING DECLARES: no amount of reinstalling will conjure it, so the
 * ladder deletes all three trees, reinstalls twice, and fails anyway — which is
 * what a real update did, for several minutes, before printing advice about full
 * disks and damaged stores that had nothing to do with it.
 *
 *   "installable" — declared here, or published by a package that is. Reinstall.
 *   "root-only"   — declared ONLY in the root manifest. `pnpm --filter <project>`
 *                   puts only that project's .bin on PATH, so it is unreachable
 *                   however many times it is installed. A packaging fault.
 *   "undeclared"  — in no manifest at all. Also a packaging fault.
 */
function classifyMissingBin(project, bin) {
  if (declaredAnywhereIn(project).has(bin)) return "installable";
  if (installedPackageProvides(project, bin)) return "installable";
  if (project !== "." && declaredAnywhereIn(".").has(bin)) return "root-only";
  return "undeclared";
}

/** Missing executables a reinstall could plausibly supply. */
function missingBinsFor(project) {
  return requiredBinsFor(project)
    .filter((bin) => !hasBin(project, bin))
    .filter((bin) => classifyMissingBin(project, bin) === "installable")
    .map((bin) => `${bin} (bin)`);
}

/**
 * Missing executables a reinstall can NEVER supply, with the reason.
 *
 * Reported before the first install, because there is no point spending minutes
 * on a rebuild to arrive at the same answer.
 */
function unsatisfiableBins() {
  const faults = [];
  for (const project of PROJECTS) {
    for (const bin of requiredBinsFor(project)) {
      if (hasBin(project, bin)) continue;
      const kind = classifyMissingBin(project, bin);
      if (kind !== "installable") faults.push({ project, bin, kind });
    }
  }
  return faults;
}

function reportUnsatisfiable(faults) {
  console.error(
    `\n✗ THE RELEASE ASKS FOR A TOOL THAT NOTHING INSTALLS.\n\n` +
      faults
        .map(({ project, bin, kind }) =>
          kind === "root-only"
            ? `    ${project}: "${bin}" is declared ONLY in the root package.json.\n` +
              `      \`pnpm --filter ${project} …\` puts only ${project}/node_modules/.bin on\n` +
              `      PATH, so the root's copy is never found — no reinstall can change that.\n`
            : `    ${project}: "${bin}" is not declared in any package.json.\n`
        )
        .join("") +
      `\n  This is a fault in the release, not in your server, and nothing here has\n` +
      `  been deleted or changed. Either declare the tool in ${faults[0].project}/package.json,\n` +
      `  A tool a script invokes has to be declared by the project that OWNS the\n` +
      `  script — pnpm puts only that project's node_modules/.bin on PATH.\n` +
      `\n  Report this with the lines above — it will affect every install.\n`
  );
}

/**
 * `install`, never `update` — and `--no-frozen-lockfile` is load-bearing.
 *
 * WHY INSTALL AND NOT UPDATE. Applying a release means reproducing the tree the
 * release was TESTED against, which is what the shipped lockfile describes.
 * `pnpm update` instead bumps every dependency to the newest version its range
 * allows and rewrites the lockfile, so two operators updating a week apart get
 * different trees and neither is the one we tested. It also overrides the pins:
 * `pnpm update` on a real install resolved @wagmi/core 2.22.1 against a 2.21.2
 * override and produced unmet-peer errors across three packages, then corrupted
 * the store mid-write. That is why `pnpm updator` no longer calls
 * `update-packages-quick`; `pnpm update` remains available to run deliberately.
 *
 * WHY --no-frozen-lockfile. `run()` sets CI=true so pnpm never stops on the
 * no-TTY modules-purge prompt — but CI=true ALSO flips pnpm's frozen-lockfile
 * default to true. Under that default an install whose package.json and lockfile
 * disagree does not resolve, it FAILS:
 *
 *     ERR_PNPM_OUTDATED_LOCKFILE
 *
 * which is correct for CI and wrong here: a release can legitimately ship a
 * manifest change, and an operator can legitimately have edited one. This step
 * has to install what the manifests ask for. Stating it explicitly means the
 * behaviour does not depend on an environment variable set for another reason.
 */
const INSTALL = ["install", "-r", "--no-frozen-lockfile"];

/**
 * Run pnpm, showing its output live AND keeping a copy.
 *
 * Both halves are needed. An install takes minutes, so an operator has to see it
 * working — but the RECOVERY has to read what went wrong, because the right
 * response to a failed install depends entirely on why it failed. Deleting
 * node_modules is correct when pnpm could not finish recreating it and
 * catastrophic when the registry was merely unreachable: one is repaired by the
 * delete, the other is turned by it from "retry in a minute" into "this install
 * has no dependencies and no way to fetch them".
 *
 * `spawn` rather than `spawnSync` for exactly that: a captured `spawnSync` only
 * hands its output over once it has finished.
 */
function run(args) {
  console.log(`\n[deps] pnpm ${args.join(" ")}`);
  return new Promise((resolve) => {
    const child = spawn("pnpm", args, {
      cwd: ROOT,
      stdio: ["inherit", "pipe", "pipe"],
      // A SHELL ONLY WHERE ONE IS REQUIRED. On Windows `pnpm` is `pnpm.cmd`,
      // and Node 18.20.2+/20.12.2+/22+ refuse to spawn a .cmd without a shell
      // (CVE-2024-27980) — every argument here is hardcoded, which is what makes
      // that safe. On Linux, where operators actually update, `pnpm` is a real
      // executable and passing `shell: true` bought nothing except a
      // DeprecationWarning printed into the middle of every update:
      //
      //     (node:20428) [DEP0190] DeprecationWarning: Passing args to a child
      //     process with shell option true can lead to security vulnerabilities
      //
      // A warning nobody can act on, in the output of a command people run when
      // something is already wrong, is worse than no output.
      shell: process.platform === "win32",
      // pnpm treats CI as "never prompt". Without it a modules purge with no TTY
      // aborts mid-way (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY), which is what
      // leaves a tree half-removed in the first place.
      env: { ...process.env, CI: "true" },
    });

    let output = "";
    const tee = (stream, sink) => {
      stream.on("data", (chunk) => {
        output += chunk;
        sink.write(chunk);
      });
    };
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);

    child.on("error", (error) => {
      output += `\n${error.message}`;
      resolve({ ok: false, status: -1, output });
    });
    child.on("close", (status) => resolve({ ok: status === 0, status, output }));
  });
}

/**
 * Is this the failure a purge actually repairs?
 *
 * The one seen in the field:
 *
 *     Recreating /home/demo/public_html/node_modules
 *      ENOTEMPTY  ENOTEMPTY: directory not empty, rmdir '.../node_modules/.pnpm'
 *
 * pnpm decides the modules directory was built under different settings and
 * removes it to start again — which this release genuinely causes, because the
 * dependency pins moved out of package.json's `pnpm` field into
 * pnpm-workspace.yaml and that changes the recorded configuration. Its own
 * removal then hits entries it did not expect, usually left by an EARLIER
 * install that was interrupted (see the CI note above), and it stops with the
 * tree half-gone.
 *
 * `fs.rm` recursive does not care what is in there, so doing the removal
 * ourselves and letting pnpm build into a clean directory is the whole fix.
 */
function isPurgeRepairable(output) {
  return (
    /ENOTEMPTY/i.test(output) ||
    /ERR_PNPM_ABORTED_REMOVE_MODULES_DIR/i.test(output) ||
    /Recreating .*node_modules/i.test(output) ||
    /EPERM|EBUSY/i.test(output) ||
    isStoreMismatch(output)
  );
}

/**
 * TWO DIFFERENT pnpm VERSIONS ARE FIGHTING OVER THIS TREE.
 *
 *     The dependencies at ".../node_modules" are currently linked from the
 *     store at "~/.local/share/pnpm/store/v11".
 *     pnpm now wants to use the store at "~/.local/share/pnpm/store/v10".
 *     (This error may happen if the node_modules was installed with a
 *      different major version of pnpm)
 *
 * This is the ROOT CAUSE behind a whole run of symptoms that each looked like a
 * separate bug, and it is worth naming them because chasing them individually
 * costs hours:
 *
 *   - `Recreating .../node_modules` on EVERY install, not once. Each pnpm finds
 *     a tree built by the other and tears it down to start again.
 *   - `ENOTEMPTY … rmdir '.pnpm'` — one of those teardowns interrupted.
 *   - Packages that exist as a directory and a valid symlink but contain no
 *     package.json, because the recreate was cut off mid-write. Node then says
 *     `Cannot find module 'validator'` about something the manifest declares and
 *     the audit found.
 *
 * The purge below fixes the tree. It does not stop it happening again — only
 * using ONE pnpm does, which is what the `packageManager` field in the root
 * package.json now enforces.
 */
function isStoreMismatch(output) {
  return (
    /ERR_PNPM_UNEXPECTED_STORE/i.test(output) ||
    /currently linked from the store at/i.test(output) ||
    /different major version of pnpm/i.test(output)
  );
}

/**
 * Failures a purge would make WORSE. Deleting a working tree when the registry
 * is unreachable removes the only copy of the dependencies AND the ability to
 * fetch them, so the site cannot start at all — from a fault that would have
 * cleared on its own.
 */
function isTransient(output) {
  return (
    /ERR_PNPM_META_FETCH_FAIL|ERR_PNPM_REGISTRIES_MISMATCH|ERR_PNPM_FETCH_/i.test(output) ||
    /ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up/i.test(output) ||
    /request to .* failed/i.test(output)
  );
}

/** Is the disk full? It produces half-written trees that look like every other fault. */
function looksLikeNoSpace(output) {
  return /ENOSPC|no space left on device|EDQUOT|disk quota exceeded/i.test(output);
}

/**
 * Packages whose build step pnpm SKIPPED.
 *
 *     Ignored build scripts: argon2@0.44.0, bcrypt@6.0.0, bigint-buffer@1.1.5,
 *     msgpackr-extract@3.0.4, zeromq@6.5.0.
 *     Run "pnpm approve-builds" to pick which dependencies should be allowed…
 *
 * pnpm 10 refuses to run install scripts unless a package is approved, which is
 * a sensible default for arbitrary code and a disaster for THIS product: every
 * name in that list is a NATIVE module whose install step compiles or fetches
 * the binary the package cannot work without. Skipped, the directory is there
 * and the module is not:
 *
 *     Error: Cannot find module 'argon2'
 *     Failed to load zeromq.js addon.node: Manifest file not found
 *
 * — which reads exactly like a broken install and is not one.
 *
 * All of them are already listed in `onlyBuiltDependencies` in
 * pnpm-workspace.yaml, so seeing this at all means that setting is not being
 * honoured: a pnpm too old to read it from there (it moved out of package.json's
 * `pnpm` field), a second pnpm on the box, or a workspace file the update did
 * not replace. Rather than guess which, the install FORCES the builds and says
 * so — an update that leaves the platform unable to hash a password is not a
 * trade worth making for a warning nobody reads.
 */
function ignoredBuildScripts(output) {
  const match = output.match(/Ignored build scripts:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((entry) => entry.trim().replace(/\.$/, ""))
    // "argon2@0.44.0" -> "argon2"; "@scope/pkg@1.2.3" -> "@scope/pkg".
    .map((entry) => {
      const at = entry.lastIndexOf("@");
      return at > 0 ? entry.slice(0, at) : entry;
    })
    .filter(Boolean);
}

/**
 * Native packages that are pure ACCELERATORS — their absence costs speed, not
 * function.
 *
 * `msgpackr-extract` publishes no prebuild for Node 26 (ABI 147) and cannot be
 * built without a toolchain, and `msgpackr` — its only consumer — packs and
 * unpacks perfectly well without it, just more slowly. Reporting that beside a
 * genuinely broken addon would make both look equally serious, and the one that
 * matters would get the same shrug as the one that does not.
 */
const OPTIONAL_ACCELERATORS = new Set(["msgpackr-extract", "bigint-buffer"]);

/**
 * Native packages whose JS is present but whose BINARY is not.
 *
 * THE GAP THIS CLOSES. Every other check here asks whether a package is on
 * disk, and `zeromq` proved that is not the same question. Its `package.json`
 * was there, `require.resolve` succeeded, the audit passed — and the module
 * still could not load, because the extraction was missing `build/manifest.json`
 * and the prebuilt `.node` files beside it:
 *
 *     Error: Failed to load zeromq.js addon.node: Manifest file not found
 *
 * The install script then fell back to compiling from source, which needs cmake,
 * ninja and a C++ toolchain, took a minute, and failed — so the message an
 * operator actually saw was about a missing compiler, and the real fault was a
 * package that had never been unpacked properly. A clean re-fetch fixed it and
 * the prebuild loaded on Node 26 first try, because these addons are Node-API
 * and therefore ABI-stable.
 *
 * IN A CHILD PROCESS, always. Loading a native addon can abort the process
 * outright rather than throw, and an audit that can be killed by the thing it is
 * auditing reports nothing at all.
 */
function nativeModulesThatCannotLoad(names) {
  const broken = [];
  for (const name of names) {
    // LOADED FROM WHERE IT ACTUALLY LIVES, in the virtual store.
    //
    // Probing from `backend/` was wrong: most of these are TRANSITIVE
    // dependencies, so pnpm never links them into a project's node_modules and
    // the probe reported `bigint-buffer` and `msgpackr-extract` as broken on a
    // tree where both were fine. A package's own directory under `.pnpm` is the
    // one place it is always present, whoever depends on it.
    const dir = resolvePnpmPackageDir(name);
    if (!dir) continue; // not installed at all — the package audit owns that

    const probe = `try{require(${JSON.stringify(dir)});process.exit(0)}catch(e){process.exit(3)}`;
    // ELECTRON_RUN_AS_NODE MUST NOT REACH THE PROBE. A terminal inside VS Code
    // exports it, and it is INHERITED by everything launched there — so a
    // prebuild loader asks for `runtime=electron` and reports
    //
    //     No native build was found for platform=win32 arch=x64 runtime=electron
    //
    // about a package that is perfectly fine under plain Node. A checker that
    // fails on the developer's own machine gets disbelieved and then ignored.
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    const result = spawnSync(process.execPath, ["-e", probe], {
      stdio: "ignore",
      timeout: 30_000,
      env,
    });
    // Anything other than a clean exit — a throw, an abort, a timeout — means
    // the module is not usable here.
    if (result.status !== 0) broken.push(name);
  }
  return broken;
}

/** Where the virtual store keeps a package, whatever version resolved. */
function resolvePnpmPackageDir(name) {
  const store = path.join(ROOT, "node_modules", ".pnpm");
  if (!fs.existsSync(store)) return null;
  // Entries are "<name>@<version>[_peerhash]", with "/" in scoped names
  // written as "+".
  const prefix = `${name.replace("/", "+")}@`;
  let entries;
  try {
    entries = fs.readdirSync(store);
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.startsWith(prefix)) continue;
    const dir = path.join(store, entry, "node_modules", ...name.split("/"));
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
  }
  return null;
}

/**
 * Run the build steps pnpm skipped.
 *
 * `pnpm rebuild <pkg>` runs a package's install scripts explicitly, which is the
 * one instruction that does not depend on why the approval list was ignored.
 * Non-fatal: the audit that follows is what decides whether the tree is usable,
 * and it checks the packages themselves rather than trusting this to have
 * worked.
 */
async function runSkippedBuilds(names) {
  if (!names.length) return;
  console.log(
    `\n[deps] pnpm skipped the build step for ${names.length} native package(s):` +
      `\n       ${names.join(", ")}` +
      `\n` +
      `\n       Every one of them is already approved in pnpm-workspace.yaml` +
      `\n       (onlyBuiltDependencies), so that setting is not being honoured here —` +
      `\n       usually a second pnpm on the machine, or one too old to read it from` +
      `\n       that file. Building them explicitly; without this the packages exist` +
      `\n       as directories with no working module inside, and the backend fails` +
      `\n       later with "Cannot find module 'argon2'".\n`
  );
  const result = await run(["rebuild", ...names]);
  if (!result.ok) {
    console.error(
      `\n[deps] \`pnpm rebuild\` did not complete. If the audit below reports these` +
        `\n       packages, run it by hand and read the compiler output:` +
        `\n           pnpm rebuild ${names.join(" ")}\n`
    );
  }
}

/**
 * Which boot-critical packages cannot be resolved from `project`.
 *
 * `require.resolve` with an explicit base, not `fs.existsSync`: a dangling
 * symlink EXISTS. Only resolving it the way Node will at runtime distinguishes
 * "linked" from "usable", and that distinction is the entire bug.
 */
/**
 * Declared dependencies whose link into the project's node_modules is missing
 * OR DANGLING.
 *
 * `fs.existsSync` on the linked directory, NOT `require.resolve`.
 *
 * require.resolve looked like the stricter check and is the wrong one: it needs
 * a package to expose a requireable main entry, which plenty of legitimate
 * dependencies do not. Run against a KNOWN-GOOD tree it reported @types/ejs,
 * @types/validator, @types/dompurify and sequelize-cli as missing — three
 * type-only packages and one bin-only package, all perfectly installed. An audit
 * that condemns a healthy install is worse than none, because the repair it
 * triggers is a full rebuild.
 *
 * existsSync follows symlinks, so it returns false for a link that points
 * nowhere — which is precisely the failure being hunted. pnpm creates one link
 * per DECLARED dependency in each project's node_modules, so this maps exactly
 * onto the manifest.
 */
/**
 * Is this package actually THERE, as opposed to merely having a directory?
 *
 * The test is its `package.json`, and the distinction is not pedantic — it is
 * the whole difference between an install that runs and one that does not.
 *
 * Checking the DIRECTORY was the previous test and it passed on a real, broken
 * install. pnpm had reported `Recreating .../node_modules`, been interrupted
 * partway (the same run had already produced
 * `ENOENT: mkdir '.../.pnpm/undici@6.28.0/node_modules'`), and left behind
 * directories with nothing in them. `fs.existsSync` on a directory says yes to
 * that. Node does not:
 *
 *     Error: Cannot find module 'validator'
 *     - /home/demo/public_html/backend/dist/models/ext/ico/icoTeamMember.js
 *
 * So the audit printed "✓ dependencies installed and verified" and the update
 * died at the migration, one step later, with the database untouched but the
 * operator none the wiser.
 *
 * `package.json` and not `require.resolve`: resolve needs a requireable main
 * entry, which type-only packages (@types/ejs, @types/validator) and bin-only
 * packages (sequelize-cli) do not have — run against a KNOWN-GOOD tree it
 * condemned four perfectly installed packages. Every real package has a
 * package.json; a half-written directory does not.
 */
function packageUsable(modules, name) {
  // Scoped names are a directory pair (@scope/pkg), hence the split.
  return fs.existsSync(path.join(modules, ...name.split("/"), "package.json"));
}

function missingFor(project) {
  const modules = path.join(ROOT, project, "node_modules");
  if (!fs.existsSync(modules)) {
    return declaredDependencies(project).length ? ["<node_modules missing>"] : [];
  }
  const missing = [];
  for (const name of declaredDependencies(project)) {
    if (PLATFORM_SPECIFIC.test(name)) continue;
    if (!packageUsable(modules, name)) missing.push(name);
  }
  return missing;
}

/**
 * WHAT THE SHIPPED BACKEND ACTUALLY REQUIRES — read from the code, not claimed
 * by a manifest.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS THE CHECK THAT MATTERS
 * ---------------------------------------------------------------------------
 *
 * Every previous version of this audit asked a manifest what ought to be
 * installed and then looked for it. That is one step removed from the question
 * anyone cares about, which is: WILL `backend/dist` LOAD? Each time the two
 * diverged, the update passed its own check and then died at a `require` — first
 * on `bullmq`, then `sequelize-cli`, then `cross-env`, then `validator`, each
 * looking like a brand-new fault and each being the same one.
 *
 * `backend/dist` is what production runs — it is committed, it is what
 * `updator:migrate` boots, and it is the only artefact whose needs are not a
 * matter of opinion. Reading its `require()` calls and resolving each one the
 * way Node will is the closest thing to booting it without a database.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY NOT REPORTED
 * ---------------------------------------------------------------------------
 *
 * Only specifiers the backend DECLARES are treated as faults. A bare require of
 * something undeclared is usually a cross-addon optional import — this codebase
 * routes those through `safe-imports` precisely so a missing addon is a feature
 * being off rather than a crash — and failing an update over one would block
 * every install that simply does not have that extension.
 *
 * So: declared + required + not resolvable = broken, unambiguously.
 */
const IGNORED_SPECIFIER = /^(\.|\/|node:|@b\/|@db\/|@\/)/;

/**
 * The directories the update chain EXECUTES, and therefore the ones whose
 * imports have to resolve.
 *
 * `backend/dist` is what `updator:migrate` boots. `backend/seeders` is what
 * `pnpm seed` runs — and leaving it out cost a real update its last step:
 *
 *     ERROR: Cannot find package 'uuid' imported from
 *            /home/demo/public_html/backend/seeders/20240402234615-depositGateways.js
 *
 * after the schema had already been applied. `uuid` is declared, and it was
 * half-written by the same store churn as everything else; the check simply was
 * not looking there.
 */
const EXECUTED_CODE_DIRS = ["backend/dist", "backend/seeders"];

/**
 * Both module systems, because this codebase uses both.
 *
 * `backend/dist` is CommonJS and calls `require()`. The seeders are CommonJS
 * files that reach for ESM-only packages with `await import("uuid")`, and there
 * are plain `import … from` forms elsewhere. A scanner that knew only `require`
 * saw none of the second kind.
 */
const SPECIFIER_PATTERNS = [
  /\brequire\(\s*["'`]([^"'`]+)["'`]\s*\)/g, // require("x")
  /\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g, // import("x") / await import("x")
  /\bfrom\s+["'`]([^"'`]+)["'`]/g, // import … from "x" / export … from "x"
  /\bimport\s+["'`]([^"'`]+)["'`]/g, // import "x"
];

function codeSpecifiers(rootDir) {
  const specifiers = new Set();
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        stack.push(full);
        continue;
      }
      if (!/\.(js|cjs|mjs)$/.test(entry.name)) continue;
      let source;
      try {
        source = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      for (const pattern of SPECIFIER_PATTERNS) {
        for (const match of source.matchAll(pattern)) {
          const spec = match[1];
          if (IGNORED_SPECIFIER.test(spec)) continue;
          // "pkg/sub/path" resolves through the PACKAGE, so only its name matters.
          const parts = spec.split("/");
          specifiers.add(spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]);
        }
      }
    }
  }
  return specifiers;
}

/**
 * Declared dependencies that `backend/dist` requires and Node cannot find.
 *
 * Resolved from `backend/dist` itself, which is where the requires happen and
 * therefore where the lookup walks up from — `backend/dist/node_modules`, then
 * `backend/node_modules`, then the workspace root.
 */
function unloadableDistRequires() {
  // Optional dependencies are excluded: by definition an install is allowed to
  // be missing them, so demanding they resolve would make optional mean
  // required.
  const declared = declaredAnywhereIn("backend", { includeOptional: false });
  const broken = new Set();

  for (const relative of EXECUTED_CODE_DIRS) {
    const dir = path.join(ROOT, relative);
    if (!fs.existsSync(dir)) continue;
    // `packageUsable`, NOT `require.resolve`, and for two separate reasons —
    // either of which alone would be enough.
    //
    // 1. FALSE POSITIVES. `require.resolve` needs a requireable main entry and
    //    plenty of legitimate packages have none: `sequelize-cli` is bin-only,
    //    `@types/*` are types-only. It condemned `sequelize-cli` on a healthy
    //    tree, where the only "import" of it was a JSDoc annotation —
    //    `/** @type {import('sequelize-cli').Migration} */`.
    //
    // 2. A STALE CACHE. Node memoises successful resolutions per process, and
    //    this audit runs up to THREE times in one process — once before any
    //    repair, and again after each. A package resolved successfully on the
    //    first pass would keep answering from cache on the later ones even
    //    after `remove()` deleted the tree it lives in, so the repair loop
    //    would congratulate itself on a directory that is no longer there.
    //    `fs.existsSync` reads the filesystem every time.
    for (const spec of codeSpecifiers(dir)) {
      if (!declared.has(spec)) continue; // see the note above
      // Declared by the backend means pnpm links it into backend/node_modules,
      // which is also where the runtime lookup from these directories lands.
      if (!packageUsable(path.join(ROOT, "backend", "node_modules"), spec)) {
        broken.add(spec);
      }
    }
  }
  return [...broken].sort();
}

function auditAll() {
  const report = {};
  // THE DECISIVE ONE FIRST: what the shipped backend actually requires. A
  // manifest can be satisfied while `backend/dist` still cannot load.
  const unloadable = unloadableDistRequires();
  if (unloadable.length) report["backend/dist requires"] = unloadable;
  for (const project of PROJECTS) {
    // Both halves: a package that will not RESOLVE, and an executable the
    // update chain will SHELL OUT to. Either one alone reports a healthy tree
    // while the other kind of breakage is still there.
    const missing = [...missingFor(project), ...missingBinsFor(project)];
    if (missing.length) report[project] = missing;
  }
  return report;
}

function describe(report) {
  return Object.entries(report)
    .map(([project, missing]) => `    ${project}: ${missing.join(", ")}`)
    .join("\n");
}

// ---------------------------------------------------------------------------

function remove(relative) {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) return true;
  process.stdout.write(`[deps] removing ${relative} ... `);

  // maxRetries covers what makes this fail transiently: Node retries EBUSY,
  // EMFILE, ENFILE, ENOTEMPTY and EPERM on its own between attempts. Generous,
  // because `.pnpm` on a real install is tens of thousands of entries and a
  // single slow unlink is not a reason to abandon an update.
  try {
    fs.rmSync(full, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    console.log("done");
    return true;
  } catch (error) {
    // LAST RESORT: the system's own `rm`. Node's recursive remove is a
    // portable reimplementation and there are trees it gives up on that GNU rm
    // clears without complaint — very long paths, odd permissions, the debris an
    // interrupted install leaves in `.pnpm`. Worth one attempt before stopping
    // an update, and skipped on Windows where there is no equivalent.
    if (process.platform !== "win32") {
      const fallback = spawnSync("rm", ["-rf", full], { stdio: "ignore" });
      if (fallback.status === 0 && !fs.existsSync(full)) {
        console.log("done (via rm -rf)");
        return true;
      }
    }
    console.log("FAILED");
    console.error(
      `\n[deps] Could not remove ${relative}: ${error.message}\n` +
        `       Something is holding files open, or the path is not writable.\n` +
        `       Check that the platform is stopped (\`pm2 list\`) and that you are\n` +
        `       running as the account that owns the files, then retry.\n`
    );
    return false;
  }
}

const TREES = ["node_modules", "backend/node_modules", "frontend/node_modules"];

/**
 * Install, and recover from an install that FAILS.
 *
 * WHY THIS EXISTS. Everything below this used to be unreachable whenever it was
 * needed most: the first `pnpm install` was fatal, so a non-zero exit ended the
 * update on the spot and the repair ladder — written for precisely this kind of
 * damage — never ran. On a real install that read:
 *
 *     Recreating /home/demo/public_html/node_modules
 *      ENOTEMPTY  ENOTEMPTY: directory not empty, rmdir '.../node_modules/.pnpm'
 *     [deps] pnpm install failed with exit code 217.
 *
 * and left the operator with a half-removed tree, a site in maintenance mode,
 * and no instruction beyond the error.
 *
 * The escalation is deliberately ordered cheapest-first, and it never deletes
 * anything until it has a reason to believe deleting helps:
 *
 *   1. install.
 *   2. install again. An interrupted install is often complete on the retry, and
 *      this costs seconds when it works.
 *   3. purge and install — ONLY when the output says the tree is the problem.
 *   4. purge everything and install.
 *
 * A registry that cannot be reached STOPS at 2 and says so, because deleting
 * node_modules would remove both the dependencies and any means of replacing
 * them — turning "try again in a minute" into a site that cannot start.
 */
let skippedBuilds = [];

async function installWithRecovery() {
  // `pnpm install` at a workspace root installs EVERY workspace project, not
  // just the root one. It only PRINTS the root project's dependency summary,
  // which is what makes an incomplete install look like "it skipped backend and
  // frontend" when the real fault is elsewhere. `-r` makes the intent explicit
  // and is equivalent here.
  let result = await run(INSTALL);
  skippedBuilds = ignoredBuildScripts(result.output);
  if (result.ok) return;

  if (looksLikeNoSpace(result.output)) {
    console.error(
      `\n✗ THE DISK IS FULL. pnpm cannot finish, and nothing below would help.\n` +
        `\n  Check it:  df -h .   and   du -sh node_modules\n` +
        `\n  Free space and re-run \`pnpm updator\`. Nothing has been deleted.\n`
    );
    process.exit(1);
  }

  console.log(
    `\n[deps] The install failed (exit ${result.status}). Retrying once before` +
      `\n       touching anything — an interrupted install usually completes on` +
      `\n       the second attempt.\n`
  );
  result = await run(INSTALL);
  skippedBuilds = ignoredBuildScripts(result.output);
  if (result.ok) return;

  // PRECEDENCE MATTERS, AND THIS ORDER IS NOT THE OBVIOUS ONE.
  //
  // Local damage is checked BEFORE the network, because pnpm prints
  // "Will retry in 10 seconds (socket hang up)" during perfectly healthy
  // installs — it is noise, not a diagnosis. Testing for the network first
  // would let one retried request veto the repair of a tree that is provably
  // broken, and the operator would be told to check their firewall while the
  // real fault sat in `.pnpm`.
  //
  // The reverse mistake is not symmetric: an ENOTEMPTY is unambiguous evidence
  // that removal is what is needed, whereas a network warning is compatible
  // with everything.
  const purgeRepairable = isPurgeRepairable(result.output);

  if (isStoreMismatch(result.output)) {
    console.log(
      `\n[deps] ────────────────────────────────────────────────────────────────` +
        `\n[deps] MORE THAN ONE pnpm IS INSTALLED ON THIS SERVER.` +
        `\n` +
        `\n       pnpm said the tree was linked from one store and it wants a` +
        `\n       different one. That only happens when two pnpm versions take` +
        `\n       turns at the same node_modules, and it is the cause — not a side` +
        `\n       effect — of the "Recreating node_modules" you see on every run,` +
        `\n       of ENOTEMPTY during those rebuilds, and of packages that end up` +
        `\n       present but empty ("Cannot find module 'validator'").` +
        `\n` +
        `\n       Rebuilding the tree now, which fixes it for this run. To stop it` +
        `\n       recurring, use one pnpm:` +
        `\n` +
        `\n           pnpm --version                 # what you have` +
        `\n           which -a pnpm                  # where the copies are` +
        `\n           corepack disable               # if corepack supplies a second` +
        `\n` +
        `\n       This release also pins the version in package.json` +
        `\n       ("packageManager"), so pnpm 10+ will use the same one whichever` +
        `\n       copy you launch.` +
        `\n[deps] ────────────────────────────────────────────────────────────────\n`
    );
  }

  if (!purgeRepairable && isTransient(result.output)) {
    console.error(
      `\n✗ THE PACKAGE REGISTRY COULD NOT BE REACHED.\n` +
        `\n  Your dependencies have NOT been touched — deleting them now would remove` +
        `\n  the only copy you have along with the means of replacing it.\n` +
        `\n  Check connectivity and any proxy or firewall, then re-run:` +
        `\n      pnpm updator\n`
    );
    process.exit(1);
  }

  console.log(
    purgeRepairable
      ? `\n[deps] pnpm could not rebuild node_modules itself — it stopped partway` +
          `\n       through replacing it. Removing the tree so it can build into a` +
          `\n       clean directory. Nothing but downloaded packages is discarded.\n`
      : `\n[deps] Two installs failed and the cause is not one this recognises.` +
          `\n       Rebuilding the dependency tree from scratch, which clears the` +
          `\n       damage an interrupted install leaves behind.\n`
  );

  // The root first, because that is the one pnpm was replacing and the one the
  // project trees link INTO. If clearing it is enough, the two large project
  // trees are left alone and the install is much faster.
  if (!remove("node_modules")) process.exit(1);
  result = await run(INSTALL);
  skippedBuilds = ignoredBuildScripts(result.output);
  if (result.ok) return;

  console.log(
    `\n[deps] Still failing. Rebuilding all three trees together — the project` +
      `\n       trees link into the root store, so a stale one can keep an` +
      `\n       otherwise-clean install broken.\n`
  );
  for (const dir of TREES) if (!remove(dir)) process.exit(1);
  result = await run(INSTALL);
  skippedBuilds = ignoredBuildScripts(result.output);

  if (!result.ok) {
    console.error(
      `\n✗ THE DEPENDENCY INSTALL CANNOT COMPLETE (exit ${result.status}).\n` +
        `\n  The update stops here on purpose: a schema migration against a backend` +
        `\n  that cannot boot would leave the database half-migrated and unseeded.\n` +
        `\n  In order, the things that produce this:\n` +
        `\n      df -h .                     a full disk, which is the usual answer` +
        `\n      pm2 list                    something still running and holding files` +
        `\n      pnpm store prune            a damaged package store\n` +
        `\n  Then re-run \`pnpm updator\`. Your site stays on the maintenance page` +
        `\n  until it succeeds; \`pnpm start\` brings it back on the current code.\n`
    );
    process.exit(result.status ?? 1);
  }
}

// BEFORE ANYTHING ELSE. A tool no manifest declares cannot be installed, so
// finding out after three rebuilds costs minutes and teaches nothing.
const packagingFaults = unsatisfiableBins();
if (packagingFaults.length) {
  reportUnsatisfiable(packagingFaults);
  process.exit(1);
}

await installWithRecovery();
await runSkippedBuilds(skippedBuilds);

let report = auditAll();

// STEP 2 — targeted repair. Rebuild only the projects that actually fail to
// resolve, before considering anything more drastic. On the stale-link case this
// is usually enough, and it leaves the (large) root store untouched.
if (Object.keys(report).length) {
  console.log(
    `\n[deps] Installed, but some packages do not resolve from their project:\n` +
      `${describe(report)}\n` +
      `\n[deps] Rebuilding just those projects. A link can EXIST and still not` +
      `\n       resolve — that is what happens when the store it points into was` +
      `\n       replaced while the project's node_modules was left in place.\n`
  );

  for (const project of Object.keys(report)) {
    if (!remove(`${project}/node_modules`)) process.exit(1);
  }
  await installWithRecovery();
  report = auditAll();
}

// STEP 3 — full rebuild. Only if a targeted one did not settle it, because this
// discards the root store too and is much slower.
if (Object.keys(report).length) {
  console.log(
    `\n[deps] Still unresolved:\n${describe(report)}\n` +
      `\n[deps] Rebuilding all three trees together.\n`
  );
  for (const dir of TREES) {
    if (!remove(dir)) process.exit(1);
  }
  await installWithRecovery();
  report = auditAll();
}

if (Object.keys(report).length) {
  console.error(
    `\n✗ DEPENDENCIES ARE STILL INCOMPLETE AFTER A FULL REINSTALL:\n` +
      `${describe(report)}\n` +
      `\n  The update stops here on purpose — a schema migration against a backend` +
      `\n  that cannot boot would leave the database half-migrated and unseeded.\n` +
      `\n  Check for a full disk first, which produces exactly this:\n` +
      `      df -h .\n` +
      `\n  Then try again. If it persists, the pnpm store itself may be damaged:\n` +
      `      pnpm store prune && pnpm reinstall --deep\n`
  );
  process.exit(1);
}

console.log("\n[deps] ✓ dependencies installed and verified for backend and frontend.\n");
