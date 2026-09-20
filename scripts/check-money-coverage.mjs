#!/usr/bin/env node
/**
 * THE MONEY-COVERAGE RATCHET — how much of the code that moves money is executed
 * by a test that could notice if it were wrong.
 *
 *   node scripts/check-money-coverage.mjs             measure, then judge
 *   node scripts/check-money-coverage.mjs --self-test check the JUDGE, in 20ms
 *
 *   exit 0  the pooled statement coverage over the ratchet files is at or above
 *           the floor, and every one of those files was actually measured
 *   exit 1  it dropped, or something made the measurement meaningless
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A RATCHET AND NOT A TARGET
 *
 * The number below is not an opinion about how much coverage this code deserves.
 * It is THE NUMBER THIS TREE PRODUCED when the check was written, rounded down.
 * Its only job is to make a DECREASE loud: delete a test, mock out a service
 * that used to be exercised for real, or add a money file nothing calls, and the
 * pooled figure falls and this fails naming the files that moved.
 *
 * The floor may only ever go UP, and only after a run has shown the tree is
 * already above the new value. Lowering it is not "adjusting a threshold" — it
 * is deleting the evidence that the coverage existed, in the same commit that
 * removes the coverage. If a legitimate refactor lands a large untested money
 * file and the pooled figure genuinely falls, the fix is a test, not a smaller
 * number. (If it truly must move down — a whole subsystem deleted, say — the
 * commit that moves it must say WHY in the message, and the run output that
 * justifies it is the four lines this script prints.)
 *
 * WHY NOT A GLOBAL PERCENTAGE
 *
 * Because a global percentage is gamed by testing easy code. `backend/src` is
 * 158,875 statements; a rule like "coverage must not fall below 30%" is
 * satisfiable by covering formatters and constants forever while `WalletService`
 * stays where it is. Worse, it moves for reasons that have nothing to do with
 * risk: adding a payment gateway drops the percentage without making anything
 * less safe. This measures TWENTY-THREE NAMED FILES — the wallet service layer,
 * the three shared writers of `transaction` rows, and since 2026-09-05 the six
 * files of the ecosystem order path (the hold, the settlement legs, the fee
 * credit, the release-only refund) — chosen and defended in
 * `e2e/shared/money-files.cjs`.
 *
 * THE THREE WAYS A COVERAGE CHECK LIES, AND WHAT IS DONE ABOUT EACH
 *
 *   1. IT MEASURES NOTHING AND CALLS IT A PASS. A moved directory, a broken
 *      glob, an instrumentation setting that silently stopped applying: the
 *      report comes back empty, the pooled percentage over an empty set is
 *      `NaN` or 100, and the guard is green forever. Answered here by requiring
 *      a coverage ROW for every ratchet file (absence is a failure that names
 *      the file) and by requiring the denominator to stay above a floor of its
 *      own.
 *   2. THE DENOMINATOR SHRINKS. Delete half of `WalletService.ts` and the
 *      percentage RISES. Answered by `MIN_STATEMENTS`: the ratchet files
 *      together must still contain at least that many statements, so coverage
 *      cannot be improved by deleting code.
 *   3. IT READS YESTERDAY'S REPORT. A crashed run leaves the previous
 *      `coverage-summary.json` in place and the checker happily grades it.
 *      Answered by deleting the summary before the run and failing if it is not
 *      recreated.
 *
 * WHAT IT STILL CANNOT SEE, said plainly: statement coverage counts LINES THAT
 * RAN, not assertions that would fail. A suite that imports `walletService` and
 * asserts nothing raises this number. It is a floor under how much of the money
 * layer is even reachable from the hermetic suites — not a claim that the
 * behaviour is checked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const E2E = path.join(ROOT, "e2e");

const { resolveMoneyFiles } = require_(path.join(E2E, "shared", "money-files.cjs"));

/**
 * The coverage config is ASKED rather than described — and asked LAZILY.
 *
 * This script has to know where jest will write the summary and in what format.
 * Writing `e2e/coverage/money/coverage-summary.json` out by hand here would be a
 * second copy of a path that lives in the config, and the day they disagree this
 * script reads a file that is not there — or worse, one left behind by an older
 * run.
 *
 * Lazily because `--self-test` does not need it and must not be able to fail
 * because of it. `jest.money-coverage.cjs` derives from `jest.config.cjs`, so at
 * module scope this made a half-saved edit in a file THIS SCRIPT DOES NOT
 * OWN — observed once, mid-edit, as `ReferenceError: COVERAGE_RUN is not
 * defined` — take down the twenty-millisecond check of the judge as well as the
 * measurement. A self-test that cannot run while the tree is being worked on is
 * a self-test that stops being run.
 */
function moneyConfig() {
  return require_(path.join(E2E, "jest.money-coverage.cjs"));
}

/**
 * THE FLOOR. Statement coverage, pooled over the ratchet files.
 *
 * FIRST MEASURED at 16.69% — 315 of 1887 statements — by the whole `unit` jest
 * project, instrumented, on 2026-08-12: 304 suites, 5,897 tests, 904s. Measured
 * TWICE, through two different configurations of the same lane, and both
 * produced 315/1887 to the statement. Floor 16.0.
 *
 * RE-DERIVED on 2026-09-05 (plans/done/ORDER-SCALE-10K.md WP-0.11, RED-RUNS.md
 * C.MONEYCOV.4) when the six ecosystem order-path files joined the ratchet:
 * 2111 of 4715 statements = 44.77%, whole `unit` project instrumented, 670
 * suites, 12,880 tests, 137 s at four workers. The subject changed, so this is
 * a NEW baseline and not a raise of the old one; both numbers stay here so the
 * jump reads as the re-measure it was. The same run without
 * settlement-real-door.test.ts (the one hermetic suite that settles through the
 * real WalletService) produces 2043/4715 = 43.32%: that suite alone reaches 68
 * statements nothing else does (54 in matchmaking.ts, 12 in wallet.ts), and
 * the floor is set so that deleting it is RED, which is WP-0.11's done-when.
 *
 * The floor is set BELOW the measurement rather than at it, and the size of the
 * gap is a decision rather than a round number: 0.27 points is ~13 covered
 * statements (the same slack the 2026-08-12 floor carried), so a suite that
 * stops exercising a wallet method or a settlement leg trips this, while a few
 * lines of churn inside an already-covered function does not. It is also ~30
 * statements of NEW uncovered money code — which is meant to fail. Landing a
 * hundred lines in placeOrder.ts with nothing calling them is the case this
 * exists for, and "the gate went red" is the correct outcome, not a nuisance.
 */
const FLOOR_PCT = 44.5;

/**
 * The denominator floor: how many statements the ratchet files must still hold
 * between them. 4715 today (1887 before the order path joined). Set so that
 * losing the smallest of the big files (placeOrder.ts, 240 statements) is
 * caught here as well as by the anchor check in money-files.cjs. This is the
 * answer to "coverage went up because the code went away" — see failure mode 2
 * in the header.
 */
const MIN_STATEMENTS = 4200;

/** Pooled, never an average of percentages: a 3-statement file is not a peer of a 464-statement one. */
function pool(rows) {
  return rows.reduce(
    (acc, r) => ({ covered: acc.covered + r.covered, total: acc.total + r.total }),
    { covered: 0, total: 0 }
  );
}

const pct = ({ covered, total }) => (total === 0 ? 0 : (100 * covered) / total);

/**
 * THE JUDGE, kept pure so `--self-test` and the vitest suite can drive it with
 * fixtures. Everything it needs is an argument; it reads no files and no clock.
 *
 * `rows` are `{ file, covered, total }` for the files the coverage report
 * actually contained, already narrowed to the ratchet set.
 */
export function verdict({ rows, expectedFiles, floorPct, minStatements }) {
  const failures = [];

  const seen = new Set(rows.map((r) => r.file));
  const missing = expectedFiles.filter((f) => !seen.has(f));
  if (missing.length) {
    failures.push(
      `no coverage row for ${missing.length} ratchet file(s): ${missing.join(", ")}.\n` +
        `      A file with no row was not measured, and "not measured" is NOT "0%" — it is the\n` +
        `      shape of a broken lane. Either the coverage config stopped seeing the file (fix\n` +
        `      jest.money-coverage.cjs), or the file compiles to no statements at all, in which\n` +
        `      case name it in TYPE_ONLY in e2e/shared/money-files.cjs and say so.`
    );
  }

  const totals = pool(rows);
  if (totals.total < minStatements) {
    failures.push(
      `the ratchet files hold ${totals.total} statements, below the floor of ${minStatements}.\n` +
        `      The percentage below is therefore measuring a smaller subject than the one this\n` +
        `      floor was calibrated against — coverage that improves because code was deleted is\n` +
        `      not an improvement. If the shrink is deliberate, re-measure and move both floors\n` +
        `      in the same commit.`
    );
  }

  const value = pct(totals);
  // Compared on the pooled counts rather than the rounded percentage, so a run
  // that is one statement short cannot pass by rounding up to the floor.
  if (value + 1e-9 < floorPct) {
    failures.push(
      `statement coverage over the money-mutating files is ${value.toFixed(2)}% ` +
        `(${totals.covered}/${totals.total}), below the floor of ${floorPct}%.\n` +
        `      This is a RATCHET: the floor is a number this tree already produced. Something\n` +
        `      that used to be executed by a test no longer is — a deleted suite, a service\n` +
        `      mocked out where it used to run for real, or new money code with nothing\n` +
        `      exercising it. The per-file table above says which. Write the test; do not lower\n` +
        `      the floor.`
    );
  }

  return { ok: failures.length === 0, failures, totals, pct: value };
}

/* ── the self-test ───────────────────────────────────────────────────────────
   The judge is the part of this script that can fail SILENTLY: weaken a
   comparison and every future run passes, and a passing run is exactly what a
   healthy tree looks like. Each case below is a mutation someone could
   plausibly make, asserted to still be caught. It runs in the gate BEFORE the
   expensive measurement, the same way route-permissions, design, docs-reality
   and dex-invariants run their self-tests first.                              */

function selfTest() {
  const failures = [];
  let cases = 0;
  /* Counted rather than written out as a literal: "9 cases passed" beside eight
     cases is the smallest possible version of a report that does not describe
     the run it came from. */
  const check = (what, cond) => {
    cases += 1;
    if (!cond) failures.push(what);
  };

  const files = ["a.ts", "b.ts"];
  const healthy = [
    { file: "a.ts", covered: 500, total: 1000 },
    { file: "b.ts", covered: 500, total: 1000 },
  ];
  const opts = { expectedFiles: files, floorPct: 40, minStatements: 1500 };

  const good = verdict({ rows: healthy, ...opts });
  check("a healthy tree must PASS (50% over 2000 statements, floor 40%)", good.ok);
  check("the pooled percentage must be counted from the statements", Math.abs(good.pct - 50) < 1e-9);

  // 1. A drop below the floor.
  check(
    "a drop below the floor must FAIL",
    !verdict({
      rows: [
        { file: "a.ts", covered: 100, total: 1000 },
        { file: "b.ts", covered: 100, total: 1000 },
      ],
      ...opts,
    }).ok
  );

  // 2. Exactly at the floor passes; one statement under does not. This is the
  //    off-by-one that a `<=`/`<` slip would silently invert.
  check(
    "exactly at the floor must PASS",
    verdict({
      rows: [
        { file: "a.ts", covered: 400, total: 1000 },
        { file: "b.ts", covered: 400, total: 1000 },
      ],
      ...opts,
    }).ok
  );
  check(
    "one statement under the floor must FAIL",
    !verdict({
      rows: [
        { file: "a.ts", covered: 400, total: 1000 },
        { file: "b.ts", covered: 399, total: 1000 },
      ],
      ...opts,
    }).ok
  );

  // 3. THE VACUOUS PASS: an empty report. 0/0 must never read as "fine".
  const empty = verdict({ rows: [], ...opts });
  check("an EMPTY report must FAIL rather than report 0/0 as a pass", !empty.ok);
  check(
    "an empty report must say which files went missing",
    empty.failures.some((f) => f.includes("a.ts") && f.includes("b.ts"))
  );

  // 4. A file silently dropped from the report while the rest look wonderful.
  const dropped = verdict({
    rows: [{ file: "a.ts", covered: 950, total: 1000 }],
    ...opts,
  });
  check("a ratchet file missing from the report must FAIL even at 95%", !dropped.ok);
  check(
    "the missing file must be named",
    dropped.failures.some((f) => f.includes("b.ts"))
  );

  // 5. Coverage improved by deleting code.
  check(
    "a shrunken denominator must FAIL even at 100%",
    !verdict({
      rows: [
        { file: "a.ts", covered: 50, total: 50 },
        { file: "b.ts", covered: 50, total: 50 },
      ],
      ...opts,
    }).ok
  );

  if (failures.length) {
    console.error(
      `check-money-coverage --self-test: ${failures.length} of ${cases} case(s) FAILED:`
    );
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  /* A floor on the self-test itself. Delete the cases above and this stops
     saying "the judge is sound" — it is the same argument as the file floors in
     gate.mjs's grep guards: a check that ran nothing must not print a pass. */
  if (cases < 10) {
    console.error(
      `check-money-coverage --self-test: only ${cases} case(s) ran, expected at least 10. ` +
        `Cases were removed without the count being reconsidered; a shrinking self-test is ` +
        `how a judge stops being checked while still printing that it was.`
    );
    process.exit(1);
  }
  console.log(`check-money-coverage --self-test: ${cases} case(s) passed (judge is sound).`);
  process.exit(0);
}

/* ── the measurement ─────────────────────────────────────────────────────── */

/** Repo-relative, forward-slashed — the spelling money-files.cjs uses. */
const posix = (p) => p.split(path.sep).join("/");

function normaliseKey(key) {
  const abs = path.isAbsolute(key) ? key : path.resolve(ROOT, key);
  return posix(path.relative(ROOT, abs));
}

function run() {
  const { files, problems } = resolveMoneyFiles();
  if (problems.length) {
    console.error("check-money-coverage: the ratchet cannot be resolved.\n");
    for (const p of problems) console.error(`  - ${p}\n`);
    process.exit(1);
  }

  const config = moneyConfig();
  if (!(config.coverageReporters ?? []).includes("json-summary")) {
    console.error(
      `check-money-coverage: e2e/jest.money-coverage.cjs does not list the 'json-summary' ` +
        `reporter, which is the only one this check can read. Nothing else would report that: ` +
        `the run would pass, write a human-readable report, and leave this script grading a ` +
        `file that never appears.`
    );
    process.exit(1);
  }

  const summaryFile = path.join(config.coverageDirectory, "coverage-summary.json");
  /* Failure mode 3 in the header: a crashed run leaves the last report behind,
     and grading a stale file is worse than grading none. */
  fs.rmSync(summaryFile, { force: true });

  const jestCli = path.join(E2E, "node_modules", "jest", "bin", "jest.js");
  if (!fs.existsSync(jestCli)) {
    console.error(
      `check-money-coverage: ${posix(path.relative(ROOT, jestCli))} is missing — run \`pnpm install\`.`
    );
    process.exit(1);
  }

  /* Eight workers is the jest.config.cjs cap and the number every floor below
     was measured under. MONEY_COVERAGE_MAX_WORKERS lowers it for a run that has
     to share the box (the WP-0.11 re-measure ran at 4 beside a perf lane); it
     changes how long the run takes and nothing about what it measures, which
     is why it is an environment knob and not an argument the judge sees. It
     is clamped to 1..8: more than the cap is the "31 workers on a 32-core box"
     mistake jest.config.cjs documents, and a non-number falls back to 8. */
  const workersRaw = Number.parseInt(process.env.MONEY_COVERAGE_MAX_WORKERS ?? "", 10);
  const maxWorkers = Number.isFinite(workersRaw) ? Math.min(8, Math.max(1, workersRaw)) : 8;

  console.log(
    `  measuring ${files.length} money-mutating file(s) with the hermetic unit suites ` +
      `(${maxWorkers} jest worker(s))…`
  );
  const res = spawnSync(
    process.execPath,
    [jestCli, "-c", "jest.money-coverage.cjs", "--coverage", `--maxWorkers=${maxWorkers}`],
    { cwd: E2E, stdio: "inherit", env: { ...process.env, GATE: "1" } }
  );

  if (res.error) {
    console.error(`check-money-coverage: could not start jest: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    /* Named separately from a ratchet failure on purpose, and NOT called a red
       suite: jest also exits 1 when it collected ZERO test files, which is a
       different problem with the same exit code and the opposite diagnosis. The
       two are distinguished by jest's own output directly above this line, so
       both are named rather than one being guessed. */
    console.error(
      `\ncheck-money-coverage: the instrumented run exited ${res.status}, so there is no\n` +
        `  coverage to grade. Read the jest output above — it is one of two things:\n` +
        `    - a RED SUITE, the same one the \`jest-unit\` step reports. Fix the test; nothing\n` +
        `      can be said about coverage until the suites pass.\n` +
        `    - "No tests found". Jest exits 1 on zero matches deliberately, and that is a\n` +
        `      broken lane, not a clean tree: check \`roots\` and \`testMatch\` in\n` +
        `      e2e/jest.money-coverage.cjs against the paths jest printed.`
    );
    process.exit(1);
  }

  if (!fs.existsSync(summaryFile)) {
    console.error(
      `\ncheck-money-coverage: jest exited 0 and wrote no ${posix(path.relative(ROOT, summaryFile))}.\n` +
        `  The lane ran and measured nothing. Do NOT read that as 0% — check\n` +
        `  e2e/jest.money-coverage.cjs's coverageReporters and coverageDirectory.`
    );
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
  const wanted = new Set(files);
  const rows = [];
  for (const [key, value] of Object.entries(summary)) {
    if (key === "total") continue; // the global figure, deliberately unused
    const file = normaliseKey(key);
    if (!wanted.has(file)) continue;
    rows.push({ file, covered: value.statements.covered, total: value.statements.total });
  }

  rows.sort((a, b) => b.total - a.total);
  console.log(`\n  money-mutating files — statement coverage\n  ${"-".repeat(72)}`);
  for (const r of rows) {
    const p = r.total === 0 ? 0 : (100 * r.covered) / r.total;
    console.log(
      `  ${String(r.covered).padStart(5)}/${String(r.total).padEnd(6)} ` +
        `${p.toFixed(1).padStart(6)}%  ${r.file}`
    );
  }

  const out = verdict({
    rows,
    expectedFiles: files,
    floorPct: FLOOR_PCT,
    minStatements: MIN_STATEMENTS,
  });
  console.log(`  ${"-".repeat(72)}`);
  console.log(
    `  POOLED ${out.totals.covered}/${out.totals.total} = ${out.pct.toFixed(2)}%   ` +
      `floor ${FLOOR_PCT}%   headroom ${(out.pct - FLOOR_PCT).toFixed(2)} points\n`
  );

  if (!out.ok) {
    for (const f of out.failures) console.error(`  FAIL  ${f}\n`);
    process.exit(1);
  }
  process.exit(0);
}

const ARGS = process.argv.slice(2);
for (const a of ARGS) {
  if (a !== "--self-test") {
    console.error(`check-money-coverage: unknown argument '${a}'`);
    process.exit(2);
  }
}
/* Importing this module (the vitest suite does) must not run jest. */
const INVOKED_DIRECTLY =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) {
  if (ARGS.includes("--self-test")) selfTest();
  else run();
}
