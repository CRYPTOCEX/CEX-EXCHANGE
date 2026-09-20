#!/usr/bin/env node
/**
 * `pnpm gate` — the runner that stands in for CI, because there is no CI.
 * ============================================================================
 *
 * This repo has no `.github/`, no `.gitlab-ci.yml`, no Jenkinsfile and — until
 * `pnpm hooks:install` is run — no git hook either. Every "test X is green" and
 * "generated artefact Y is not stale" sentence in the plans is a claim nobody
 * checks. This script is the thing that checks them, and the pre-push hook
 * (scripts/hooks/pre-push) is the thing that runs it.
 *
 *   node scripts/gate.mjs [--fast] [--full] [--only=<id>,...] [--skip=<id>,...] [--list]
 *
 *   exit 0   every selected step that ran, passed
 *   exit 1   at least one step failed (or a REQUIRED step could not be run)
 *   exit 2   the gate itself is misconfigured — wrong cwd, missing tool,
 *            unknown --only/--skip id
 *
 * TWO CONVENTIONS THAT ARE EASY TO GET WRONG
 * ------------------------------------------
 * 1. SKIPPED IS NOT PASSED. A step that cannot run prints a WARN, its reason,
 *    and the exact command that would make it runnable. The summary counts
 *    skips separately and the final line names them. A gate that quietly
 *    reports success for work it never did is worse than no gate.
 *
 * 2. `required` means "a missing precondition is a FAILURE, not a skip". It
 *    does NOT mean "checked more strictly": every step, required or not, fails
 *    the gate if it actually runs and exits non-zero. So `dex-fork` with no
 *    anvil skips (not required — the fork harness needs a binary this repo does
 *    not vendor),
 *    while `routes` can never skip, because a stale route manifest is a
 *    production defect whether or not anyone felt like checking it.
 *
 * WHY `GATE=1` AND NOT `CI=1`
 * ---------------------------
 * Nothing in this repo sets `CI`, so a config keyed on `process.env.CI` — the
 * usual `forbidOnly: !!process.env.CI` / `retries: process.env.CI ? 2 : 0`
 * shape — is dead code on this box forever. Every child process started here
 * gets `GATE=1` instead, and the test configs read that.
 *
 * WORKING DIRECTORY IS FORCED ON PURPOSE
 * --------------------------------------
 * tools/build-permission.js resolves APP_DIR from `process.cwd()`. Run from a
 * subdirectory it finds no permission sources, writes an EMPTY
 * permissions.json, and silently un-gates every admin route. The chdir below is
 * load-bearing, not tidiness.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/*
 * CANONICALISED, AND ON WINDOWS THAT IS THE DRIVE LETTER'S CASE.
 * -------------------------------------------------------------
 * `import.meta.url` inherits the case of the cwd the gate was launched from,
 * because that is what the module specifier resolved against. Launched from
 * git-bash (which is what the pre-push hook runs under) the cwd comes through
 * as `c:\xampp\...`; from PowerShell it is `C:\xampp\...`. Both name the same
 * directory, and every filesystem call treats them as one.
 *
 * Jest does not. `jest-config` normalises `rootDir` through `tryRealpath`,
 * which is `fs.realpathSync.NATIVE` and returns the drive letter the OS holds
 * (`C:`), while `__dirname` inside e2e/jest.config.cjs comes from Node's CJS
 * resolver, whose realpath is the JS one — it resolves symlinks but leaves the
 * case alone (`c:`). So `roots` and `rootDir` disagreed by one character, and
 * `SearchSource`'s root filter is a case-SENSITIVE RegExp built from `roots`.
 *
 * The result was the worst shape a gate failure can take: `jest-unit` and
 * `vitest-store` failed from git-bash and passed from PowerShell, on the same
 * commit, seconds apart. Jest's "No tests found" message prints the testMatch,
 * testPathIgnorePatterns and testRegex tallies but NOT the `roots` one, so it
 * read as "420 files match, 0 tests found" — a contradiction with no visible
 * cause, which is how a red gate gets waved through as flaky.
 *
 * `realpathSync.native` is the same call jest makes, so the cwd handed to every
 * child now agrees with what the tools do to it. Fixed HERE rather than in each
 * config because it is one property of the launch, and one of the two lanes it
 * broke lives in the store's separate repository.
 */
const ROOT = fs.realpathSync.native(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
);
process.chdir(ROOT);
if (!fs.existsSync(path.join(ROOT, "pnpm-workspace.yaml"))) {
  console.error("gate.mjs: not at the repo root");
  process.exit(2);
}

const E2E = path.join(ROOT, "e2e");
/*
 * A DIFFERENT SITE, not a workspace member: the store has its own git
 * repository, package.json, pnpm-workspace.yaml, lockfile, port and database,
 * and `/store` is in this repo's .gitignore. It owns its suites at
 * store/e2e/unit and runs them with its own vitest, which is why the step
 * below runs there rather than from e2e/.
 */
const STORE = path.join(ROOT, "store");
const BACKEND = path.join(ROOT, "backend");
const FRONTEND = path.join(ROOT, "frontend");
/** The Rust workspace. Its own gate is `cargo xtask gate`; see the `rust-*` steps. */
const RUST_ROOT = path.join(ROOT, "backend-rust");

/**
 * Test ids that must have a witnessed red run recorded in RED_RUNS_FILE.
 *
 * Each phase APPENDS its own ids as it lands; nothing is ever removed, because
 * the evidence does not expire. Phase −1 seeds the three from PH.17.
 */
/** foundryup's install location, which it does not add to PATH. */
function anvilInFoundryBin() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (!home) return false;
  return ["anvil.exe", "anvil"].some((name) =>
    fs.existsSync(path.join(home, ".foundry", "bin", name))
  );
}

const REQUIRED_RED_RUNS = [
  "PH.17.c",
  "PH.17.d",
  // Phase 2. Each of these guards something that fails SILENTLY when broken,
  // which is exactly the class of test worth proving can go red:
  //   P2.3  the curation axis — weaken it and an unreviewed token is quotable
  //   P2.4  the venue-kind discriminator — drop it and a tampered `to` passes
  //   P2.21 chart-engine dist freshness — the committed bundle is what ships,
  //         so a source edit nobody rebuilt is invisible until production
  //   P2.24 WS payload byte-equality — key ORDER decides whether a subscriber
  //         ever receives a frame, and a mismatch logs nothing
  // PH.17.b guards the P3.2 blast radius: wagmi now restores connections across
  // reloads, so "this form only signs on submit" stopped being self-evident.
  "PH.17.a",
  "PH.17.b",
  "P2.3",
  "P2.4",
  "P2.21",
  "P2.24",
  /*
    The three defects the live Swap driver surfaced. Every one of them was
    invisible to this gate on the day it shipped, which is why each is here:
      P.QUERY.1  `getFiltered` emitted `WHERE deletedAt IS NULL` against tables
                 with no such column — SIX of the eight Swap admin lists 500'd
                 in the browser while every unit suite was green, because they
                 all mock the models and none of them sees SQL.
      P.DASH.1   the dashboard's gate verdict was inside its 15s cache, so the
                 one screen that explains why Swap is off reported it was on.
      P.TYPES.1  an apostrophe in a comment made the model-type generator emit
                 an unterminated string literal — `backend/types/models.ts`
                 stopped PARSING, taking every tsx entry point with it.
  */
  "P.QUERY.1",
  "P.DASH.1",
  "P.TYPES.1",
  /*
    P.WS.1  a discarded WebSocket's late `close` deleted the LIVE socket from
            the manager's map and scheduled a reconnect — two sockets open, one
            tracked, and no error anywhere. The visible symptom was only the
            spurious "could not connect" warning.
  */
  "P.WS.1",
  /*
    P.AUTH.1   `optionalAuth` resolved the caller from the 15-minute accessToken
               cookie ALONE, while the session cookie that carries the session
               lives 14 days — so for ~99.9% of every session it resolved nobody
               and each route relying on it ran its signed-out branch for a
               signed-in user. It is here rather than merely tested because the
               first browser test written for it PASSED against the broken code:
               a page load's own token refresh re-armed the cookie before the
               assertion could observe anything. Evidence, not coverage, is what
               distinguished the two.
    P.CHROME.1 the terminal header's width ladder. The bar lives inside an
               overflow-hidden workspace, so a ladder that stops firing does not
               wrap and does not scroll — it silently clips the rightmost cells,
               which are the controls.
  */
  "P.AUTH.1",
  "P.CHROME.1",
  /*
    P.GUIDE.1  an SVG caption too long for its viewBox is clipped mid-word and
               NOTHING else in the toolchain can see it — it type-checks, it
               lints, and the full text is in the DOM, so even the rendered-text
               sweep that hunts raw translation keys reads it as correct. Only
               `getBBox()` measures what was actually drawn.
  */
  "P.GUIDE.1",
  /*
    P.CHROME.2  `Maximize` means the browser goes fullscreen; `Maximize2` means
                a panel is maximised inside the workspace. The Swap header had
                them crossed, so one page carried the same glyph for both. Worth
                a red run for a second reason: `lucide-maximize2` CONTAINS the
                substring `lucide-maximize`, so the obvious positive assertion
                passes on the bug and only the negative one discriminates.
  */
  "P.CHROME.2",
  /*
    E.CANCEL.1  the aggregated orderbook level is SHARED — one row per
                (symbol, side, price) summing every participant's open size —
                and a cancel decremented it by the CALLER's number. The AI
                market maker's number was the order's ORIGINAL size, so every
                fill a customer had already taken out of that quote was
                subtracted a second time, out of other people's depth, deleting
                a still-funded level when it reached zero. Required for BOTH
                directions: clamping every excess rather than only a material
                one leaves the level standing with dust in it, so the suite
                proves a missing clamp AND an over-eager one.
    E.VARINT.1  `mapRowToOrder` types amount/filled/remaining as `bigint` and
                the driver returns cassandra-driver `Integer` OBJECTS. An
                Integer zero is TRUTHY, so `remaining || amount` never fell
                through; `10n - integer` THROWS, so copy-trading's cancel threw
                before writing anything and its catch swallowed it. Invisible to
                the type checker — the annotation is the lie — so only a test
                constructing the real driver type can hold it.
    E.VOL.1     the risk monitor's volatility was annualised as though its
                samples were HOURLY. They are TRADE rows, about one a second, so
                the figure was overstated by sqrt(3600) and a market moving
                0.25% between prints read above the shipped 5% threshold —
                AUTO_PAUSE, and a funded market maker silently stops making a
                market until the daily reset. A units error looks correct in
                review; only a series with a KNOWN answer catches it.
    E.MARKET.1  the matcher's two-cursor walk skips a pair that would be a self
                trade, and it advanced the WRONG cursor — the NEWER side, i.e.
                the aggressor — directly contradicting the comment above it. So
                a taker holding any resting order of their own was retired at
                the first sight of it and never examined the real counterparty
                one rung behind. Deterministic, silent, and it repeats every
                cycle: the customer crosses visible depth and nothing happens.
                One character, which is precisely why it needs evidence rather
                than review.
    E.MARKET.2  the conservation half. The suite that proves WHICH orders match
                says nothing about whether the money is right, and the cursor
                fix's whole effect is to create fills that did not happen
                before. The first attempt at this row caught only two of the
                three conservation cases, because the third had a zero seller
                fee and could not tell a correct settlement from one that never
                deducts it — a vacuous assertion inside the evidence itself.
  */
  "E.CANCEL.1",
  "E.VARINT.1",
  "E.VOL.1",
  "E.MARKET.1",
  "E.MARKET.2",
  "E.MARKET.3",
  "E.MARKET.4",
  "E.MARKET.5",
  "E.MARKET.6",
  /*
    THE COVERAGE LANE'S OWN EVIDENCE.

    These four belong to `money-coverage` and `addon-coverage`, the only two steps
    in this table whose subject is A MEASUREMENT rather than a behaviour — and a
    measurement is the easiest thing here to keep green by weakening, because a
    weakened one produces no output that differs from a healthy one. Every other
    id above records a product defect some test caught; these record that the
    JUDGE can still tell a good tree from a bad one.

      C.MONEYCOV.1  the judge's vacuity guard. Delete the `missing` computation in
                    `verdict` and a coverage report containing NONE of the ratchet
                    files grades as complete — 0/0 read as a pass, which is the
                    exact illusion this whole programme exists to remove.
      C.MONEYCOV.2  the four ways the ratchet stops ratcheting while still printing
                    a number: the floor comparison disabled, the subject halved to
                    the wallet service alone, the `json-summary` reporter dropped
                    so the checker grades a file that never appears, and a
                    COVERAGE_ROOTS entry lost so an untested money file comes back
                    ABSENT rather than 0% — and absent is a broken lane, not a
                    score.
      C.MONEYCOV.3  NOT a mutation, and required for a different reason from
                    everything else in this list: it is the MEASUREMENT the floor
                    is set from (315/1887 = 16.69%, floor 16.0%). A ratchet whose
                    baseline nobody wrote down is a number the next person
                    "adjusts" in the same commit that deletes the coverage. With
                    the row here, lowering the floor is visibly a rewrite of the
                    evidence rather than a tweak to a threshold.
      C.ADDONCOV.1  the two states `addon-coverage` has to tell apart: results for
                    ONE addon is RED and names the twenty-one that produced
                    nothing, while NO results directory is a SKIP with its fix
                    printed. A step that ran the report unconditionally would
                    report on zero files and exit 0 — the failure the step was
                    added to remove.
  */
  "C.MONEYCOV.1",
  "C.MONEYCOV.2",
  "C.MONEYCOV.3",
  "C.ADDONCOV.1",
  /*
    THE ORDER-THROUGHPUT PROGRAMME, PHASE 0 (plans/done/ORDER-SCALE-10K.md).

    Until these landed the ecosystem order path was outside every gate: the
    money-coverage ratchet did not name matchingEngine.ts, matchmaking.ts,
    placeOrder.ts, cancelOrder.ts, wallet.ts or market-remainder.ts, and the
    one hermetic suite that drove the real matcher settled through jest.fn
    legs. Each id below is a harness whose entire value is that it can go red
    on the engine as it stands today, BEFORE any engine line moves in Phase 1
    onward; a harness that cannot fail on today's engine cannot fail on
    tomorrow's either.

      E.SCALE.1   settlement through the REAL WalletService over the seam: a
                  dropped user-vs-user leg or a doubled fee credit is red.
      E.SCALE.2   the cycle harness and the resident-scale probe: two cycles
                  overlapping, a coalesced caller stranded, or a claim that a
                  later fill in the same cycle can change; and a per-order scan
                  that turns the book derivation quadratic.
      E.SCALE.3   the conservation runner on a clone: one injected credit row
                  without a debit is reported by the sum, the chain and the
                  audit-row checks.
      E.SCALE.4   the wire fixtures: two properties swapped in a recorded
                  envelope, values unchanged, is red.
      E.SCALE.5   the replay corpus format: a diff that stops seeing a scalar
                  change, and a settlement leg altered inside a fixture.
      E.SCALE.6   the chaos lane: the crash-point matrix disagreeing with what
                  the driver observed after a kill and a restart.
      E.SCALE.7   the perf lane's own infrastructure: the HB signing payload
                  and the spawn guards that refuse :3000, :4000 and live v5.
      E.SCALE.8   the diagnostics route, which must PEEK at the engine and never
                  boot it.
      E.SCALE.9   the flags module: the kill switch, a degraded bus, and the
                  self-check that must report a mirror divergence.
      E.SCALE.10  the perf lane's SLO verdict: a p99 over the target is RED.
      E.SCALE.61  the SHARD chaos lane: the same disagreement rule as
                  E.SCALE.6, over a real shard process killed at a named
                  write-ahead-log boundary and restarted on the same log.
      C.MONEYCOV.4  the coverage floor RE-DERIVED for the six order-path files,
                  the same argument as C.MONEYCOV.3: a ratchet whose baseline
                  nobody wrote down is a number the next person adjusts.
  */
  "E.SCALE.1",
  "E.SCALE.2",
  "E.SCALE.3",
  "E.SCALE.4",
  "E.SCALE.5",
  "E.SCALE.6",
  "E.SCALE.7",
  "E.SCALE.8",
  "E.SCALE.9",
  "E.SCALE.10",
  "E.SCALE.61",
  "C.MONEYCOV.4",
  /*
    The two `b` ids close the Phase 0 baseline's section-10 gaps (WP-0.9b and
    WP-0.3b). Same contract as their parents, one more subject each:
      E.SCALE.4b  the wire fixtures the first pass did not record (the OCO
                  reply among them): two keys swapped, values unchanged, is red.
      E.SCALE.5b  the corpus GRADE mode: a fixture amount changed by one unit
                  at the fourth place is a diff against the spawned backend's
                  replay, and format.ts's gradeRun and opsMatch each made to
                  stop reporting are red hermetically.
  */
  "E.SCALE.4b",
  "E.SCALE.5b",
  /*
    THE ORDER-THROUGHPUT PROGRAMME, PHASE 1 (admission control and fail-fast).

    The first phase that moves engine and door lines. Every behaviour is OFF
    by default and the old path must stay byte-identical with the flag off, so
    each id below guards something that would fail SILENTLY when broken: a
    bound that admits one more than configured, a lease that leaks, a refusal
    that reads the body it was meant to refuse before, a cache that never
    hears the disable. Ids are allocated by package number (E.SCALE.11x is
    WP-1.1, E.SCALE.18x is WP-1.8) so a row says which package owns it.

      E.SCALE.111  the shed gate's DECISION: the budget refuses at 1/s, the
                   loop-delay sampler is inert at 0, and Routes.ts refuses
                   BEFORE readBody and withLogger (a verdict admitted through
                   the chain reads the body it was meant to shed).
      E.SCALE.112  the shed gate's HB ENVELOPE: {code, msg} in that order with
                   -1003 on the budget refusal, and the recorded fixture pins
                   X-RateLimit-Bucket: admission.
      E.SCALE.121  the per-key in-flight cap on the signed HB door refuses
                   BEFORE the Trade budget is charged.
      E.SCALE.122  the in-flight lease is released when the chain settles on
                   every path; a leak refuses a quiet key forever.
      E.SCALE.131  the wallet serial gate refuses the (N+1)th queued hold on
                   one key, and the hold verb DECLARES itself "hold".
      E.SCALE.132  only "hold" callers are bounded: a release behind a full
                   queue is never refused (money must always come back).
      E.SCALE.133  the slot bound (WALLET_QUEUE_MAX_SLOT) refuses at the bound,
                   not one past it.
      E.SCALE.141  pre-hold admission: the per-key bound refuses before
                   createOrder, so no Scylla row and no rollback.
      E.SCALE.142  pre-hold admission: the slot bound, same contract.
      E.SCALE.143  ECO_PREHOLD_ADMISSION unset is TODAY's path (the late 500
                   with the rollback), never the new refusal.
      E.SCALE.151  a cancel claim that times out behind a deferred settlement
                   never runs its fn: no intent marker, no spliced taker.
      E.SCALE.152  the timed-out link is still released, so the engine's
                   promise chain is not poisoned for every later caller.
      E.SCALE.161  the Scylla request budget refuses AT the bound with a 503
                   and no side effect; place and cancel are separate budgets.
      E.SCALE.162  the bounded cross-process drain serves exactly N per tick
                   and leaves the rest untouched in the hash.
      E.SCALE.163  a throw releases the budget slot exactly as a completion
                   does (a leaked slot refuses a quiet route).
      E.SCALE.171  when Redis cannot answer, the SIGNED door falls back to a
                   LOCAL bucket that refuses, never to unlimited.
      E.SCALE.172  a key disabled in another process is refused within ONE
                   bus publish (the cache hears the invalidation).
      E.SCALE.173  every hb/keys mutation route ANNOUNCES the key after the
                   write (the kill switch that forgets is the worst case).
      E.SCALE.174  NOSCRIPT loads the limiter script and retries the same
                   EVALSHA once; without it a fresh Redis degrades every check.
      E.SCALE.181  a socket over WS_MSGS_PER_SEC is closed on the frame past
                   the budget (keepalives included), and a NEW key past
                   WS_MAX_SUBSCRIPTIONS is refused with the existing frame.
      E.SCALE.182  a stalled socket is skipped for snapshot frames before the
                   copy, the market route answers SUBSCRIBE from the cached
                   set, and every uWS limit follows its WS_* variable.
  */
  "E.SCALE.111",
  "E.SCALE.112",
  "E.SCALE.121",
  "E.SCALE.122",
  "E.SCALE.131",
  "E.SCALE.132",
  "E.SCALE.133",
  "E.SCALE.141",
  "E.SCALE.142",
  "E.SCALE.143",
  "E.SCALE.151",
  "E.SCALE.152",
  "E.SCALE.161",
  "E.SCALE.162",
  "E.SCALE.163",
  "E.SCALE.171",
  "E.SCALE.172",
  "E.SCALE.173",
  "E.SCALE.174",
  "E.SCALE.181",
  "E.SCALE.182",
  /*
    PHASES 2 TO 5 (built 2026-09-06, workflow run wf_e694b805-fee; the rows are
    in the "Phases 2 to 5" section of RED-RUNS.md).

    Each id belongs to a package of that run and was witnessed by ITS agent,
    which is recorded on every row: the gate that would normally have collected
    them never ran (it died on an org policy error, as did both measure agents
    and the exit report), so the ids are listed here from the run's journal.

      21x  the trading process role and its lease candidacy (WP-2.1)
      22x  the pm2 layouts and the proxy affinity (WP-2.1)
      31x  the resident book and its mirrors (WP-3.1)
      32x  dirty-symbol cycles and the marks that earn a revisit (WP-3.2)
      33x  the output-identical early break in the walk (WP-3.3)
      34x  cancel without awaiting a cycle, and the cancel budget (WP-3.4)
      35x  keyed nudges, band hydration, the outside-lock resync (WP-3.5)
      36x  the reconciler from the aggregate (WP-3.6)
      37x  self-match from the per-user set (WP-3.7)
      43x  the batched cancel-all release (WP-4.3)
      44x  ledger retention by the archive job (WP-4.4)
      51x  the ledger batcher and its bulk pre-check (WP-5.1, WP-5.6)
      52x  holds through the batcher (WP-5.2)
      56x  the bulk idempotency pre-check (WP-5.6)
  */
  "E.SCALE.211",
  "E.SCALE.212",
  "E.SCALE.213",
  "E.SCALE.216",
  "E.SCALE.218",
  "E.SCALE.219",
  "E.SCALE.221",
  "E.SCALE.222",
  "E.SCALE.223",
  "E.SCALE.227",
  "E.SCALE.311",
  "E.SCALE.312",
  "E.SCALE.321",
  "E.SCALE.322",
  "E.SCALE.331",
  "E.SCALE.332",
  "E.SCALE.341",
  "E.SCALE.342",
  "E.SCALE.351",
  "E.SCALE.352",
  "E.SCALE.361",
  "E.SCALE.362",
  "E.SCALE.371",
  "E.SCALE.372",
  "E.SCALE.431",
  "E.SCALE.432",
  "E.SCALE.433",
  "E.SCALE.441",
  "E.SCALE.442",
  "E.SCALE.511",
  "E.SCALE.512",
  "E.SCALE.521",
  "E.SCALE.522",
  "E.SCALE.561",
  /*
    P0.U18. Two of these three are about this file's OWN evidence check, which is
    the class of test most worth proving can go red: a checker that reads the
    wrong column, and a map that points at a suite which has left the disk, both
    report success while grading nothing, and neither had any other witness.
      RS.GATE.1  the red-runs parser reads a `\|`-escaped row into its own column
      RS.GATE.2  a RED_RUN_SUITES path that is gone from the disk turns it red
      RS.GATE.3  a lane's exit 3 is SKIP; `bicrypto-ops`'s exit 3 is FATAL (A21)
      RS.GATE.5  the fifth, and the plainest: `rust-criterion-check` was titled "the
                 criterion benches compile and smoke-run" and its command line was
                 `cargo bench --workspace --no-run` — the flag whose entire meaning
                 is "do not execute". A bench that compiled and then panicked in its
                 body was green here forever. The row records the measurement: the
                 same out-of-range slice in the bench exits 0 under `--no-run` and
                 fails the step under the smoke run that replaced it.
      RS.GATE.4  the fourth of the same class, and the one that had actually been
                 grading nothing for the whole of P0: `rust-generated`'s
                 gen-admin-routes `--check` looked only at the canonical spec tree
                 that P4/P9 fill, so it skipped — while naming, as its reason, the
                 five golden specs `P0.U11` had already put on disk. Δ12's entire
                 point is that the ELEVEN generated route files are checked in and
                 reviewable, and `--check` is the only thing anywhere that can tell
                 them apart from their specs. The row records the measurement, not
                 the argument: the same one-character edit to a generated file
                 reads SKIP + `GATE PASS` on the old body and FAIL + `GATE FAIL` on
                 the new one.
      RS.GATE.6  the sixth, seventh and eighth are one unit and are listed together,
      RS.GATE.7  because they are the three halves of a single sentence: after
      RS.GATE.8  P0.U5, `gen-schema --check` grades drift by KIND, and each class
                 needs its own witness or the classifier is three claims with one
                 test behind them.

                 The defect they close is the last of this species in the gate, and
                 it was a DESIGN flaw: `node scripts/gate.mjs --only=rust` could not
                 be both green and truthful. WITH a probe DSN the step was RED —
                 `FAIL rust-generated (exit 1)` — because `--check` spent its exit
                 code on the 57 lines between `initial.sql` and the operator's live
                 database, every one of which is already filed and dispositioned in
                 `plans/rust/MIGRATIONS.md` §1.2, and which
                 `PHASE-0-foundations.md` exit 3 explicitly sanctions ("zero drift
                 lines, OR every drift line filed as a wave-1 candidate"). WITHOUT
                 one it SKIPped and the summary printed `GATE PASS (0 passed, 1
                 skipped)` — green because the schema was never checked. A false
                 red and a false green, from the same missing distinction.

                 RS.GATE.6 is class 1, module drift: a hand-edited generated module
                 is exit 1 even while all 57 filed lines stay quiet in the same run.
                 RS.GATE.7 is class 3, unfiled operator drift: a column added to a
                 SCRATCH clone of the live schema (never to the operator database)
                 comes back named, at exit 1. RS.GATE.8 is the reconciliation that
                 stops the machine-readable list and §1.2 becoming two copies nobody
                 compares: deleting one row from either file is exit 1 naming it,
                 and the `xtask` test `the_shipped_list_and_the_shipped_section_agree`
                 fails on the same edit. Class 2 — the 57 filed lines at exit 0 — is
                 the PASS state and is witnessed by the step being green at all.
  */
  "RS.GATE.1",
  "RS.GATE.2",
  "RS.GATE.3",
  "RS.GATE.4",
  "RS.GATE.5",
  "RS.GATE.6",
  "RS.GATE.7",
  "RS.GATE.8",
  "RS.PLAN.1",
];

/**
 * The files a red run's evidence points at, for the ids whose suite can be
 * DELETED without any other step noticing.
 *
 * Neither of the two steps that look at these suites catches a deletion:
 * `jest-unit` runs whatever files exist and exits 1 only when ZERO match, and
 * the red-runs check below parses RED-RUNS.md, which still carries the row
 * after the suite is gone. So "deleting settlement-real-door.test.ts turns the
 * gate red" (WP-0.11's done-when) was not true of either step, and evidence
 * for a suite that no longer exists is exactly the stale document this check
 * exists to refuse. Every path here must be on disk, or the red-runs step
 * fails naming the id and the file. A renamed suite is an EDIT here, in the
 * same commit as the rename.
 *
 * Every id whose row names its suite unambiguously is mapped. The block inside
 * the table below records which three do not and why — the rule is that a
 * resolution comes from the row's COMMAND cell and must land on a file that is
 * on disk, so nothing here is a guess about which of several sentences in a
 * prose column was the load-bearing one.
 */
const RED_RUN_SUITES = {
  "E.SCALE.1": ["e2e/unit/backend/ecosystem/settlement-real-door.test.ts"],
  "E.SCALE.2": [
    "e2e/unit/backend/ecosystem/cycle-harness.test.ts",
    "e2e/unit/backend/ecosystem/resident-scale.test.ts",
  ],
  "E.SCALE.3": ["scripts/ledger-conservation.mjs"],
  "E.SCALE.4": ["e2e/unit/backend/ecosystem/wire/wire-contract.test.ts"],
  "E.SCALE.5": ["e2e/unit/backend/ecosystem/corpus-format.test.ts"],
  "E.SCALE.6": ["e2e/live/ecosystem/chaos/driver.ts", "e2e/live/ecosystem/chaos/crash-points.ts"],
  "E.SCALE.61": ["e2e/live/ecosystem/chaos/shard-driver.ts", "e2e/live/ecosystem/chaos/crash-points.ts"],
  "E.SCALE.7": ["e2e/unit/backend/ecosystem/perf-infrastructure.test.ts"],
  "E.SCALE.8": ["e2e/unit/backend/ecosystem/engine-health-route.test.ts"],
  "E.SCALE.9": ["e2e/unit/backend/ecosystem/scale-flags.test.ts"],
  "E.SCALE.10": ["e2e/unit/backend/ecosystem/perf-lane.test.ts"],
  "E.SCALE.4b": [
    "e2e/unit/backend/ecosystem/wire/wire-contract.test.ts",
    "e2e/unit/backend/ecosystem/wire/fixtures/ecosystem/post-oco-success.json",
  ],
  "E.SCALE.5b": [
    "e2e/unit/backend/ecosystem/corpus-format.test.ts",
    "e2e/live/ecosystem/corpus/generator.ts",
    "e2e/live/ecosystem/corpus/format.ts",
    "e2e/live/ecosystem/corpus/fixtures/limit-cross-full.json",
  ],
  // Phase 1. Each maps to the suite(s) the row's command runs; the four shed
  // fixtures are listed with E.SCALE.112 because a deleted fixture leaves the
  // wire suite green (it grades whatever files exist) and the row standing.
  "E.SCALE.111": ["e2e/unit/backend/ecosystem/admission.test.ts"],
  "E.SCALE.112": [
    "e2e/unit/backend/ecosystem/admission.test.ts",
    "e2e/unit/backend/ecosystem/wire/wire-contract.test.ts",
    "e2e/unit/backend/ecosystem/wire/fixtures/hb/post-shed-budget.json",
    "e2e/unit/backend/ecosystem/wire/fixtures/hb/post-shed-overloaded.json",
    "e2e/unit/backend/ecosystem/wire/fixtures/ecosystem/post-shed-budget.json",
    "e2e/unit/backend/ecosystem/wire/fixtures/ecosystem/post-shed-overloaded.json",
  ],
  "E.SCALE.121": ["e2e/unit/backend/hb/hmac.test.ts", "e2e/unit/backend/hb/rateLimit.test.ts"],
  "E.SCALE.122": ["e2e/unit/backend/hb/hmac.test.ts", "e2e/unit/backend/hb/rateLimit.test.ts"],
  "E.SCALE.131": ["e2e/unit/backend/wallet/serial-gate.test.ts"],
  "E.SCALE.132": ["e2e/unit/backend/wallet/serial-gate.test.ts"],
  "E.SCALE.133": ["e2e/unit/backend/wallet/serial-gate.test.ts"],
  "E.SCALE.141": ["e2e/unit/backend/ecosystem/prehold-admission.test.ts"],
  "E.SCALE.142": ["e2e/unit/backend/ecosystem/prehold-admission.test.ts"],
  "E.SCALE.143": ["e2e/unit/backend/ecosystem/prehold-admission.test.ts"],
  "E.SCALE.151": ["e2e/unit/backend/ecosystem/cycle-harness.test.ts"],
  "E.SCALE.152": ["e2e/unit/backend/ecosystem/cycle-harness.test.ts"],
  "E.SCALE.161": ["e2e/unit/backend/ecosystem/scylla-budget.test.ts"],
  "E.SCALE.162": ["e2e/unit/backend/ecosystem/scylla-budget.test.ts"],
  "E.SCALE.163": ["e2e/unit/backend/ecosystem/scylla-budget.test.ts"],
  "E.SCALE.171": ["e2e/unit/backend/hb/rateLimit.test.ts"],
  "E.SCALE.172": ["e2e/unit/backend/hb/hmac.test.ts"],
  "E.SCALE.173": ["e2e/unit/backend/hb/keys-invalidate.test.ts"],
  "E.SCALE.174": ["e2e/unit/backend/hb/rateLimit.test.ts"],
  "E.SCALE.181": ["e2e/unit/backend/ws-ingress-limits.test.ts"],
  "E.SCALE.182": ["e2e/unit/backend/ws-ingress-limits.test.ts"],

  /*
    ───────────────────────────────────────────────────────────────────────────
    EVERY OTHER ID WHOSE ROW NAMES ITS SUITE UNAMBIGUOUSLY (P0.U18, A24).

    The paragraph above says "Only the order-scale ids are mapped… mapping them
    retroactively would mean guessing which of several commands in a row is the
    load-bearing one." That was true of the PROSE columns and false of the
    COMMAND column: every row below writes one command, and that command names
    either a file (`e2e/unit/backend/ecosystem/self-match.test.ts`) or a
    `--testPathPatterns` fragment that matches exactly one file on disk. Those
    are resolutions, not guesses — each was checked against the tree — so the
    protection this table exists for (a witnessed row whose suite has been
    deleted is a memory of evidence, not evidence) now covers 96 of the 99
    required ids instead of 34.

    THE THREE THAT STAY UNMAPPED, AND WHY, so the gap is a decision rather than
    an oversight:
      PH.17.a  `pnpm --filter e2e test:dex:fork` — a LANE, not a suite. The
               `fork` lane's four harnesses are already asserted against the
               gate's own copy by unit/frontend/gate-fork-matches-lane.test.ts.
      PH.17.b  `npx playwright test --project=dex` — a whole Playwright project;
               `gate-runs-every-playwright-project.test.ts` is what guards it.
      P.WS.1   `npx vitest run … unit/frontend/services` — a DIRECTORY. Naming
               one file in it would be the guess this table refuses to make.
    ───────────────────────────────────────────────────────────────────────────
  */
  "PH.17.c": ["eslint.config.mjs"],
  "PH.17.d": ["scripts/gate.mjs"],
  "P2.3": ["e2e/unit/backend/dex/allowlist.test.ts"],
  "P2.4": ["e2e/unit/backend/dex/routers.test.ts"],
  "P2.21": ["e2e/unit/frontend/chart-engine-dist-freshness.test.ts"],
  "P2.24": ["e2e/unit/backend/dex/ws-payloads.test.ts"],
  "P.QUERY.1": ["e2e/unit/backend/utils/get-filtered-paranoid.test.ts"],
  "P.DASH.1": ["e2e/unit/backend/dex/dashboard-report.test.ts"],
  "P.TYPES.1": ["e2e/unit/backend/utils/model-types-enum-extraction.test.ts"],
  "P.AUTH.1": ["e2e/unit/backend/auth/optional-user-session-fallback.test.ts"],
  "P.CHROME.1": ["e2e/ui/dex/terminal-chrome.pw.mjs"],
  "P.GUIDE.1": ["e2e/ui/dex/terminal-chrome.pw.mjs"],
  "P.CHROME.2": ["e2e/ui/dex/terminal-chrome.pw.mjs"],
  "E.CANCEL.1": ["e2e/unit/backend/ecosystem/cancel-decrement.test.ts"],
  "E.VARINT.1": ["e2e/unit/backend/copy-trading/cancel-order-types.test.ts"],
  "E.VOL.1": ["e2e/unit/backend/ai/volatility-is-time-normalised.test.ts"],
  "E.MARKET.1": ["e2e/unit/backend/ecosystem/market-order-crossing.test.ts"],
  "E.MARKET.2": ["e2e/unit/backend/ecosystem/market-order-crossing.test.ts"],
  "E.MARKET.3": [
    "e2e/unit/backend/ecosystem/orderbook-frame-planning.test.ts",
    "e2e/unit/backend/ecosystem/orderbook-push-reaches-subscribers.test.ts",
  ],
  "E.MARKET.4": [
    "e2e/unit/backend/ecosystem/book-participation.test.ts",
    "e2e/unit/backend/ecosystem/market-order-crossing.test.ts",
  ],
  /* `--testPathPatterns backed-levels` matches BOTH files, so both are what the
     row's command actually ran. Naming only the ecosystem one would make this
     entry a claim about a narrower run than the evidence describes. */
  "E.MARKET.5": [
    "e2e/unit/backend/ecosystem/backed-levels.test.ts",
    "e2e/unit/backend/futures/backed-levels.test.ts",
  ],
  "E.MARKET.6": ["e2e/unit/backend/ecosystem/market-remainder-ioc.test.ts"],
  "C.MONEYCOV.1": [
    "scripts/check-money-coverage.mjs",
    "e2e/unit/frontend/money-coverage-ratchet.test.ts",
  ],
  /* "same two commands" — the row says so in its own Command cell. */
  "C.MONEYCOV.2": [
    "scripts/check-money-coverage.mjs",
    "e2e/unit/frontend/money-coverage-ratchet.test.ts",
  ],
  "C.MONEYCOV.3": ["scripts/check-money-coverage.mjs"],
  "C.MONEYCOV.4": ["scripts/check-money-coverage.mjs"],
  "C.ADDONCOV.1": ["scripts/gate.mjs"],
  "E.SCALE.211": ["e2e/unit/backend/ecosystem/lease-candidacy.test.ts"],
  "E.SCALE.212": ["e2e/unit/backend/ecosystem/process-role.test.ts"],
  "E.SCALE.213": ["e2e/unit/backend/ecosystem/process-role.test.ts"],
  "E.SCALE.216": ["e2e/unit/backend/ecosystem/perf-proxy.test.ts"],
  "E.SCALE.218": ["e2e/unit/backend/ecosystem/perf-proxy.test.ts"],
  "E.SCALE.219": ["e2e/unit/backend/ecosystem/perf-proxy.test.ts"],
  "E.SCALE.221": ["e2e/unit/backend/ecosystem/process-role.test.ts"],
  "E.SCALE.222": ["e2e/unit/backend/ecosystem/process-role.test.ts"],
  "E.SCALE.223": ["e2e/unit/backend/ecosystem/process-role.test.ts"],
  "E.SCALE.227": ["e2e/unit/backend/ecosystem/perf-proxy.test.ts"],
  "E.SCALE.311": ["e2e/unit/backend/ecosystem/resident-book.test.ts"],
  "E.SCALE.312": [
    "e2e/unit/backend/ecosystem/resident-scale.test.ts",
    "e2e/unit/backend/ecosystem/cycle-harness.test.ts",
  ],
  "E.SCALE.321": ["e2e/unit/backend/ecosystem/cycle-harness.test.ts"],
  "E.SCALE.322": ["e2e/unit/backend/ecosystem/cycle-harness.test.ts"],
  "E.SCALE.331": ["e2e/unit/backend/ecosystem/walk-oracle.test.ts"],
  "E.SCALE.332": ["e2e/unit/backend/ecosystem/walk-oracle.test.ts"],
  "E.SCALE.341": [
    "e2e/unit/backend/ecosystem/cancel-without-awaiting-cycle.test.ts",
    "e2e/unit/backend/ecosystem/mid-cancel-still-backs-its-level.test.ts",
  ],
  "E.SCALE.342": [
    "e2e/unit/backend/ecosystem/cancel-without-awaiting-cycle.test.ts",
    "e2e/unit/backend/ecosystem/cancel-on-a-follower.test.ts",
  ],
  "E.SCALE.351": ["e2e/unit/backend/ecosystem/cycle-harness.test.ts"],
  "E.SCALE.352": ["e2e/unit/backend/ecosystem/cycle-harness.test.ts"],
  "E.SCALE.361": [
    "e2e/unit/backend/ecosystem/mid-cancel-still-backs-its-level.test.ts",
    "e2e/unit/backend/ecosystem/resync-does-not-double-count-levels.test.ts",
    "e2e/unit/backend/ecosystem/orderbook-writers.test.ts",
  ],
  "E.SCALE.362": [
    "e2e/unit/backend/ecosystem/mid-cancel-still-backs-its-level.test.ts",
    "e2e/unit/backend/ecosystem/orderbook-writers.test.ts",
  ],
  "E.SCALE.371": ["e2e/unit/backend/ecosystem/self-match.test.ts"],
  "E.SCALE.372": ["e2e/unit/backend/ecosystem/self-match.test.ts"],
  "E.SCALE.431": ["e2e/unit/backend/ecosystem/cancel-all-batched.test.ts"],
  "E.SCALE.432": ["e2e/unit/backend/ecosystem/cancel-all-batched.test.ts"],
  "E.SCALE.433": ["e2e/unit/backend/ecosystem/cancel-all-batched.test.ts"],
  "E.SCALE.441": ["e2e/unit/backend/wallet/ledger-archive.test.ts"],
  "E.SCALE.442": ["e2e/unit/backend/wallet/ledger-archive.test.ts"],
  "E.SCALE.511": ["e2e/unit/backend/wallet/batcher-rows-identical.test.ts"],
  "E.SCALE.512": ["e2e/unit/backend/wallet/batcher-rows-identical.test.ts"],
  "E.SCALE.521": ["e2e/unit/backend/wallet/holds-through-batcher.test.ts"],
  "E.SCALE.522": ["e2e/unit/backend/wallet/holds-through-batcher.test.ts"],
  "E.SCALE.561": ["e2e/unit/backend/wallet/batcher-rows-identical.test.ts"],
  /* P0.U18. The "suite" for the first two is this file plus the document it
     parses; for the third it is the Rust module whose tests hold the rule. */
  "RS.GATE.1": ["scripts/gate.mjs", "e2e/RED-RUNS.md"],
  "RS.GATE.2": ["scripts/gate.mjs", "e2e/RED-RUNS.md"],
  "RS.GATE.3": ["backend-rust/tools/xtask/src/gate.rs"],
  /* The mutated artefact and the spec that generates it: delete either and the
     `--check` this row is evidence for has nothing to compare. */
  "RS.GATE.4": [
    "backend-rust/tools/xtask/src/gate.rs",
    "backend-rust/crates/admin_table/tests/golden/specs/crm/user.toml",
    "backend-rust/crates/admin_table/tests/golden/routes/admin/crm/user/index.get.rs",
  ],
  /* The step's body and the one bench it smoke-runs: delete either and the row is
     evidence for a check that can no longer be performed. */
  "RS.GATE.5": [
    "backend-rust/tools/xtask/src/gate.rs",
    "backend-rust/crates/money/benches/amount_codec.rs",
  ],
  "RS.PLAN.1": ["plans/rust/workflows/check-plans.mjs", "plans/rust/workflows/ownership.test.mjs"],
};

/**
 * Red runs that cannot be witnessed on this machine yet, and the step whose
 * arrival unblocks each.
 *
 * These are NOT quietly dropped: the red-runs step prints them on every run, so
 * "we still owe two pieces of evidence" stays visible instead of decaying into
 * "the gate is green, we must be fine". They move into REQUIRED_RED_RUNS the
 * moment their toolchain lands — which is the same condition that turns the
 * `dex-fork` and `e2e` steps from skipped into real.
 *
 * PH.17.a needs anvil to fund an account, so there is nothing to break yet.
 * PH.17.b needs a Playwright browser to drive the injected wallet through the
 * SIWE form. Recording either as witnessed before its harness exists would be
 * the exact "test that cannot fail" this file is here to prevent.
 */
const DEFERRED_RED_RUNS = [
];

/**
 * Where the red-run evidence lives.
 *
 * The DEX plan names `backend/tests/dex/RED-RUNS.md`. That path CANNOT be used:
 * `backend/tests` is in RETIRED_DIRS in scripts/clean-stale-files.mjs (every
 * test in this repo moved to the top-level e2e/ package), so anything written
 * there is deleted by `pnpm clean:stale` and fails the `stale` step below. The
 * evidence document lives at the root of the test tree instead.
 */
const RED_RUNS_FILE = path.join(E2E, "RED-RUNS.md");

/* ── helpers ─────────────────────────────────────────────────────────────── */

const WIN = process.platform === "win32";
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/") || ".";

/**
 * Run one command and collect everything it says into `out`.
 *
 * ASYNCHRONOUS, AND THAT IS THE WHOLE POINT. This was `spawnSync` with
 * `stdio: "inherit"`, which is the shortest way to write a step runner and the
 * one thing that makes a concurrent one impossible: `spawnSync` blocks the
 * event loop until the child exits, so a second step cannot even be started,
 * and `inherit` interleaves two children's output into an unreadable braid.
 *
 * So the child's streams are PIPED and buffered into the caller's `out` array,
 * and the whole array is printed as one block when the step finishes. No output
 * is dropped or summarised — it is only held back until it can be printed next
 * to the step it belongs to.
 *
 * THE ERROR CASES ARE THE SAME ONES, deliberately, because each was written
 * against a real failure:
 *
 *   ETIMEDOUT  `timeoutMs` is not decoration on the browser and harness lanes;
 *              status 124, with the kill announced in the step's own block.
 *   ENOENT     a missing binary is a broken environment, not a failing test.
 *              It used to `process.exit(2)` on the spot. It cannot do that any
 *              more — exiting mid-run orphans every other child, and orphaned
 *              jest workers holding 1.7 GB are a documented failure in this
 *              tree. It is recorded in `fatalEnv` and the run exits 2 after
 *              everything has settled, which reports the same thing and leaves
 *              nothing behind.
 *   anything   spawn leaves `status` null when the process never started, and
 *   else       the caller reads null as an ordinary non-zero exit — so the step
 *              showed `FAIL 0.0s` with no message and no clue. Named, not
 *              swallowed. On Windows this is how `pnpm.cmd` fails: Node refuses
 *              to spawn a .cmd without a shell (EINVAL), which is exactly the
 *              trap the "invoke local runners as `node <cli.js>`" convention
 *              above exists to avoid.
 */
function execAsync({ cmd, args, cwd = ROOT, timeoutMs }, out) {
  return new Promise((resolve) => {
    let settled = false;
    /* `error` and `close` can both fire for one child; the first one wins and
       the second must not resolve a promise that already has an answer. */
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };

    let child;
    let timer = null;
    try {
      child = spawn(cmd, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, GATE: "1" },
        windowsHide: true,
      });
    } catch (error) {
      out.push(`gate.mjs: could not run '${cmd} ${args.join(" ")}': ${error.code ?? ""} ${error.message}\n`);
      return finish({ status: 2 });
    }

    let timedOut = false;
    if (timeoutMs) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);
    }

    child.stdout.on("data", (b) => out.push(b.toString()));
    child.stderr.on("data", (b) => out.push(b.toString()));

    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        return finish({ status: 127, enoent: `'${cmd}' is not on PATH` });
      }
      out.push(`gate.mjs: could not run '${cmd} ${args.join(" ")}': ${error.code ?? ""} ${error.message}\n`);
      finish({ status: 2 });
    });

    child.on("close", (code) => {
      if (timedOut) {
        out.push(`\n    (killed after ${Math.round(timeoutMs / 1000)}s)\n`);
        return finish({ status: 124 });
      }
      finish({ status: code === null ? 2 : code });
    });
  });
}

/** Is `name` an executable on PATH? Used for the optional-toolchain preflights. */
function hasBinary(name) {
  const probe = spawnSync(WIN ? "where" : "which", [name], { stdio: "ignore" });
  return probe.status === 0;
}

/**
 * The preflight every `rust-*` step shares: a workspace to run in and a cargo to run it with.
 *
 * Deliberately NOT a per-tool probe. Which of cargo-nextest, cargo-deny, cargo-mutants and
 * cargo-fuzz this box has is `cargo xtask gate`'s question, and it answers it by exiting 3 with the
 * install line for the one that is missing — the A21 SKIP this file renders. Duplicating those
 * probes here would be a second copy of the same table, drifting from the first.
 */
function rustPreflight() {
  if (!fs.existsSync(path.join(RUST_ROOT, "Cargo.toml"))) {
    return {
      reason: `${rel(RUST_ROOT)} is not a Cargo workspace on this checkout`,
      fix: "check out backend-rust/ (P0.U1)",
    };
  }
  if (!hasBinary("cargo")) {
    return {
      reason: "cargo is not on PATH",
      fix: "install the toolchain rust-toolchain.toml pins (1.98.0): https://rustup.rs",
    };
  }
  return null;
}

/**
 * The database the .env points at, and whether a WRITING step may touch it.
 *
 * The rule is the programme's, not this file's: a tool that writes runs only against a database
 * whose name contains `probe` or `test` (`e2e/live/ecosystem/perf/spawn.ts:17-46`,
 * `scripts/ledger-conservation.mjs`, `cargo xtask gen-schema`). Read from .env directly because
 * nothing loads dotenv here, and reported as a SKIP with the database NAMED — "it skipped" and "it
 * skipped because it would have written to your live install" are different sentences.
 */
function probeDatabase() {
  let name = process.env.DB_NAME ?? "";
  if (!name) {
    try {
      const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
      const match = /^\s*DB_NAME\s*=\s*["']?([^"'\r\n#]+)/m.exec(env);
      name = (match?.[1] ?? "").trim();
    } catch {
      name = "";
    }
  }
  if (!name) {
    return {
      name,
      reason: "no DB_NAME in the environment or .env, so there is no database to grade",
      fix: "DB_NAME=v5_probe node scripts/gate.mjs --only=jest-integration",
    };
  }
  if (!/probe|test/i.test(name)) {
    return {
      name,
      reason:
        `DB_NAME is \`${name}\`, which is not a probe database — these suites WRITE, and the ` +
        `programme's rule is that a writing tool only ever touches a database whose name ` +
        `contains "probe" or "test"`,
      fix: `clone it once and point the step at the clone: DB_NAME=${name}_probe node scripts/gate.mjs --only=jest-integration`,
    };
  }
  return { name, reason: null };
}

/**
 * The interpreter the Hummingbot connector kit runs under, or null.
 *
 * The kit is Python and everything else in this table is JavaScript, so its
 * suites had no lane at all — which is how `_place_cancel` shipped with no
 * retry on a refused cancel, left an order resting on a live venue holding a
 * customer's funds, and was found by reading a log rather than by a test.
 */
const PYTHON = ["python3", "python"].find((bin) => hasBinary(bin)) || null;

/** Scripts declared by a workspace package, for "has PH.6 landed yet" checks. */
function packageScripts(pkgDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")).scripts ?? {};
  } catch {
    return {};
  }
}

/*
  NOTHING IN THIS FILE SHELLS OUT TO pnpm, AND THE CONSTANT IS GONE SO NOTHING
  CAN START.

  `pnpm` is a .cmd shim on Windows and `spawnSync` refuses to start a .cmd
  without a shell — EINVAL, before any test runs. `dex-live` was the last step
  still using it and reported `FAIL 0.0s` on every run for that reason: a lane
  that had never executed once, sitting in the summary looking like a lane that
  keeps breaking. Invoke local runners as `node <cli.js>` with an explicit `cwd`,
  the way every other step here already does.
*/

/**
 * Every source file under `roots`, with comments blanked LINE-PRESERVINGLY.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS EXISTS BECAUSE THE TWO GREP GUARDS BELOW COULD PASS HAVING READ NOTHING.
 *
 * Both walked a directory with `if (!fs.existsSync(dir)) return;` at the top,
 * collected hits into an array, and reported `ok: true` with a reassuring
 * message when the array was empty. Rename `backend/models`, or move
 * `src/api/(ext)/dex`, and both printed "no model imports an addon tree" and
 * "no ECO wallet literal" — having opened zero files. That is the failure this
 * whole gate is written against, sitting inside the gate.
 *
 * Every regex guard beside them (route-permissions, docs-reality, initial-sql,
 * design, dex-invariants) runs `--self-test` FIRST for exactly this reason. The
 * two `fn` guards had no equivalent, so the floor below is theirs: the caller
 * declares how many files it expects to find AT MINIMUM, and finding fewer is a
 * FAILURE naming the count rather than a pass.
 *
 * Two narrower blind spots go with it. The walkers took `.ts` only, so a `.js`,
 * `.mjs` or `.tsx` in either tree was invisible to a rule that is about what
 * ships, not about what TypeScript compiles. And they matched `from "…"` and
 * `require("…")` only — a dynamic `await import("…")` walked straight past.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function readCodeFiles(roots, { floor, what }) {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (CODE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) files.push(full);
    }
  };
  roots.forEach(walk);

  if (files.length < floor) {
    return {
      shortfall:
        `only ${files.length} source file(s) found under ${roots
          .map((r) => rel(r))
          .join(", ")} — this guard expects at least ${floor}. ` +
        `It is reporting on ${what} it never read: a moved or renamed directory makes ` +
        `this check pass by scanning nothing, which is the exact illusion it exists to ` +
        `catch. Fix the path, or lower the floor deliberately and say why.`,
      files: [],
    };
  }

  return {
    shortfall: null,
    files: files.map((full) => ({
      full,
      /* Comments blanked, not removed: both guards' own prose names the thing
         they ban, and line numbers have to keep pointing at the real offender. */
      lines: fs
        .readFileSync(full, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, "")),
    })),
  };
}

/**
 * Reachability probe for the lanes that need a running server. Returns a reason
 * string when the URL is NOT usable, or null when it is.
 *
 * A 4xx counts as reachable: /api/settings answering 401 still proves the
 * backend is up, and the point of the probe is "is there a server", not "am I
 * authorised". Only a transport failure or a 5xx means there is nothing to test
 * against.
 */
async function unreachable(url) {
  try {
    const res = await fetch(url, {
      /*
        DO NOT FOLLOW REDIRECTS.

        `http://127.0.0.1:3000/` answers 307 to `/en`, and following it makes
        this probe wait for Next to COMPILE that page on a cold dev server —
        which routinely takes longer than the timeout below. The result was the
        gate skipping its most valuable lane ("frontend not serving steadily")
        against a server that was perfectly healthy and had just answered the
        redirect in nine milliseconds.

        The 307 is already the proof we want: the process is up, listening, and
        routing. What this probe exists to catch is a DEAD or RESTARTING server,
        and a dead one does not redirect.
      */
      redirect: "manual",
      signal: AbortSignal.timeout(2500),
    });
    return res.status >= 500 ? `HTTP ${res.status}` : null;
  } catch (error) {
    return error.message;
  }
}

/* ── order-scale preflights (eco-perf, eco-chaos) ────────────────────────── */

/**
 * One key of the repo `.env`, the way the perf drivers read it
 * (e2e/live/ecosystem/perf/spawn.ts repoEnv): the process environment first,
 * then the file, then the fallback. The gate loads no dotenv, so the clone
 * and Scylla probes below need this to reach the same server the drivers do.
 */
function repoEnvValue(key, fallback = "") {
  const fromProcess = process.env[key];
  if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;
  try {
    const text = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0 || line.slice(0, eq).trim() !== key) continue;
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return value || fallback;
    }
  } catch {
    /* no .env: the fallback */
  }
  return fallback;
}

/** The mysql client the drivers' clone.ts uses: MYSQL_BIN, then XAMPP's, then PATH. */
function mysqlClient() {
  const candidates = [
    process.env.MYSQL_BIN ? path.join(process.env.MYSQL_BIN, WIN ? "mysql.exe" : "mysql") : null,
    WIN ? "C:/xampp/mysql/bin/mysql.exe" : null,
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return hasBinary("mysql") ? "mysql" : null;
}

/**
 * Does the probe clone exist with tables in it? Returns null when it does, or
 * the reason it cannot be used. Never names a database without "probe" or
 * "test" in it, the same rule the drivers enforce (spawn.ts assertProbeDatabase).
 */
function cloneMissing(name) {
  const folded = String(name).toLowerCase();
  if (!folded.includes("probe") && !folded.includes("test")) {
    return `"${name}" is not a probe or test database name; the lane refuses it`;
  }
  const client = mysqlClient();
  if (!client) return "no mysql client found (MYSQL_BIN, C:/xampp/mysql/bin, PATH)";
  const args = ["-h", repoEnvValue("DB_HOST", "localhost"), "-P", repoEnvValue("DB_PORT", "3306"), "-u", repoEnvValue("DB_USER", "root")];
  const password = repoEnvValue("DB_PASSWORD", "");
  if (password) args.push(`-p${password}`);
  args.push("-N", "-B", "-e", `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${name.replace(/'/g, "''")}'`);
  const res = spawnSync(client, args, { encoding: "utf8", timeout: 15_000, windowsHide: true });
  if (res.error || res.status !== 0) {
    return `mysql client could not query information_schema (${res.error?.message || (res.stderr || "").trim() || `exit ${res.status}`})`;
  }
  const tables = Number(String(res.stdout).trim()) || 0;
  if (tables === 0) return `clone ${name} is absent or empty`;
  return null;
}

/**
 * Is the Scylla VM answering on its CQL port? A plain TCP connect with a
 * short timeout: the drivers' backend creates its keyspace at boot
 * (ecosystem/utils/scylla/client.ts), so "the port accepts" is the whole
 * precondition. SCYLLA_CONNECT_POINTS is "host:port[,host:port]" in the .env.
 */
async function scyllaDown() {
  const points = repoEnvValue("SCYLLA_CONNECT_POINTS", "127.0.0.1:9042").split(",").map((s) => s.trim()).filter(Boolean);
  const [host, portText] = (points[0] || "127.0.0.1:9042").split(":");
  const port = Number(portText) || 9042;
  const net = await import("node:net");
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (reason) => {
      socket.destroy();
      resolve(reason);
    };
    socket.setTimeout(2500, () => done(`no answer from ${host}:${port} within 2.5 s`));
    socket.once("connect", () => done(null));
    socket.once("error", (e) => done(`${host}:${port} ${e.code || e.message}`));
  });
}

/** The tsx form of the e2e package scripts (see the dex-live step), for one driver file. */
function tsxDriverCmd(driverRelPath, extraArgs, timeoutMs) {
  return {
    cmd: process.execPath,
    args: [
      path.join(E2E, "node_modules", "tsx", "dist", "cli.mjs"),
      "--tsconfig",
      path.join("..", "backend", "tsconfig.json"),
      "-r",
      "dotenv/config",
      "-r",
      path.join("..", "backend", "module-alias-setup.ts"),
      driverRelPath,
      "dotenv_config_path=../.env",
      ...extraArgs,
    ],
    cwd: E2E,
    timeoutMs,
  };
}

/**
 * Is `url` up AND STAYING up?
 *
 * A SINGLE PROBE IS NOT ENOUGH, and this is measured rather than defensive.
 * The e2e lane failed intermittently — twice green, twice red across four full
 * runs — and the captured evidence was always the same shape: the browser specs
 * got `ERR_CONNECTION_REFUSED` and 500s from :4000 PART WAY THROUGH the run,
 * with "the server may be offline or restarting" in the console.
 *
 * The cause, from the dev server's own log: the backend runs under nodemon, a
 * second workstream was editing backend files throughout, each edit drove a hot
 * reload, and eventually
 *   [nodemon] app crashed - waiting for file changes before starting...
 * A three-minute browser suite that starts during that window does not report a
 * broken backend — it reports fifty-eight findings about the PRODUCT, which is
 * the worst possible way to be told your dev server died.
 *
 * One probe can pass against a process that is a second away from being killed,
 * or against one that is half-booted and about to 500. Requiring several
 * CONSECUTIVE successes, spread over a few seconds, turns "it answered once"
 * into "it is actually serving", which is the property the specs need.
 *
 * This does not make the gate wait for a backend that is down — that still
 * reports unreachable immediately on the first probe. It only refuses to
 * proceed while one is visibly flapping.
 */
async function unstable(url, { probes = 4, gapMs = 750 } = {}) {
  let consecutive = 0;
  let lastError = null;
  for (let i = 0; i < probes; i++) {
    const down = await unreachable(url);
    if (down) {
      lastError = down;
      consecutive = 0;
    } else {
      consecutive += 1;
    }
    if (i < probes - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
  if (consecutive === probes) return null;
  return lastError ?? "answered intermittently";
}

/* ── the step table ──────────────────────────────────────────────────────── */

/**
 * Every entry is `{ id, title, why, fast, full, required, cmds | fn, preflight }`.
 *
 *   fast      selected by --fast (and therefore by the pre-push hook)
 *   full      selected ONLY by --full — too slow for a default run
 *   required  a failed preflight is a FAILURE rather than a SKIP (see header)
 *   cmds      run in order; the first non-zero status fails the step
 *   fn        in-process check returning { ok, message }
 *   preflight () => null | { reason, fix }   may be async
 *
 * Local runner entrypoints are invoked as `node <path/to/cli.js>` rather than
 * through npx/pnpm. On Windows every one of those is a .cmd shim and Node
 * refuses to spawn a .cmd without a shell; going through `node` keeps the
 * argument vector intact, which matters because three of the eslint patterns
 * contain `(ext)` and `[locale]` — characters a shell would mangle.
 */
const STEPS = [
  {
    id: "routes",
    title: "route manifest is not stale",
    why: "A stale manifest lets a CMS page claim a live route and 404 silently.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["tools/build-route-manifest.js", "--check"] }],
  },
  {
    id: "model-columns",
    title: "every column named in a query exists on that model",
    why:
      "The deposit reversal engine resolved its wallet by `transaction.currency`, a column that " +
      "does not exist, so no refund or chargeback on any gateway ever reached a wallet. The " +
      "typecheck cannot see a property read on a loose row, and a hand-built fixture that HAS " +
      "the property makes every unit test pass.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-model-columns.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-model-columns.mjs"] },
    ],
  },
  {
    id: "sql-tables",
    title: "every table named in raw SQL exists",
    why:
      "The NFT creator analytics route selected FROM nft_sales and nft_tokens; the tables are " +
      "nft_sale and nft_token, so every figure it returned was a SQL error. A mocked " +
      "`sequelize.query` never runs the string, so the SQL can say anything.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-sql-tables.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-sql-tables.mjs"] },
    ],
  },
  {
    id: "enum-values",
    title: "every enum literal written or filtered on is in that column's ENUM",
    why:
      "The admin dashboard filtered exchangeOrder on status FILLED, which that ENUM has never " +
      "held, so its trades chart, its trend and its top-assets table matched zero rows on every " +
      "install, forever, with no error anywhere.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-enum-values.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-enum-values.mjs"] },
    ],
  },
  {
    id: "metadata-contract",
    title: "every transaction.metadata key read is written by some producer",
    why:
      "The spot approval door read metadata.currency, which no producer writes, so every manual " +
      "spot withdrawal approval answered 400 and the whole path was dead.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-metadata-contract.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-metadata-contract.mjs"] },
    ],
  },
  {
    id: "settings-keys",
    title: "settings keys are both writable and read",
    why:
      "A key the backend reads that no screen can write is a behaviour no operator can change; a " +
      "control that nothing reads is a lie told to an operator. Both ship silently.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-settings-keys.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-settings-keys.mjs"] },
    ],
  },
  {
    id: "idempotency-keys",
    title: "every money idempotency key is scoped to its own operation",
    why:
      "checkIdempotency matches globally across the whole transaction table, so a key scoped to a " +
      "wallet makes the SECOND refund on that wallet a silent no-op after the status flip has " +
      "already committed.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-idempotency-keys.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-idempotency-keys.mjs"] },
    ],
  },
  {
    id: "refund-atomicity",
    title: "every money-return door is atomic, raced-safe and dispatch-guarded",
    why:
      "The admin delete path paid an investment's principal back a second time under a different " +
      "key AND a different referenceId, so neither unique index deduped it: a matured 1,000 " +
      "deleted at the wrong moment paid 2,050.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-refund-atomicity.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-refund-atomicity.mjs"] },
    ],
  },
  {
    id: "swallowed-errors",
    title: "no money path swallows its own failure",
    why:
      "A Paystack status poll committed the row as final and then credited; a credit that threw " +
      "left a paid customer with no balance and every other door refusing to retry it.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-swallowed-errors.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-swallowed-errors.mjs"] },
    ],
  },
  {
    id: "ws-contract",
    title: "every client subscription can be matched by a broadcast on its route",
    why:
      "The NFT market feed reached nobody: the client subscribed under one payload shape and the " +
      "route broadcast under another. Subscribes succeeded, broadcasts returned, the zero-match " +
      "was a DEBUG line.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-ws-contract.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-ws-contract.mjs"] },
    ],
  },
  {
    id: "i18n-keys",
    title: "every rendered translation key exists, in every catalogue",
    why:
      "A missing key renders the KEY on the page. 46 strings shipped English-only, including the " +
      "wallet-transfer confirmation step, where 89 locales read \"Set pin\" and \"Or\" mid-page.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-i18n-keys.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-i18n-keys.mjs"] },
    ],
  },
  {
    id: "route-response",
    title: "the frontend only reads fields its route returns",
    why:
      "A missing field is undefined, which renders as blank, zero or an empty list — never as an " +
      "error. That is the same silence as an empty featured-pool list, read from the other side.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-route-response.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-route-response.mjs"] },
    ],
  },
  {
    id: "api-inventory",
    title: "non-admin API inventory is not stale",
    why: "The mobile app is built against this list; a drifted path ships a client that 404s.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["tools/build-api-inventory.js", "--check"] }],
  },
  {
    id: "addon-menus",
    title: "addon menu registry matches the extension tree",
    why: "An unregistered addon menu is invisible in the nav with no error anywhere.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["tools/build-addon-menus.js", "--check"] }],
  },
  {
    id: "permissions",
    title: "permissions.json matches the route sources",
    why: "An admin route with no manifest entry is an UNGATED admin route, and nothing else looks.",
    fast: true,
    required: true,
    /*
      ───────────────────────────────────────────────────────────────────────────
      THE GATE USED TO REGENERATE THE FILE AND THEN `git diff` IT. IT WROTE.

      Two commands: `node tools/build-permission.js` (which writes
      frontend/middlewares/permissions.json) and `git diff --exit-code` on that
      path. Three things were wrong with it, in rising order of cost:

        1. A CHECK THAT MUTATES THE TREE. Running the gate edited a tracked file
           — on a dirty tree, on a release branch, inside someone else's staged
           work. The failure output was `git diff`'s, so the answer to "what is
           stale" was a patch the gate itself had just created.
        2. IT WAS BLIND ON AN ALREADY-DIRTY FILE. If permissions.json was
           modified before the run, the diff was non-empty whatever the
           generator produced, and if it was staged and identical, `git diff`
           (unstaged only) reported nothing. Neither answer is about drift.
        3. THE PREMISE WAS STALE. `tools/build-permission.js` grew a `--check`
           mode (tools/build-permission.js:266), which collects the same entries
           IN MEMORY, compares them against the committed manifest and reports
           the three drift classes by name — source-only (an ungated admin
           route), manifest-only, and key-changed — plus the unparseable
           permission.ts files that silently fall back to `access.admin`. It
           writes nothing at all.

      So the step now runs `--check`. Nothing is regenerated, nothing is
      compared against a temporary copy, and the report names the routes rather
      than the bytes. `node tools/build-permission.js` (no flag) is still how a
      person fixes what it reports, which is what `onFail` says.
      ───────────────────────────────────────────────────────────────────────────
    */
    cmds: [{ cmd: process.execPath, args: ["tools/build-permission.js", "--check"] }],
    onFail:
      "permissions.json is stale — resolve each category named above on its own merits (a " +
      "source-only path is an UNGATED admin route), then run `node tools/build-permission.js` " +
      "in a standalone commit touching only that file.",
  },
  {
    id: "chain-registries",
    title: "a built-in chain is declared in every registry that describes it",
    why:
      "Four structures describe a chain and nothing keeps them in step: ChainType and " +
      "CHAIN_CONFIG and EVM_CHAINS in services/wallet, and chainConfigs in the ecosystem " +
      "addon. customChains.ts hydrates all four for operator-added chains and says so in " +
      "its header — but built-in chains are hardcoded in each place separately, and they " +
      "drifted BOTH ways. AVAX and LINEA are in the wallet service and absent from " +
      "chainConfigs, so isEvmChain() is true and AddressGenerationService hands out a " +
      "deposit address for a chain with no provider, no deposit monitor and no balance " +
      "reader — funds sent there are never credited. RSK, HECO and CRONOS are the reverse " +
      "and fail safe, throwing UNSUPPORTED_CHAIN. This is a RATCHET: those five are " +
      "allowlisted, anything new fails.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["tools/check-chain-registries.mjs", "--self-test"] }],
    onFail:
      "Add the chain to every registry, or to none. The wallet-service direction is the " +
      "dangerous one — never ship a chain that can generate an address the ecosystem " +
      "cannot monitor. See plans/revenue-programme/04-WAVE-2-DEFECTS.md task 2.8.",
  },
  {
    id: "template-claims",
    title: "no page-builder template claims a capability the platform lacks",
    why:
      "These templates ship inside the product. An operator drags a section onto their live " +
      "site and publishes the copy verbatim — about a financial product, in their name, with " +
      "our code behind it. So the claim is one WE manufactured, and they cannot make it true " +
      "by editing. The tree shipped FIX 4.4 and 5.0 support, a Singapore colocation with a " +
      "400-microsecond round trip, SOC 2 Type II, ISO 27001, yearly PwC audits and fourteen " +
      "separate 99.99% uptime SLAs. None of it exists. Invented business metrics are NOT " +
      "policed here — an operator knows to replace $4.2B in volume; the line is whether " +
      "editing can make the sentence true.",
    fast: true,
    required: true,
    /*
      Self-test first, same reason as route-permissions: a source-scanning
      guard fails silently. A hand grep for these strings missed EIGHT of them
      — "Co-location" with the hyphen, "sub-50ms", a three-nines 99.9% — which
      is why this is a script and not a habit.
    */
    cmds: [{ cmd: process.execPath, args: ["tools/check-template-claims.mjs", "--self-test"] }],
    onFail:
      "Either the platform does the thing, or the copy goes. Prefer deletion — a reworded " +
      "latency claim is still a number nobody measures. See " +
      "plans/revenue-programme/03-WAVE-1-HONEST.md task 1.1.",
  },
  {
    id: "claims",
    title: "no shipped copy claims custody, insurance, an audit, a certification or an uptime",
    why:
      "The step above guards ONE directory. Everything else the buyer reads shipped " +
      "unguarded: the app's own screens, the English catalogue that 90 translations are " +
      "generated from, the operator console, the Flutter app and the AI support prompts. " +
      "The 26 Aug 2026 honesty sweep confirmed seventy-six claims across them that no " +
      "operator can edit into truth — segregated accounts and cold storage on a product " +
      "whose money is a `balance` column, insurance on a product with no policy, audited " +
      "contracts on a product with no contracts, military-grade escrow on a row transition. " +
      "Invented business metrics are NOT policed, same line as above: the test is whether " +
      "editing can make the sentence true.",
    fast: true,
    required: true,
    /*
      Self-test first, and this one is not a formality. The template guard's
      uptime rule read `99\.9{1,3}` — three NINES, not three digits — so it
      could not match 99.98%, and two fabricated figures shipped inside the tree
      it guards while it reported green, one of them labelled "UPTIME (12M)" on
      an addon with no validators. A guard with a hole in it is indistinguishable
      from a clean tree, so every rule here carries a fixture of every spelling
      the claim can take, the self-test proves each one fires AND stays silent on
      the legitimate string, and then falls through to the real scan.

      It carries an OPEN register of known-but-unfixed claims, printed on

      every run and never silenced. It landed holding seven — the ones this

      guard found on its first real run, every one of them missed by the

      106-agent sweep before it — and they were settled rather than carried,

      so it is empty today. The register can only shrink: the guard FAILS on

      a stale entry, and FAILS if an unrendered one is wired to a component.
    */
    cmds: [{ cmd: process.execPath, args: ["tools/check-claims.mjs", "--self-test"] }],
    onFail:
      "Either the platform does the thing, or the copy goes. If the string is legitimate — " +
      "the DEX really is non-custodial, the futures insurance ledger really exists — narrow " +
      "the rule and add the sentence to tools/fixtures/claims/<rule>.ok.txt, so the next " +
      "person cannot widen it back. Never a blanket suppression. See " +
      "plans/revenue-programme/15-HONESTY-SWEEP.md §3.",
  },
  {
    id: "mobile-policy",
    title: "the Flutter app carries nothing a store forbids",
    why:
      "The mobile compliance programme removed products from the app, gated others on the " +
      "server, and rewrote copy that reads as an investment claim. Each of those is a " +
      "sentence in a plan, and a plan does not survive the next feature. It has already " +
      "failed once quietly: the MLM tile was deleted in an earlier wave and read as done, " +
      "while the slice stayed on disk — 64 files, registered in the DI container, therefore " +
      "reachable from main.dart, therefore compiled into every binary an operator shipped, " +
      "in an app submitted to a store whose policy names multi-level marketing. An absent " +
      "tile is not an absent feature. This also fails on a screen class nothing can navigate " +
      "to (Apple 2.3.1), a tile id the server manifest does not publish, and copy that " +
      "promises a return, points at an outside purchase, or says \"coming soon\".",
    fast: true,
    required: false,
    /*
      NOT `required`. mobile/ is gitignored here and absent from a customer's
      package, so the checker skips cleanly when it cannot see its subject —
      but it says so rather than reporting green.
    */
    cmds: [{ cmd: process.execPath, args: ["tools/check-mobile-policy.mjs", "--self-test"] }],
    onFail:
      "Fix the app, not the list. If a pattern is genuinely wrong, narrow it and add the " +
      "sentence to the checker's false-positive set so the next person cannot widen it back.",
  },
  {
    id: "route-permissions",
    title: "every backend route gate names a permission the seeder can create",
    why:
      "backend/seeders/20240402234643-permissions.js is the ONLY writer to the `permission` " +
      "table — nothing in backend/src creates one and the admin screen is read-only. A key " +
      "it does not list is not unseeded, it is UNGRANTABLE, and rolesGate 403s every " +
      "non-Super-Admin forever with nothing logged. Super Admin bypasses the gate by NAME, " +
      "so whoever tests the feature sees it work.",
    fast: true,
    required: true,
    /*
      THE SELF-TEST RUNS FIRST, for the same reason `dex-invariants` runs its
      own first: a source-scanning guard fails silently. If the scanner stops
      recognising `permission:` on a metadata object, the tree is "clean"
      forever and the output is indistinguishable from a real pass. The
      fixtures are checked against the parser BEFORE the parser is trusted
      against 1100+ route files.
    */
    cmds: [
      { cmd: process.execPath, args: ["tools/check-route-permissions.js", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-route-permissions.js"] },
    ],
    onFail:
      "Run `pnpm extract:permission` to rebuild the seeder from the sources, then READ the " +
      "diff before committing — it also deletes keys nothing references, and a deletion " +
      "revokes that grant on every install.",
  },
  {
    id: "guide-anchors",
    title: "every assistant walkthrough points at an element that exists",
    why:
      "A guide is a BACKEND catalogue naming FRONTEND `data-tour` anchors, and nothing else " +
      "can see both ends. `tsc` cannot — they are strings. The unit suite cannot — the " +
      "backend has no DOM. A stop naming an anchor no page carries degrades silently to a " +
      "centred card with no highlight, so the assistant appears to point at nothing, and the " +
      "first person to find out is a customer being walked through a withdrawal form. On its " +
      "first run this caught four invented stops on the deposit page, which has neither the " +
      "amount box nor the submit button they described.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["tools/check-guide-anchors.mjs"] }],
    onFail:
      "Either add `data-tour=\"<anchor>\"` to the element the stop means, or delete the stop " +
      "from backend/src/api/(ext)/ai/support/utils/guides.ts. Do NOT reach into a shared " +
      "component to satisfy one guide — point at the region and say which control to read.",
  },
  {
    id: "docs-reality",
    title: "every path, key and endpoint the docs name actually exists",
    why:
      "The documentation is not reference material a human might skim — it is the corpus the " +
      "AI support agent retrieves and answers from. 193 operator pages were written straight " +
      "from the code and then fact-checked against it: 268 factual errors, a 72% defect rate, " +
      "and not one of them failed a build, because prose does not compile. A page naming " +
      "`access.cron` where the route wants `manage.cron` is not a typo a reader can see past; " +
      "it is retrieved, cited, and sent to an operator as fact. This checks the half that can " +
      "be checked — screen paths, permission keys, API endpoints — which is also the half that " +
      "rots silently the moment somebody renames something.",
    fast: true,
    required: true,
    /*
      THE SELF-TEST RUNS FIRST, same as `design` and `dex-invariants`, and for the
      same reason: every rule is a regex over prose, so its failure mode is not a
      false alarm but SILENCE — the pattern stops matching, nothing is extracted,
      and an empty result is exactly what a clean corpus looks like. The check
      also carries a floor on how many references it found, for the same reason.
    */
    cmds: [
      { cmd: process.execPath, args: ["tools/check-docs-reality.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-docs-reality.mjs"] },
    ],
    onFail:
      "Correct the path or key to the one that exists, or — if it never existed — rewrite the " +
      "sentence so it stops claiming it, WITHOUT inventing a replacement. A page may say a " +
      "screen does not exist: the checker skips a reference whose line carries a negation, so " +
      "\"there is no `/admin/x`\" passes while \"open `/admin/x`\" does not.",
  },
  {
    id: "assistant-catalogue-i18n",
    title: "every assistant catalogue entry has an English message to translate",
    why:
      "The same three catalogues hold the words a CUSTOMER reads — every walkthrough stop, " +
      "every process step, every offered action — and `prompt.ts` tells the model to answer " +
      "in the customer's own language, so a Spanish answer used to arrive with an English " +
      "button underneath it. The renderers now look each string up by catalogue key and fall " +
      "back to the constant on the wire, which is what keeps an upgrade from showing a raw " +
      "key path to a customer — and is also what makes a missing message SILENT. Nothing " +
      "else sees both ends: `tsc` cannot (both sides are strings), and the key extractor " +
      "cannot (the lookup is computed, so it captures the literal `guides.${key}.title`).",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["tools/check-support-assistant-keys.mjs"] }],
    onFail:
      "Add the missing ids to frontend/messages/en.json under `support_assistant`, copying " +
      "each constant from the catalogue VERBATIM. The backend keeps its English — it is the " +
      "renderer's fallback — so this is a copy, not a move. Do not translate `what` on a " +
      "guide or a workflow: it is model-facing and goes into the tool description.",
  },
  {
    id: "duplicate-declarations",
    title: "no scope declares the same name twice",
    why:
      "The backend stopped compiling on 2026-08-12 because one block had been applied over a " +
      "tree that already contained it: two `const expiringRemainders` ten lines apart in the " +
      "matching engine's persist path. `tsc` reports exactly that (TS2451) and `tsc` is NOT on " +
      "this path — the backend typecheck needs ~8 GB and minutes, so it is `--full` only, which " +
      "means a break of this class can be committed and pushed and found later by whoever pulls " +
      "it. Two sessions were editing the file, so neither saw both halves. This finds the same " +
      "thing by PARSING, in seconds over the whole tree, with no type information: every case it " +
      "reports is a hard error under any config, so it can never disagree with the compiler.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-duplicate-declarations.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-duplicate-declarations.mjs"] },
    ],
    onFail:
      "Open the file at the lines named and delete the STALE copy — keep whichever block carries " +
      "the newer reasoning, which is usually the one with the extra guard. Then run the backend " +
      "typecheck (`cd backend && npx tsc -p tsconfig.json --noEmit`) before committing: a patch " +
      "applied twice often leaves more than one trace.",
  },
  {
    id: "icon-names",
    title: "every icon is on disk and every stored icon name resolves",
    why:
      "`<Icon icon=\"mdi:foo\">` from @iconify/react resolved a glyph by FETCHING its set from " +
      "api.iconify.design when the component mounted. An operator behind a firewall served pages " +
      "with no icons and could not fix it from their own egress rules, because the request comes " +
      "from every VISITOR's browser rather than their server — and it was the slow path anyway, " +
      "since nothing could start loading until the bundle had hydrated, then a cold handshake to " +
      "an origin that cannot share our HTTP/2 connection. The tell that this needed a gate is " +
      "that THREE files had already reasoned it out and could only fix themselves, while 141 " +
      "others drifted the other way. The second half matters as much: a local glyph cannot be " +
      "conjured at runtime, so a name the registry does not know renders NOTHING — where the CDN " +
      "would have covered a typo, this fails the build instead.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-icon-names.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-icon-names.mjs"] },
    ],
    onFail:
      "For a CDN import: swap it for a direct `lucide-react` import when the glyph is known at " +
      "author time, or `import { Icon } from \"@/components/ui/icon\"` when the name arrives as " +
      "data. For an unresolved name: add it to ICONS in frontend/components/ui/icon.tsx, mapping " +
      "by MEANING — `mdi:cash-multiple` is a banknote, not a cash-register — and give dynamic " +
      "call sites a `fallback` so an unknown name still draws something.",
  },
  {
    id: "initial-sql",
    title: "initial.sql creates every table the models declare",
    why:
      "initial.sql is the schema a FRESH install imports, and it is the ONLY schema the " +
      "seeders ever see — install order is import -> seed -> build -> start, and the backend's " +
      "`alter` sync does not run until that last step. So a table the dump is missing is " +
      "INVISIBLE on every existing install (boot creates it) and fatal on a new one, and " +
      "`db:seed:all` aborts the whole run on the first error: a live install died on " +
      "`Table 'zervex.withdraw_gateway' doesn't exist` and finished with no DEX tokens, no " +
      "AI-support persona and no repaired ticket statuses, none of it reported. The file had " +
      "drifted 83 tables behind the models because nothing connected the two. Table names are " +
      "compared from source alone, so this needs no database; column, index and enum drift " +
      "needs a live server and lives in `pnpm initial-sql:check`.",
    fast: true,
    required: true,
    /*
      SELF-TEST FIRST, same argument as `route-permissions` and `design` below:
      both halves of this check are regexes over text nobody validates, so if
      `tableName:` moves behind a helper the scanner finds zero models, reports
      a clean tree, and every release after that ships a stale schema green.
    */
    cmds: [
      { cmd: process.execPath, args: ["tools/check-initial-sql.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-initial-sql.mjs"] },
    ],
    onFail:
      "Run `pnpm initial-sql` (needs a reachable MySQL/MariaDB — it builds the schema in a " +
      "throwaway database and dumps it) and commit the regenerated file. Do NOT hand-append a " +
      "CREATE TABLE: the point of the generator is that the models stay the only authority.",
  },
  {
    id: "sbom",
    title: "software bill of materials matches the dependencies we ship",
    why:
      "CRA Annex I Part II(1) requires an SBOM covering at least top-level dependencies, kept " +
      "current for the whole support period of each product — and our customers' own DORA and " +
      "NIS2 auditors will ask for it before the regulator does. An SBOM is only worth having if " +
      "it is true, and the way it stops being true is somebody adding a dependency and not " +
      "thinking about it, which is every dependency. This costs milliseconds: it reads four " +
      "package manifests and compares, with no network and no install.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["scripts/generate-sbom.mjs", "--check"] }],
    onFail:
      "Run `pnpm sbom` and commit the regenerated files in `sbom/`. The failure names what " +
      "drifted, and it is not always a dependency: a release version bump moves all three npm " +
      "documents on its own. If a new dependency is build-time only it belongs in " +
      "devDependencies, where the SBOM correctly ignores it.",
  },
  {
    id: "stale",
    title: "no files a previous release retired",
    why: "A leftover route file still builds, and still fails, on every updated install.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["scripts/clean-stale-files.mjs", "--check-strict"] }],
    onFail: "Run `pnpm clean:stale` to delete them, or add the path deliberately if it is new.",
  },
  {
    id: "bytes",
    title: "no source file is invisible to a repo-wide scan",
    why:
      "A raw NUL byte makes ripgrep classify a file as BINARY and skip it entirely, so every " +
      "scanner here - the design-debt sweep, check-docs-reality, the addon greps - silently " +
      "misses it. Nine tracked files carried one, including four backend/dist twins that ship.",
    fast: true,
    required: true,
    cmds: [
      { cmd: process.execPath, args: ["tools/check-source-bytes.mjs", "--self-test"] },
      { cmd: process.execPath, args: ["tools/check-source-bytes.mjs"] },
    ],
    onFail:
      "Rewrite the byte as its escape (\\u0000, or \\xNN to match neighbouring escapes) - " +
      "identical at runtime. Never add a suppression, and do the backend/dist twin too.",
  },
  {
    id: "superseded",
    title: "no caller still reads through a function that was replaced",
    why:
      "A reader replaced because it was money-wrong keeps its callers unless something enforces " +
      "the move. getOrdersByUserId returns ONE Scylla page; an emergency stop and a copy-trading " +
      "cancel both searched it and reported an account clear while orders sat funded and resting.",
    fast: true,
    required: true,
    cmds: [{ cmd: process.execPath, args: ["tools/check-superseded.mjs"] }],
    onFail:
      "Move the caller to the replacement, or add it to that annotation's allow-list WITH a " +
      "written reason why one page is genuinely enough there.",
  },
  {
    id: "design",
    title: "design system: token mirror, rule self-test, debt ratchet, backlog budget",
    why:
      "The design system had eleven enforced dimensions and NO lane here, so the only thing " +
      "running it was a human remembering to. That is how `skeleton:check` went red and stayed " +
      "red without ever telling anyone. It costs a few seconds.",
    fast: true,
    required: true,
    /*
      THE SELF-TEST RUNS FIRST, and inside `--check` as well — the same argument
      as `permissions` and `dex-invariants` above, and the design scanner is the
      guard that most needs it. Every one of its rules is a regex over source
      text, so its failure mode is not a false alarm but SILENCE: the rule stops
      matching, the counter reads 0, and 0 is exactly what success looks like.
      That has happened twice (a pipe-joined string spread into single
      characters; a rule still spelling the Tailwind v3 gradient alias after the
      tree moved to v4), and both times it was found months later by a human
      re-reading the regex rather than by anything failing.
    */
    cmds: [
      { cmd: process.execPath, args: [path.join("scripts", "scan-design-debt.js"), "--self-test"], cwd: FRONTEND },
      { cmd: process.execPath, args: [path.join("scripts", "design-check.mjs")], cwd: FRONTEND },
    ],
    onFail:
      "`pnpm --filter frontend design:debt` lists the dimensions; `design:list <id>` names every " +
      "site. A ratchet dimension is fixed, never baselined. A backlog dimension that legitimately " +
      "went down is banked with `design:budget`.",
  },
  {
    id: "models-no-addon-imports",
    title: "no model file imports an addon tree",
    why: "backend/models ships with CORE and is require()d in full at boot; src/api/(ext)/<addon> ships only to buyers. One such import is a boot crash for every install without that addon.",
    fast: true,
    required: true,
    /*
      THE FAILURE THIS EXISTS AFTER, verbatim from a customer mid-`pnpm updator`:

          Error initializing models: Cannot find module
            '/home/x/public_html/backend/dist/src/api/(ext)/dex/utils/units'
          Require stack:
          - /home/x/public_html/backend/dist/models/ext/dex/dexChain.js

      Eleven dex models imported their shared regexes from the addon. The models
      shipped; the addon did not; `initModels()` require()s every model file
      before the server exists, so the install could not start AT ALL — and it
      failed during an update, which is the worst moment to be unable to boot.

      A GREP, NOT AN ESLINT RULE. `backend/eslint.config.mjs` lints `src/` only —
      nothing in the repo lints `backend/models`, so a rule there would be
      decorative. This reads the files.

      Shared code a model needs belongs in core: `backend/src/utils/<addon>/`,
      re-exported by the addon so its own call sites are unchanged.
    */
    fn() {
      /* 246 files today. The floor is well below that so ordinary churn does not
         trip it, and far above zero so a renamed `backend/models` cannot make
         this guard pass by reading nothing. */
      const { shortfall, files } = readCodeFiles([path.join(BACKEND, "models")], {
        floor: 100,
        what: "model files",
      });
      if (shortfall) return { ok: false, message: shortfall };

      const hits = [];
      for (const { full, lines } of files) {
        lines.forEach((line, i) => {
          // `import(` is here because a dynamic import is the same boot crash:
          // `initModels()` require()s every model file, and a lazy import of a
          // path that does not exist still resolves at call time on an install
          // that never shipped the addon.
          if (
            /\bfrom\s+["'][^"']*api\/\(ext\)\//.test(line) ||
            /\brequire\(\s*["'][^"']*api\/\(ext\)\//.test(line) ||
            /\bimport\(\s*["'][^"']*api\/\(ext\)\//.test(line)
          ) {
            hits.push(`${path.relative(ROOT, full)}:${i + 1}`);
          }
        });
      }
      return hits.length
        ? { ok: false, message: `model file importing an addon: ${hits.join(", ")}` }
        : { ok: true, message: `no model imports an addon tree (${files.length} files read)` };
    },
    onFail:
      "Move the shared code to backend/src/utils/<addon>/ (core, always shipped) and re-export it from the addon.",
  },
  {
    id: "core-routes-no-addon-imports",
    title: "no core API route imports an addon tree",
    why: "src/api/<core route> ships to everyone; src/api/(ext)/<addon> ships only to buyers. One such import is a broken route on every install without that addon.",
    fast: true,
    required: true,
    /*
      THE FAILURE THIS EXISTS AFTER, seen on a customer site 2026-09-07 when an
      admin tried to publish a blog post or add a page:

          (0 , faq_validation_1.sanitizeHTML) is not a function

      Six CORE routes — the blog post and content page create/update doors —
      imported `sanitizeHTML` from `api/(ext)/faq/utils/faq-validation`. The FAQ
      folder is a separately-sold product that the release strips from installs
      which did not buy it, so on those installs the module the routes destructure
      is not the one that shipped, and two admin features simply could not save.

      THE SIBLING GATE ABOVE COVERS `backend/models`, WHICH IS THE BOOT-FATAL
      CASE. This one is the request-time case, and it is worth its own gate
      because it is the one nobody notices until a customer reports it: the
      backend boots, the route loads, and only the handler body dies.

      SCOPE IS DELIBERATELY `src/api` MINUS `(ext)`. An addon importing another
      addon is a different question with a different answer (`@b/utils/safe-imports`
      — see the note at the top of that file), and `src/handler` / `src/utils`
      carry known static ecosystem imports that are tracked separately; widening
      this gate to them would make it fail on unrelated work-in-progress instead
      of on the mistake it is here to catch.

      STATIC IMPORTS ONLY, unlike the models gate above — and that asymmetry is
      the point. A model is require()d in full before the server exists, so a
      LAZY import of an absent addon is just as fatal there. A core route is
      different: a guarded `await import(...)` or `require(...)` behind a
      try/catch with a fallback is the SANCTIONED way to use an addon that may
      not be installed, and nine core routes do exactly that today
      (`finance/wallet/index.get.ts`, `admin/analysis.post.ts`, … each with a
      "Dynamic import for optional extension" comment and a working degraded
      path). Flagging those would be flagging the fix.

      What cannot degrade is the static form — `import { x } from "…(ext)/…"` —
      because the binding is resolved when the module is evaluated and there is
      no branch to take when it is missing. `from` appears only in static import
      and re-export syntax, never in `await import(...)`, so matching on it
      separates the two exactly. It also catches a multi-line import, whose
      specifier sits on the closing `} from "…"` line.
    */
    fn() {
      const apiRoot = path.join(BACKEND, "src", "api");
      /* ~4,000 core route files today. The floor is far below that so ordinary
         churn does not trip it, and far above zero so a moved tree cannot make
         this guard pass by reading nothing. */
      const { shortfall, files } = readCodeFiles([apiRoot], {
        floor: 500,
        what: "core API route files",
      });
      if (shortfall) return { ok: false, message: shortfall };

      // Addon trees are allowed to reference each other; only CORE is gated.
      const coreFiles = files.filter(
        ({ full }) => !full.split(path.sep).includes("(ext)")
      );

      const hits = [];
      for (const { full, lines } of coreFiles) {
        lines.forEach((line, i) => {
          if (/\bfrom\s+["'][^"']*api\/\(ext\)\//.test(line)) {
            hits.push(`${path.relative(ROOT, full)}:${i + 1}`);
          }
        });
      }
      return hits.length
        ? { ok: false, message: `core route statically importing an addon: ${hits.join(", ")}` }
        : {
            ok: true,
            message: `no core route imports an addon tree (${coreFiles.length} files read)`,
          };
    },
    onFail:
      "Move the shared code to backend/src/utils/ (core, always shipped) and re-export it from the addon so the addon's own call sites are unchanged — the shape used by src/utils/sanitize-html.ts.",
  },
  {
    id: "dex-no-eco",
    title: 'no "ECO" wallet literal anywhere in the DEX tree',
    why: "createEcoWallet MINTS AND PERSISTS PRIVATE KEYS. In a non-custodial addon that is the worst thing the code could do by accident.",
    fast: true,
    required: true,
    /*
      A GREP AS WELL AS THE ESLINT RULE, deliberately.

      `no-restricted-syntax` on Literal[value="ECO"] is the primary guard and it
      is better than this one — it understands syntax. But it lives in an eslint
      config that a future refactor can reorder, narrow, or lose in a merge, and
      the failure mode of losing it is silent. This survives that: it reads the
      files directly and knows nothing about eslint.
    */
    fn() {
      /*
        COMMENTS ARE BLANKED FIRST — `readCodeFiles` does it, both kinds, line
        preservingly.

        The first version of this scanned raw lines and immediately flagged
        `sweep.ts`, whose header comment explains why "ECO" is banned. A check
        that forbids documenting its own rule is not enforcing the rule; it is
        punishing the explanation. (The eslint rule got this right for free,
        because it reads syntax. This one has to be told.)

        116 files today across the two roots. The floor is what stops a moved
        DEX tree from printing "no ECO wallet literal" having read nothing —
        which, for a guard about minting private keys, is the worst possible
        thing for it to say by accident.
      */
      const roots = [
        path.join(BACKEND, "src", "api", "(ext)", "dex"),
        path.join(BACKEND, "models", "ext", "dex"),
      ];
      const { shortfall, files } = readCodeFiles(roots, {
        floor: 50,
        what: "DEX source files",
      });
      if (shortfall) return { ok: false, message: shortfall };

      const hits = [];
      for (const { full, lines } of files) {
        lines.forEach((line, i) => {
          if (/(["'])ECO\1/.test(line)) {
            hits.push(`${path.relative(ROOT, full)}:${i + 1}`);
          }
        });
      }
      return hits.length
        ? { ok: false, message: `"ECO" literal in the DEX tree: ${hits.join(", ")}` }
        : { ok: true, message: `no ECO wallet literal (${files.length} files read)` };
    },
    onFail:
      'The DEX sweep credits walletType "SPOT". "ECO" mints private keys — see dex/utils/sweep.ts.',
  },
  {
    id: "eslint-dex",
    title: "DEX trees pass eslint (incl. the no-custodial-imports rule)",
    why: "The custodial-import rule is the only thing keeping ecosystem internals out of DEX.",
    fast: true,
    required: true,
    /**
     * TWO COMMANDS, EACH IN ITS OWN PACKAGE, AND THAT IS THE WHOLE POINT.
     *
     * ESLint flat config resolves exactly ONE config file, from the working
     * directory. This step used to run all three paths from the repo root, so
     * every frontend file was linted under the ROOT config and
     * frontend/eslint.config.js never applied at all. The DEX wallet-facade
     * boundary lives in that file, so the rule this gate exists to enforce was
     * silently not being enforced — the step passed because it was checking the
     * wrong rules, which is worse than not running.
     *
     * AND NO `--no-error-on-unmatched-pattern`, WHICH IS THE SAME BUG AGAIN.
     * Both invocations carried it. Rename or move any of the three DEX
     * directories and eslint lints ZERO files, exits 0, and the step prints
     * PASS — the identical silent no-op the paragraph above documents having
     * already happened once, arriving by a different door. An unmatched DEX path
     * IS the failure: these directories are not optional, and eslint's own
     * "No files matching the pattern … were found" with a non-zero exit is
     * exactly the right report.
     */
    cmds: [
      {
        cmd: process.execPath,
        args: ["../node_modules/eslint/bin/eslint.js", "src/api/(ext)/dex"],
        cwd: BACKEND,
      },
      {
        cmd: process.execPath,
        args: [
          "../node_modules/eslint/bin/eslint.js",
          "--max-warnings",
          "0",
          "app/[locale]/(ext)/dex",
          "app/[locale]/(ext)/admin/dex",
        ],
        cwd: FRONTEND,
      },
    ],
    onFail:
      "If this says 'No files matching the pattern were found', a DEX directory moved. Fix the path here — do NOT add --no-error-on-unmatched-pattern back, which makes a missing tree indistinguishable from a clean one.",
  },
  {
    id: "vitest",
    title: "frontend unit suites (vitest)",
    why: "~2 s. There is no excuse for not running it.",
    fast: true,
    required: true,
    cmds: [
      {
        cmd: process.execPath,
        args: ["node_modules/vitest/vitest.mjs", "run", "-c", "vitest.config.ts"],
        cwd: E2E,
      },
    ],
  },
  {
    id: "vitest-store",
    title: "store unit suites (vitest)",
    why: "~2 s. Nothing else in this table has ever run them, and they live in a separate repository that gates nothing here.",
    fast: true,
    required: true,
    /*
      THESE SUITES EXISTED AND NO STEP RAN THEM, AND THEY NO LONGER LIVE HERE.

      They sat at `e2e/unit/store` behind a second vitest config, because the
      vitest binary was in e2e and `@` had to resolve to `../store` there while
      meaning `../frontend` in the config beside it. That was an accident of
      where the runner happened to be, and it put one product's tests inside
      another product's tree. They are the store's own now, at
      `store/e2e/unit`, run by the store's own vitest against a config that
      needs no alias gymnastics.

      THE STEP STAYS ANYWAY. The store is a separate repository, so nothing in
      its history gates a push here — and before this step existed, its money,
      crypto and routing arithmetic was covered by tests that no lane ran at
      all. Losing that on a technicality about which repo a file sits in would
      be the same hole with a better excuse.

      It SKIPS rather than fails when the store is not installed: it is a
      separate project with its own lockfile, so a repo-root install does not
      reach it, and a contributor who never touches the store should not be
      blocked by it. Skipped is not passed — the reason and the fix both print.
    */
    preflight: () =>
      fs.existsSync(path.join(STORE, "node_modules", "vitest"))
        ? null
        : {
            reason: "the store has no vitest installed",
            fix: "cd store && pnpm install - it is a separate project with its own lockfile, so the repo-root install does not reach it.",
          },
    cmds: [
      {
        cmd: process.execPath,
        args: [path.join(STORE, "node_modules", "vitest", "vitest.mjs"), "run"],
        cwd: STORE,
      },
    ],
    onFail:
      "The store i18n suites assert catalogue parity against the RAW on-disk files. A failure here usually means a locale is missing keys, carries orphans, or came back from the bulk translator still in English.",
  },
  {
    id: "connector-kit",
    title: "Hummingbot connector kit suites (python)",
    why:
      "The kit is the only Python in the repo, so every JS lane above is blind to it. " +
      "Its suites are hermetic — they load the modules under test straight off disk with " +
      "the framework stubbed — so they run in well under a second and need no Hummingbot install.",
    fast: true,
    /*
      NOT `required`, so a machine without Python SKIPS with a printed reason
      rather than failing. That is the one concession here: the kit's runtime
      dependency is Python and a Node-only checkout is a legitimate way to work
      on the platform.

      It is deliberately NOT silent. The header rule is that skipped is not
      passed, and a lane that quietly reports green on a machine that never ran
      it is worse than no lane — it is a claim nothing checks. The reason and
      the fix both print.
    */
    preflight: () =>
      PYTHON
        ? null
        : {
            reason: "no python3/python on PATH",
            fix: "Install Python 3 — it is required to run the connector kit at all.",
          },
    cmds: [
      {
        cmd: PYTHON || "python3",
        args: [
          "-m",
          "unittest",
          "discover",
          "-s",
          "hummingbot/tests",
          "-t",
          ".",
          "-p",
          "test_*.py",
        ],
      },
    ],
    onFail:
      "A connector-kit contract broke. test_retry_policy covers the transient-failure policy " +
      "(a refused CANCEL must be retried until it lands, a PLACEMENT must not be replayed after " +
      "a 5xx); test_bicrypto_auth_parity pins the HMAC signing contract against the backend's " +
      "hmacCore — if that one fails, fix BOTH sides together, never one in isolation.",
  },
  {
    id: "jest-unit",
    title: "backend unit suites (jest, the WHOLE project)",
    why: "Jest exits 1 when zero files match, and that is deliberate — see PH.16.",
    fast: true,
    required: true,
    /*
      ───────────────────────────────────────────────────────────────────────────
      THIS RAN 86 OF 241 FILES, AND THE OTHER 155 WERE RUN BY NO STEP IN ANY MODE.

      The step was `jest-dex`, filtered with `--testPathPatterns=[\\/]dex[\\/]`.
      Nothing else in the table ran jest, so `--fast`, the default run and
      `--full` all covered the DEX slice and nothing else: ai 62 files,
      forex-trading 39, p2p 10, auth 7, hb 7, utils 6, ecosystem 5,
      binary-engine 4, handler 4, copy-trading 2, notification 2, settings 2,
      staking 2, admin 1, futures 1, wallet 1.

      Three of the excluded files are the exact tests `REQUIRED_RED_RUNS` demands
      witnessed red runs for — P.QUERY.1 (`utils/get-filtered-paranoid`),
      P.TYPES.1 (`utils/model-types-enum-extraction`) and the jest half of
      P.AUTH.1 (`auth/optional-user-session-fallback`). The gate insisted on
      proof they could go red and then never ran them.

      The filter was written when ~15 legacy suites failed on mock drift. They
      have since been fixed. MEASURED just now, on this tree: the whole `unit`
      project is 241 suites / 4347 tests / 78.6s at eight workers — green, and
      cheaper than the DEX slice was under the default worker count.

      NO `--maxWorkers` HERE ANY MORE. It used to pass `--maxWorkers=8` to beat
      jest's default of (cores - 1), which is 31 on this box. jest.config.cjs now
      carries that cap itself — `maxWorkers: min(8, cpus/2)`, with the re-measured
      table beside it — so the flag had become a second copy of the same number,
      and two copies drift the first time either is tuned. What the gate runs is
      now exactly what `pnpm test:unit:backend` runs.
      ───────────────────────────────────────────────────────────────────────────
    */
    cmds: [
      {
        cmd: process.execPath,
        args: [
          "node_modules/jest/bin/jest.js",
          "-c",
          "jest.config.cjs",
          "--selectProjects",
          "unit",
        ],
        cwd: E2E,
        timeoutMs: 20 * 60_000,
      },
    ],
    onFail:
      "Zero matching files also fails here. --passWithNoTests is NOT the fix: an empty suite reporting success is the exact failure this gate exists to catch. If a legacy suite is failing on mock drift, fix the mock — do NOT narrow this back to a path filter, which is how 155 files came to be run by nothing.",
  },
  {
    id: "money-coverage",
    title: "coverage over the money-mutating files has not gone DOWN",
    why:
      "Nothing in this table ran the coverage lane, so `pnpm test:coverage` was a script whose " +
      "entire output was a report nobody read — and the numbers in it were zero, because the " +
      "coverage settings had never been able to see backend/src at all. A lane whose result is " +
      "unread is not weaker than no lane; it is a claim in the plans that nothing checks. This " +
      "runs the hermetic unit suites INSTRUMENTED and grades exactly twenty-three files: the wallet " +
      "service layer that every credit, debit, hold, release and transfer in the product goes " +
      "through, the three shared writers of `transaction` rows, and the six files of the ecosystem " +
      "order path (hold, settlement legs, fee credit, release-only refund; WP-0.11 of " +
      "plans/done/ORDER-SCALE-10K.md). They are named and defended " +
      "in e2e/shared/money-files.cjs, which is also where a new money file joins the ratchet. " +
      "It is a RATCHET — the floor is a number this tree already produced, and the check is that " +
      "it did not fall.\n" +
      "      DELIBERATELY NOT A GLOBAL PERCENTAGE. `backend/src` is 158,875 statements and a " +
      "whole-tree threshold is satisfied by testing formatters: it moves when a payment gateway " +
      "is added and does not move when WalletService is rewritten. A number that can be raised " +
      "without touching the risk is a number that will be.",
    fast: false,
    full: true,
    required: true,
    /*
      `--full` ONLY, and for the same reason typecheck-backend is: cost. The
      uninstrumented `unit` project is ~79s; instrumented, with the money trees
      crawled into the haste map so an untested file can be reported at 0%, it is
      minutes. "A gate a developer stops running is worse than a slow one they do
      run" applies here exactly as it does there — and unlike a type error, a
      coverage regression is not something a push can break by accident in the
      seconds before it: it takes deleting a test.

      THE SELF-TEST RUNS FIRST, the same argument as route-permissions, design,
      docs-reality and dex-invariants: the part that can rot silently is the
      JUDGE. Weaken its comparison and every future run passes, and a passing run
      is what a healthy tree looks like — there is no output that would differ.
      So the ten fixture cases (empty report, dropped file, shrunken denominator,
      both sides of the floor) are checked in 20ms BEFORE the several minutes are
      spent measuring anything.
    */
    cmds: [
      { cmd: process.execPath, args: ["scripts/check-money-coverage.mjs", "--self-test"] },
      {
        cmd: process.execPath,
        args: ["scripts/check-money-coverage.mjs"],
        timeoutMs: 30 * 60_000,
      },
    ],
    onFail:
      "A failure here means one of three things, and the output says which. (1) The pooled " +
      "figure fell: something that used to be executed by a test no longer is — a deleted " +
      "suite, a service mocked where it used to run for real, or new money code with nothing " +
      "exercising it. Write the test; do NOT lower the floor, which deletes the evidence in " +
      "the same commit that deletes the coverage. (2) A ratchet file has no coverage row at " +
      "all: it was not measured, which is a broken lane rather than 0% — fix " +
      "e2e/jest.money-coverage.cjs, or name the file in TYPE_ONLY if it genuinely compiles to " +
      "no statements. (3) The denominator shrank below its floor: coverage cannot be improved " +
      "by deleting code, so re-measure and move both floors in one commit that says why.",
  },
  {
    id: "dex-invariants",
    title: "DEX architecture invariants (no deploying, no signing, no key material)",
    why:
      "The eslint rules say the same thing with better precision, and one edit to that " +
      "config silently removes every one of them. A grep cannot be turned off by editing " +
      "a rule array.",
    fast: true,
    required: true,
    cmds: [
      /*
        THE SELF-TEST RUNS FIRST, and the order is the point. A grep guard has a
        failure mode a green run cannot distinguish from success: the regex stops
        matching, and the tree is "clean" forever. Scanning the tree with a
        broken ruleset produces the same output as scanning it with a working
        one, so the ruleset is checked against its own fixtures BEFORE it is
        trusted against the tree.
      */
      {
        cmd: process.execPath,
        args: [path.join("scripts", "dex-invariants.mjs"), "--self-test"],
        cwd: ROOT,
      },
      {
        cmd: process.execPath,
        args: [path.join("scripts", "dex-invariants.mjs")],
        cwd: ROOT,
      },
    ],
    onFail:
      "The zero-contract rule is load-bearing: the router allowlist is meaningful only " +
      "because every entry is a third party's audited contract, and approvals default to " +
      "exact-per-swap because we have nothing to pause.",
  },
  {
    id: "red-runs",
    title: "every required test has a witnessed red run",
    why: "A test nobody has seen fail is a test nobody has seen work.",
    fast: true,
    required: true,
    fn: checkRedRuns,
  },
  {
    id: "dex-live",
    title: "DEX live harness (needs the backend on :4000 and the real DB)",
    why: "Exercises the real routes against the real database; cannot run headless.",
    fast: false,
    required: false,
    /*
      node DIRECTLY through tsx's own CLI, not `pnpm.cmd --filter`. This was the
      last step in the file still shelling out to pnpm, and on this Windows box
      it could not start AT ALL: `spawnSync("pnpm.cmd", ...)` returns EINVAL
      because Node refuses to spawn a .cmd without a shell. The step therefore
      reported `FAIL 0.0s` on every single run — a lane that has never once
      executed, sitting in the summary looking like a lane that keeps breaking.

      `dex-fork` directly below already carries this fix and says why; `dex-live`
      was left behind because it is TypeScript and needed tsx rather than a bare
      script path. The arguments are `e2e`'s own `test:dex` script, verbatim.
    */
    cmds: [
      {
        cmd: process.execPath,
        args: [
          path.join(E2E, "node_modules", "tsx", "dist", "cli.mjs"),
          "--tsconfig",
          path.join("..", "backend", "tsconfig.json"),
          "-r",
          "dotenv/config",
          "-r",
          path.join("..", "backend", "module-alias-setup.ts"),
          path.join("live", "dex", "e2e-live.ts"),
          "dotenv_config_path=../.env",
        ],
        cwd: E2E,
        timeoutMs: 15 * 60_000,
      },
    ],
    async preflight() {
      if (!packageScripts(E2E)["test:dex"]) {
        return { reason: "e2e has no `test:dex` script yet (PH.6)", fix: "land PH.6" };
      }
      const down = await unreachable("http://127.0.0.1:4000/api/settings");
      if (down) return { reason: `backend not reachable on :4000 (${down})`, fix: "pnpm dev:backend" };
      return null;
    },
  },
  {
    id: "dex-fork",
    title: "DEX fork harness (anvil)",
    why: "The only lane that runs real swap calldata against real pool state.",
    fast: false,
    required: false,
    /*
      node DIRECTLY, not through pnpm.cmd -- the same convention typecheck-backend
      already follows. `spawnSync("pnpm.cmd", ...)` fails EINVAL on this Windows
      box, and because the harness is a plain script there is nothing pnpm adds
      here beyond a shell that cannot start.
    */
    /*
      ───────────────────────────────────────────────────────────────────────────
      `-r dotenv/config` IS LOAD-BEARING, AND THE GATE'S COPY DID NOT HAVE IT.

      The `fork` lane in e2e/run-suites.mjs carries a long note about exactly
      this: run bare, these four never see `APP_DEX_FORK_RPC_URL` or
      `APP_DEX_ZEROEX_API_KEY`, so `02-fee` — the ONLY test that proves the
      integrator fee actually arrives on chain — skips, and a skip exits 0 and
      renders as PASS. The lane was fixed; this copy of the same four commands
      was not, so the gate kept running the configuration the lane had just been
      corrected out of. `unit/frontend/gate-fork-matches-lane.test.ts` compares
      WHICH scripts the two run, not HOW, so it could not see this.

      Same preload, same `dotenv_config_path=../.env` argument, same cwd as the
      lane. `07` keeps its additional `--import ./live/dex/fork/ts-resolve.mjs`,
      which is what lets it import the production arithmetic instead of a copy.
      ───────────────────────────────────────────────────────────────────────────
    */
    cmds: [
      {
        cmd: process.execPath,
        args: [
          "-r",
          "dotenv/config",
          path.join("live", "dex", "fork", "01-harness.fork.mjs"),
          "dotenv_config_path=../.env",
        ],
        cwd: E2E,
        timeoutMs: 15 * 60_000,
      },
      /*
        The keystone. It SKIPS (exit 0, with the reason printed) without
        APP_DEX_FORK_RPC_URL and a 0x key, so it is safe to run unconditionally
        — and its assertion logic is unit-tested on every gate run regardless,
        in e2e/unit/backend/dex/fee-assertions.test.ts. Running the skip is not
        pointless: it is what proves the script still LOADS, which is how a
        broken import in a rarely-run lane gets caught before the one day it
        matters.
      */
      {
        cmd: process.execPath,
        args: [
          "-r",
          "dotenv/config",
          path.join("live", "dex", "fork", "02-fee.fork.mjs"),
          "dotenv_config_path=../.env",
        ],
        cwd: E2E,
        timeoutMs: 15 * 60_000,
      },
      /*
        P7.5's screening simulation. Runs FULLY on a bare local chain — it needs
        no fork url and no vendor key, because what it proves is that
        `eth_simulateV1` accepts the body we build and that a pair with no route
        is reported UNAVAILABLE rather than as a honeypot. A stubbed RPC can
        prove neither, and the second one is the safety property: almost every
        token has no pool on any given router, so a probe that read "the buy leg
        did not execute" as "this token cannot be sold" would mark most of a
        catalogue as honeypots the day simulation was switched on.

        It imports the production `simulation.ts` directly — Node strips the
        types — so there is no `.mjs` copy of the encoder to drift.
      */
      {
        cmd: process.execPath,
        args: [
          "-r",
          "dotenv/config",
          path.join("live", "dex", "fork", "06-honeypot.fork.mjs"),
          "dotenv_config_path=../.env",
        ],
        cwd: E2E,
        timeoutMs: 15 * 60_000,
      },
      /*
        PHASE 8'S KEYSTONE. It compiles and deploys its own AMM, so it needs no
        fork url and no vendor key — and it SKIPS with a printed reason when
        anvil or the compiled artefacts are absent, rather than failing.

        `--import ./live/dex/fork/ts-resolve.mjs` is what lets it import the
        PRODUCTION arithmetic and calldata builders instead of a copy: the
        backend writes relative imports extensionless, and Node's ESM resolver
        will not guess `.ts`. A copy of the swap maths in a test is a copy that
        drifts away from what ships.
      */
      {
        cmd: process.execPath,
        args: [
          "-r",
          "dotenv/config",
          "--import",
          "./live/dex/fork/ts-resolve.mjs",
          path.join("live", "dex", "fork", "07-direct-pool-lifecycle.fork.mjs"),
          "dotenv_config_path=../.env",
        ],
        cwd: E2E,
        timeoutMs: 15 * 60_000,
      },
    ],
    preflight() {
      if (!packageScripts(E2E)["test:dex:fork"]) {
        return { reason: "e2e has no `test:dex:fork` script yet (PH.6/PH.9)", fix: "land PH.9" };
      }
      /*
        PATH IS NOT WHERE ANVIL LIVES ON A STOCK WINDOWS BOX. foundryup drops the
        binaries in ~/.foundry/bin and leaves adding them to PATH as a manual
        step, so a `hasBinary("anvil")` probe alone reports "not installed" for a
        machine that has it — and the step then SKIPS forever while looking
        legitimate. The harness resolves the same two locations
        (e2e/live/dex/fork/anvil.mjs resolveAnvil); this preflight must agree
        with it or the two disagree about whether the lane can run.
      */
      if (!hasBinary("anvil") && !anvilInFoundryBin()) {
        return {
          reason: "anvil is not installed (checked PATH and ~/.foundry/bin)",
          fix: "curl -L https://foundry.paradigm.xyz | bash && foundryup",
        };
      }
      /*
        A FORK URL IS NO LONGER A PRECONDITION FOR RUNNING THIS LANE.

        It was, when the only planned fork tests were the mainnet-token ones.
        The harness now proves its own plumbing -- funding, impersonation,
        snapshot, revert, mining -- on a BARE LOCAL CHAIN, and that is exactly
        what PH.17.a is about. Skipping the whole lane for want of an archive
        endpoint would mean the plumbing every later assertion rests on is never
        checked on a normal developer machine.

        The mainnet-token assertions still need APP_DEX_FORK_RPC_URL, and the
        harness prints which of the two modes it ran in on every run rather than
        passing quietly with fewer assertions than it appears to have.
      */
      return null;
    },
  },
  {
    id: "eco-perf",
    title: "order-scale perf lane (spawns its own backend on :4100 against v5_perf_probe)",
    why: "The only load harness with SLO verdicts over the ecosystem order doors; the constants of plan section 6 come from it.",
    fast: false,
    required: false,
    /*
      NOT NEEDS_BACKEND, AND NOT :4000. The driver boots its own backend
      (e2e/live/ecosystem/perf/spawn.ts) against the probe clone, with its own
      Scylla keyspace and Redis db, and tree-kills it afterwards; the
      developer's backend is neither a precondition nor a target. The gate runs
      the SMOKE shape (a handful of users, one generator, seconds not minutes)
      so a broken import or a boot that no longer reaches hb/ping is caught on
      every full gate; the real measurement is run by hand with the arguments
      in the driver's header and lands in plans/done/order-scale/. ECO_PERF_GATE_ARGS
      overrides the smoke arguments when an operator wants the gate to measure.
    */
    cmds: [
      tsxDriverCmd(
        path.join("live", "ecosystem", "perf", "driver.ts"),
        (process.env.ECO_PERF_GATE_ARGS || "--users 4 --workers 1 --seconds 15 --mode place-cancel --name eco-perf-gate").split(/\s+/).filter(Boolean),
        20 * 60_000
      ),
      tsxDriverCmd(
        path.join("live", "ecosystem", "perf", "mysql-raw.ts"),
        (process.env.ECO_PERF_GATE_MYSQL_ARGS || "--connections 4 --seconds 5 --batch-sizes 50 --tick-ops 50").split(/\s+/).filter(Boolean),
        10 * 60_000
      ),
    ],
    async preflight() {
      const scripts = packageScripts(E2E);
      if (!scripts["test:eco-perf"] || !scripts["test:eco-perf:mysql"]) {
        return { reason: "e2e has no `test:eco-perf` / `test:eco-perf:mysql` scripts (WP-0.6)", fix: "land WP-0.6" };
      }
      const clone = process.env.ECO_PERF_DB || "v5_perf_probe";
      const missing = cloneMissing(clone);
      if (missing) {
        return {
          reason: missing,
          fix: `rebuild the clone: node -e "require('tsx/cjs'); require('./e2e/live/ecosystem/perf/clone.ts').rebuildClone('${clone}')" (mysqldump of v5 piped into a fresh database, ~35 s)`,
        };
      }
      const down = await scyllaDown();
      if (down) return { reason: `Scylla VM not reachable (${down})`, fix: "start the Scylla VM named in SCYLLA_CONNECT_POINTS" };
      return null;
    },
  },
  {
    id: "eco-chaos",
    title: "order-scale chaos lane (crash points on the spawned backend, then conservation)",
    why: "Crash safety at the instrumented points of plan section 7 is a claim until a kill and a restart show the ledger conserved.",
    fast: false,
    required: false,
    cmds: [tsxDriverCmd(path.join("live", "ecosystem", "chaos", "driver.ts"), [], 30 * 60_000)],
    async preflight() {
      if (!packageScripts(E2E)["test:eco-chaos"]) {
        return { reason: "e2e has no `test:eco-chaos` script (WP-0.8)", fix: "land WP-0.8" };
      }
      if (!fs.existsSync(path.join(E2E, "live", "ecosystem", "chaos", "driver.ts"))) {
        return { reason: "e2e/live/ecosystem/chaos/driver.ts has not landed (WP-0.8)", fix: "land WP-0.8" };
      }
      const clone = process.env.ECO_CHAOS_DB || "v5_chaos_probe";
      const missing = cloneMissing(clone);
      if (missing) {
        return {
          reason: missing,
          fix: `rebuild the clone: node -e "require('tsx/cjs'); require('./e2e/live/ecosystem/perf/clone.ts').rebuildClone('${clone}')"`,
        };
      }
      const down = await scyllaDown();
      if (down) return { reason: `Scylla VM not reachable (${down})`, fix: "start the Scylla VM named in SCYLLA_CONNECT_POINTS" };
      return null;
    },
  },
  {
    id: "e2e",
    title: "Playwright browser specs",
    why: "The only lane that proves the wallet flow end to end.",
    fast: false,
    required: false,
    /*
      TWO PASSES, BECAUSE ONLY HALF OF THIS LANE OWNS ITS DATA.

      This was one `playwright test` at the config's `workers: 1`, and it was
      461s of a 559s gate — 82% of the whole thing in one step. The pin is not an
      oversight and the config says why: the p2p matrix stands in for the
      moderator with raw SQL (`UPDATE p2p_offers SET status='ACTIVE'`), and the
      `values` project owns a global currency rate for the length of its run. Two
      workers doing either of those approve and tear down each other's subjects.

      But `dex` and `ssr` issue no write of any kind — they navigate pages and
      read them — and they are 130s of the 461s. They are marked
      `fullyParallel` in the config and run here in their own pass.

      `guidance` was in that pass and MEASURED ITS WAY OUT: it writes nothing
      either, but every walkthrough spends a generation against the shared AI
      account, whose concurrency cap is 2. At three workers a walkthrough waited
      90s for a guide card that never came. "Does it write" is the wrong
      question on its own — a suite can own all its rows and still be unsafe if
      it consumes a capped shared resource.

      The serial pass runs SECOND on purpose: it is the one that mutates shared
      rows, so it should not race a first pass still reading them.

      `--workers=3` rather than the core count. These are browsers against one
      dev backend and one dev frontend, and a UI spec's page loads spend the same
      per-IP rate-limit budget as everything else (see the config's note on the
      bypass header). Three is measured, not maximal: over-parallelising here
      makes the limiter report the PRODUCT as failing to load, which is the class
      of self-inflicted flake this repository spends most of its effort removing.

      `unit/frontend/gate-runs-every-playwright-project.test.ts` asserts these two
      lists together name every project in the config exactly once — a project in
      neither list would simply never run, and the gate would stay green.
    */
    cmds: [
      {
        cmd: process.execPath,
        args: [
          "node_modules/@playwright/test/cli.js",
          "test",
          "--project=dex",
          "--project=ssr",
          "--workers=3",
        ],
        cwd: E2E,
        timeoutMs: 20 * 60_000,
      },
      {
        cmd: process.execPath,
        args: [
          "node_modules/@playwright/test/cli.js",
          "test",
          "--project=desktop-dark",
          "--project=desktop-light",
          "--project=tablet-dark",
          "--project=mobile-dark",
          "--project=guidance",
          /*
            `p2pchat` rides the SERIAL pass because it writes: it publishes an
            offer, opens a trade against it, stands in for the moderator with
            raw SQL and then sends five messages through the real composer. It
            shares the p2p fixture rows with the four matrix projects beside it,
            so two workers would approve and consume each other's subjects.

            It is safe HERE rather than alone (as `values` has to be) because it
            pins no global: everything it touches is scoped to one trade it
            created and one throwaway operator carrying its own teardown tag.
          */
          "--project=p2pchat",
          "--workers=1",
        ],
        cwd: E2E,
        timeoutMs: 20 * 60_000,
      },
      /*
        `values` RUNS ALONE, and the reason is written two comments above this
        one: it "owns a global currency rate for the length of its run".

        It was in the pass above, which made that sentence false. `--workers=1`
        serialises TESTS; it does not stop Playwright retiring a worker between
        project boundaries and starting another, and the rate pin lives in a
        WORKER-SCOPED fixture. So the pin's lifetime was the worker's, not the
        project's, and five other projects shared the same invocation with it.

        Measured: in the combined pass the wallet page rendered its pending
        sub-total as **$35.9** — 48,900 NGN at the operator's real rate of
        1362.3 — where the fixture pins 1000 and the spec expects **$48.90**.
        The same project, run by itself at the same `--workers=1`, passes
        15/15. Nothing about the product differed between the two runs.

        That failure reads exactly like a money defect, which is the expensive
        part: a figure on a wallet screen disagreeing with the database is the
        single thing this programme exists to catch, so it cannot be allowed to
        be produced by the harness. Wrong answers are cheap to ignore once; a
        wrong answer that looks like this one costs a diagnosis every time.
      */
      {
        cmd: process.execPath,
        args: [
          "node_modules/@playwright/test/cli.js",
          "test",
          "--project=values",
          "--workers=1",
        ],
        cwd: E2E,
        timeoutMs: 20 * 60_000,
      },
    ],
    async preflight() {
      if (!fs.existsSync(path.join(E2E, "node_modules/@playwright/test/cli.js"))) {
        return { reason: "@playwright/test is not installed", fix: "pnpm install" };
      }
      /* pnpm never runs playwright's postinstall (the package ships an empty
         scripts block), so the pinned chromium revision is routinely absent
         even on a fully installed tree. Detecting that here turns a confusing
         "Executable doesn't exist" stack into one line naming the fix. */
      const cache =
        process.env.PLAYWRIGHT_BROWSERS_PATH ||
        (WIN
          ? path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright")
          : path.join(process.env.HOME ?? "", ".cache", "ms-playwright"));
      const hasChromium =
        fs.existsSync(cache) && fs.readdirSync(cache).some((e) => e.startsWith("chromium"));
      if (!hasChromium) {
        return {
          reason: `no chromium build in ${cache} (PH.10 has not been run on this machine)`,
          fix: "pnpm --filter e2e browsers:install",
        };
      }
      /* e2e/playwright.config.ts has NO `webServer` block, so nothing starts
         the app for it. Every spec drives a real browser against a real
         :3000 that talks to a real :4000; with either down the run does not
         fail fast, it grinds through 90 s timeouts per spec. Probe first. */
      for (const [url, label, fix] of [
        ["http://127.0.0.1:3000/", "frontend :3000", "pnpm dev:frontend"],
        ["http://127.0.0.1:4000/api/settings", "backend :4000", "pnpm dev:backend"],
      ]) {
        /* STABLE, not merely reachable — see `unstable`. A three-minute browser
           suite started against a restarting dev server fails on
           ERR_CONNECTION_REFUSED and reports it as findings about the product. */
        const bad = await unstable(url);
        if (bad) {
          return {
            reason: `${label} is not serving steadily (${bad}) — restarting, or crashed under nodemon`,
            fix,
          };
        }
      }
      return null;
    },
  },
  {
    id: "addon-coverage",
    title: "every addon's live driver produced results (reports on a run that happened)",
    why:
      "`e2e/coverage-report.mjs` answers the question the runner cannot: not `is the tree " +
      "green` — which is decided by an exit code — but WHICH ADDONS RAN ANYTHING AT ALL. Its " +
      "`--strict` mode fails on ABSENCE and nothing else, deliberately: a red check already " +
      "fails its own driver and this lane, while an addon whose driver never ran is invisible " +
      "to a green tree. `chart_engine` was exactly that for months.\n" +
      "      IT RUNS ONLY WHERE THERE ARE RESULTS TO READ, and that is the whole design of " +
      "this step. The drivers write nothing unless E2E_RESULTS_DIR is set — that is what keeps " +
      "them inert for anyone running a harness by hand — so with no results directory this " +
      "reports on ZERO FILES, and a report over zero files that exits 0 is precisely the " +
      "failure this programme exists to remove. The preflight therefore SKIPS with the command " +
      "that would make it runnable, rather than passing quietly.",
    fast: false,
    required: false,
    cmds: [
      {
        cmd: process.execPath,
        args: ["coverage-report.mjs", "--strict"],
        cwd: E2E,
        timeoutMs: 2 * 60_000,
      },
    ],
    preflight() {
      /*
        RESOLVED THE WAY THE REPORT ITSELF RESOLVES IT, or the two check
        different directories and this step becomes a coin toss. `resultsDir()`
        in e2e/shared/results.mjs is `path.resolve(process.env.E2E_RESULTS_DIR)`
        — resolved against the CHILD's cwd, which is `cwd: E2E` above — and the
        report falls back to `e2e/.results` when the variable is unset.
      */
      const configured = (process.env.E2E_RESULTS_DIR ?? "").trim();
      const dir = configured ? path.resolve(E2E, configured) : path.join(E2E, ".results");
      const runIt = `E2E_RESULTS_DIR=.results node run-suites.mjs live-serial   (from e2e/)`;

      if (!fs.existsSync(dir)) {
        return { reason: `no results directory at ${rel(dir)}`, fix: runIt };
      }
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      if (!files.length) {
        return { reason: `${rel(dir)} holds no result files`, fix: runIt };
      }

      /*
        AND THE RUN HAS TO BE RECENT ENOUGH TO BE ABOUT THIS TREE.

        A results directory is a record of a RUN, not a proof like a witnessed
        red run — those do not expire, this does. Left alone it would keep
        reporting "every addon produced results" about work done before whatever
        is being pushed now, which is a green step describing a different tree.
        Seven days is a judgement, not a measurement: long enough that a full
        live pass (hours) does not have to be repeated for every push, short
        enough that nobody mistakes it for current.
      */
      const newest = Math.max(
        ...files.map((f) => fs.statSync(path.join(dir, f)).mtimeMs)
      );
      const ageDays = (Date.now() - newest) / 86_400_000;
      if (ageDays > 7) {
        return {
          reason: `the newest result in ${rel(dir)} is ${ageDays.toFixed(1)} days old — it describes an older tree`,
          fix: runIt,
        };
      }
      return null;
    },
    onFail:
      "--strict fails on ABSENCE: an addon with a driver directory that wrote no result file, " +
      "a driver under e2e/live that driver-addon-map.mjs has never heard of, or a results file " +
      "that will not parse. Read the ADDONS THAT PRODUCED NOTHING block above — that is a lane " +
      "that did not run or a driver that died before its report, NOT an addon with no tests. " +
      "If the directory holds a PARTIAL run (one addon, or a `--only=` iteration), that is not " +
      "evidence about the tree and this is right to refuse it: run the full live lane, or " +
      "delete the directory so the step skips honestly instead of grading a fragment.",
  },
  {
    id: "typecheck-backend",
    title: "backend typecheck",
    why: "tsc needs ~8 GB and minutes. A gate a developer stops running is worse than a slow one they do run.",
    fast: false,
    full: true,
    required: true,
    // Invoked as `node <tsc>` from the backend package, NOT via pnpm.cmd —
    // see the convention note above STEPS. `--max-old-space-size` is not
    // tuning: this project's backend tsc reliably OOMs at the default heap,
    // and an OOM here looks identical to a type error to anyone reading the
    // summary line.
    cmds: [
      {
        cmd: process.execPath,
        args: [
          "--max-old-space-size=8192",
          path.join("node_modules", "typescript7", "bin", "tsc"),
          "-p",
          "tsconfig.json",
          "--noEmit",
        ],
        cwd: BACKEND,
        timeoutMs: 20 * 60_000,
      },
    ],
  },

  /*
    ═══════════════════════════════════════════════════════════════════════════
    THE REAL-DATABASE INTEGRATION SUITES, WHICH NO GATE STEP RAN.

    e2e/jest.config.cjs declares two projects. `jest-unit` above runs the
    hermetic one — 241 suites, and its own comment records the day 155 of them
    were run by nothing. The OTHER project, `integration`, opens a real MySQL
    connection and writes real rows, and until this step it was in exactly the
    same position: reachable through `node run-suites.mjs all` and through
    `pnpm test:integration`, named by no gate step in any mode. Nine suites
    (`find e2e/integration -name '*.test.ts'`, 2026-09-07) — the ecosystem
    ledger, EVM movers, per-user address model and spot sweep, both staking
    ones, and the three wallet suites — covering exactly the writes this
    programme is being rebuilt around.

    IT REFUSES TO RUN AGAINST A DATABASE THAT IS NOT A PROBE, AND THAT IS THE
    WHOLE DESIGN. These suites WRITE. The rule the rest of the programme already
    follows — `e2e/live/ecosystem/perf/spawn.ts:17-46`, `xtask gen-schema`,
    `scripts/ledger-conservation.mjs` — is that a writing tool may only ever
    touch a database whose name contains `probe` or `test`. So the preflight
    reads DB_NAME the way the suites will, and anything else is a SKIP naming
    the database it refused. A gate step that quietly wrote to an operator's
    live install would be a far worse defect than the missing lane it fixes.
    ═══════════════════════════════════════════════════════════════════════════
  */
  {
    id: "jest-integration",
    title: "backend integration suites (jest, real MySQL, serial)",
    why:
      "Nine suites that write real rows — the wallet service, the ecosystem ledger, the custody " +
      "movers — and no gate step ran any of them.",
    fast: false,
    required: false,
    cmds: [
      {
        cmd: process.execPath,
        args: [
          "node_modules/jest/bin/jest.js",
          "-c",
          "jest.config.cjs",
          "--selectProjects",
          "integration",
          /* Both halves of the contract jest.config.cjs documents and cannot
             enforce from a projects[] entry: these share rows, and real
             connections do not always unwind. */
          "--runInBand",
          "--forceExit",
        ],
        cwd: E2E,
        timeoutMs: 30 * 60_000,
      },
    ],
    preflight() {
      const probe = probeDatabase();
      if (probe.reason) return probe;
      return null;
    },
    onFail:
      "These run serially against a real database. A failure here is a row-level disagreement, " +
      "not a flake: read the suite's own output before re-running.",
  },

  /*
    ═══════════════════════════════════════════════════════════════════════════
    THE RUST BACKEND (P0 exit 15).

    `node scripts/gate.mjs --only=rust` selects every step in this group, and
    `--only=rust --list` prints them. One entry per row of `STEPS` in
    backend-rust/tools/xtask/src/gate.rs, and each entry shells THAT row:

        cargo xtask gate --step <name>

    rather than writing the cargo command line out a second time. This is the
    one lesson this file already paid for twice — the four DEX fork harnesses
    and the Playwright project lists are both hand-written in two places, and
    both drifted — so the Rust half is defined once, on the Rust side, where
    A20 (every long command line is a file, because Windows ENAMETOOLONG) puts
    it anyway. `cargo xtask gate --list` prints the same ten names; the Rust
    test `the_step_names_are_the_ones_the_js_gate_selects` pins them.

    EVERY ONE OF THESE IS A LANE, so `lane: true`: a step whose tool is absent
    from this box exits 3 and is reported SKIP, never PASS (A21). None of them
    is `required`, for the same reason — a missing toolchain is not a defect in
    the tree. What a lane may NOT do is speak for `bicrypto-ops`, whose exit 3
    is FATAL rather than SKIP (MIGRATIONS.md §0); `assertNoOpsLane()` below
    refuses to start a gate in which a step has confused the two.
    ═══════════════════════════════════════════════════════════════════════════
  */
  ...[
    ["check", "cargo check (workspace, all targets)", 20],
    ["clippy", "cargo clippy -D warnings (all targets, all features)", 20],
    ["deny+audit", "cargo deny check + cargo audit", 10],
    ["nextest", "cargo nextest run (workspace)", 30],
    ["mutants-changed", "cargo mutants over the changed files", 30],
    ["fuzz-smoke", "cargo fuzz: the targets BUILD (GATE_FUZZ_SECONDS=<n> to fuzz them)", 20],
    ["criterion-check", "the criterion benches compile and smoke-run", 20],
    [
      "generated",
      "generated --check: schema (drift graded by kind), api-tree, admin-routes, owner-table, initial.sql",
      20,
    ],
    ["conformance", "xtask conformance: every route in exactly one family", 10],
    ["fixtures-replay", "the recorded contract fixtures still replay", 10],
  ].map(([name, title, minutes]) => ({
    id: `rust-${name}`,
    group: "rust",
    title,
    why: "The Rust backend has no CI of its own; this is where its gate runs from.",
    fast: false,
    required: false,
    lane: true,
    cmds: [
      {
        cmd: "cargo",
        args: ["xtask", "gate", "--step", name],
        cwd: RUST_ROOT,
        timeoutMs: minutes * 60_000,
      },
    ],
    preflight: rustPreflight,
  })),
];

/* ── the red-runs check ──────────────────────────────────────────────────── */

/**
 * Parse RED-RUNS.md and confirm every id in REQUIRED_RED_RUNS has a row with a
 * non-empty "Observed RED" cell.
 *
 * The gate PARSES the file rather than merely requiring it to exist: a
 * checked-in evidence document nobody updates is indistinguishable from no
 * evidence at all. Columns are located by header name, not by index, so adding
 * a column to the table does not silently start reading the wrong one.
 */
function checkRedRuns() {
  if (!fs.existsSync(RED_RUNS_FILE)) {
    return { ok: false, message: `${rel(RED_RUNS_FILE)} is missing.` };
  }
  const lines = fs.readFileSync(RED_RUNS_FILE, "utf8").split(/\r?\n/);
  /*
    ───────────────────────────────────────────────────────────────────────────
    `\|` IS AN ESCAPED PIPE, NOT A COLUMN BOUNDARY — AND THE PARSER SPLIT ON IT.

    A markdown table cell cannot contain a bare `|`; GitHub's own rule is that a
    literal pipe inside a cell (including inside a code span) is written `\|`.
    Two rows here do exactly that: PH.17.c's command is a shell pipeline
    (`printf … \| npx eslint --stdin`) and E.MARKET.3's is a jest alternation
    (`"orderbook-frame\|orderbook-push"`).

    A naive `.split("|")` turns each of those rows into ONE CELL TOO MANY, so
    every column after the command shifts left by one and the "Observed RED"
    index reads the "Mutation applied" cell instead. Both cells are non-empty
    prose, so the check passed while reading the wrong column — the failure mode
    where a green step is grading something other than what it claims. Emptying
    PH.17.c's real evidence cell would not have turned it red.

    So: split on pipes that are NOT escaped, then unescape. A row whose cell
    count disagrees with the header is reported rather than parsed, because a
    shifted row is exactly the state this comment exists about.
    ───────────────────────────────────────────────────────────────────────────
  */
  const CELL_SPLIT = /(?<!\\)\|/;
  const cells = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split(CELL_SPLIT)
      .map((c) => c.replace(/\\\|/g, "|").trim());

  /*
    THE DOCUMENT HOLDS MANY TABLES, AND EVIDENCE ROWS LIVE IN SEVERAL OF THEM.

    Alongside the main ledger there are per-phase tables (ECO.*, C6.*) with the
    same two columns and a different column COUNT, plus explanatory tables with
    neither. The old scan read every `|`-line after the FIRST header against
    that header's indices, which happens to work only while every table puts
    "Test id" and "Observed RED" at the same offsets. Grading each table against
    its OWN header costs nothing and removes a silent coupling nobody declared.
  */
  const isRow = (l) => /^\|/.test(l.trim());
  const isSeparator = (l) => /^\|[\s:|-]+\|?$/.test(l.trim());
  /* A BLANK LINE DOES NOT END A TABLE HERE. This document spaces its rows out
     for readability — several of them have a blank line between every row — so
     a table ends only at a line that is neither a row nor blank-followed-by-a-
     row. Treating a blank line as the end split the main ledger into ~40
     one-row "tables" with no header, and every id after the first gap was
     silently ungraded. */
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isRow(lines[i])) continue;
    const block = [];
    while (i < lines.length) {
      if (isRow(lines[i])) {
        block.push(lines[i]);
        i++;
        continue;
      }
      if (lines[i].trim() !== "") break;
      let j = i;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j >= lines.length || !isRow(lines[j])) break;
      i = j;
    }
    blocks.push(block);
  }
  /** id -> did it have a non-empty Observed RED cell in at least one row */
  const witnessed = new Map();
  /** Rows whose cell count disagrees with their own table's header. */
  const ragged = [];
  let graded = 0;
  for (const block of blocks) {
    const header = cells(block[0]);
    const idCol = header.findIndex((h) => /^test id$/i.test(h));
    const redCol = header.findIndex((h) => /^observed red$/i.test(h));
    if (idCol === -1 || redCol === -1) continue; // not an evidence table
    graded++;
    for (const line of block.slice(1)) {
      if (isSeparator(line)) continue;
      const row = cells(line);
      const id = row[idCol];
      if (!id) continue;
      /* A row with the wrong number of cells is not evidence about the column it
         appears to fill. Named rather than silently graded — see CELL_SPLIT. */
      if (row.length !== header.length) {
        ragged.push(`${id} (${row.length} cells, its table's header has ${header.length})`);
        continue;
      }
      const observed = (row[redCol] ?? "").replace(/[-—–]/g, "").trim();
      witnessed.set(id, (witnessed.get(id) ?? false) || observed.length > 0);
    }
  }
  if (!graded) {
    return {
      ok: false,
      message: `${rel(RED_RUNS_FILE)} has no table with both a "Test id" and an "Observed RED" column.`,
    };
  }

  if (ragged.length) {
    return {
      ok: false,
      message:
        `${rel(RED_RUNS_FILE)} has row(s) whose cell count does not match the header: ` +
        `${ragged.join(", ")}\n` +
        `      A literal pipe inside a cell must be written \\| — an unescaped one splits the ` +
        `row and every column after it reads the wrong evidence.`,
    };
  }
  const missing = REQUIRED_RED_RUNS.filter((id) => !witnessed.get(id));
  if (missing.length) {
    return {
      ok: false,
      message:
        `no witnessed red run for: ${missing.join(", ")}\n` +
        `      Break the test deliberately, watch it fail, revert, and add a row to ${rel(RED_RUNS_FILE)}.`,
    };
  }
  /* A witnessed row whose suite is gone is not evidence, it is a memory of
     evidence. See RED_RUN_SUITES for why nothing else would notice. */
  const gone = [];
  for (const [id, files] of Object.entries(RED_RUN_SUITES)) {
    for (const file of files) {
      if (!fs.existsSync(path.join(ROOT, ...file.split("/")))) gone.push(`${id} -> ${file}`);
    }
  }
  if (gone.length) {
    return {
      ok: false,
      message:
        `red-run evidence names a file that is no longer on disk: ${gone.join("; ")}\n` +
        `      The row in ${rel(RED_RUNS_FILE)} still says the suite went red, but the suite cannot run.\n` +
        `      Restore it, or if it was renamed, move RED_RUN_SUITES in scripts/gate.mjs with it.`,
    };
  }
  // Deferred evidence is REPORTED on every green run, never silently dropped.
  // A gate that goes quiet about what it could not check teaches people the
  // absence of output means the absence of risk.
  const owed = DEFERRED_RED_RUNS.filter((d) => !witnessed.get(d.id));
  const tail = owed.length
    ? `\n      still owed (blocked, not waived): ` +
      owed.map((d) => `${d.id} — ${d.blockedOn}`).join("; ")
    : "";
  return {
    ok: true,
    message: `${REQUIRED_RED_RUNS.length} required red run(s) witnessed.${tail}`,
  };
}

/* ── argument parsing ────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const FAST = argv.includes("--fast");
const FULL = argv.includes("--full");
const LIST = argv.includes("--list");

/** `--only=a,b` / `--skip=a,b`, repeatable. Returns null when never passed. */
function idList(flag) {
  const found = argv.filter((a) => a.startsWith(`${flag}=`));
  if (!found.length) return null;
  return found.flatMap((a) => a.slice(flag.length + 1).split(",")).filter(Boolean);
}

/*
  A STEP MAY DECLARE A GROUP, AND `--only=<group>` SELECTS ALL OF ITS MEMBERS.

  `--only=rust` is P0 exit 15's spelling and there is no reason for it to mean anything else: the
  Rust backend arrives as ten steps that are always run and skipped together, and asking a person to
  type all ten (or to keep a copy of the list) is how the eleventh gets forgotten. A group name may
  not collide with a step id — asserted below rather than assumed, because a group that shadowed an
  id would silently run a different set than the one named.
*/
const GROUPS = new Map();
for (const step of STEPS) {
  if (!step.group) continue;
  if (!GROUPS.has(step.group)) GROUPS.set(step.group, []);
  GROUPS.get(step.group).push(step.id);
}
const known = new Set(STEPS.map((s) => s.id));
for (const group of GROUPS.keys()) {
  if (known.has(group)) {
    console.error(`gate.mjs: '${group}' is both a step id and a group name; rename one.`);
    process.exit(2);
  }
}

/*
  A LANE'S EXIT 3 IS "SKIPPED"; `bicrypto-ops`'s EXIT 3 IS FATAL. NEVER BOTH.

  A21 gives an optional lane exit 3 to mean "this could not run", and this file renders that as SKIP
  rather than PASS. `bicrypto-ops` keeps the MIGRATIONS.md §0 vocabulary, where 3 is the FATAL code —
  and it is the one command in P0 that WRITES to an operator's database. A step that shelled
  bicrypto-ops while declaring `lane: true` would turn the most serious failure the programme can
  produce into a green summary line. That mistake is refused here, before anything runs, rather than
  left to a comment for a future step to overlook.
*/
/*
  MATCHING THE STRING `bicrypto-ops` ALONE WAS A GUARD WITH A HOLE IN IT.

  Nothing in this repo can invoke that binary by name: it is not on PATH, and the only way to reach
  it from a source checkout is through cargo — `cargo run -p ops -- migrate status`, or the built
  artefact at `backend-rust/target/<profile>/ops(.exe)`, because the PACKAGE is `ops` and
  `bicrypto-ops` is the [[bin]] name. So the one spelling the old regex caught was the one spelling
  a step here would never use, and the shape it was written to refuse — an ops command wearing
  `lane: true`, i.e. its FATAL 3 rendered as a green SKIP — would have walked straight through.

  Three spellings are refused now: the binary name anywhere, a cargo `-p ops`/`--package ops`
  selection, and a path ending in the built `ops` executable. A guard for the worst failure the
  programme can produce has to catch the way that failure would actually be written.
*/
function shellsOps(cmd) {
  const pieces = [cmd.cmd, ...(cmd.args ?? [])].map(String);
  if (pieces.some((p) => /bicrypto-ops/.test(p))) return true;
  /* The built artefact: a real path segment, so a bare `ops` word cannot trip it. */
  if (pieces.some((p) => /[\\/]ops(\.exe)?$/i.test(p))) return true;
  return pieces.some(
    (p, i) => /^(-p|--package)$/.test(p) && /^(ops|bicrypto-ops)$/.test(pieces[i + 1] ?? "")
  );
}

function assertNoOpsLane() {
  const wrong = STEPS.filter((step) => step.lane && (step.cmds ?? []).some(shellsOps));
  if (!wrong.length) return;
  console.error(
    `gate.mjs: step(s) ${wrong.map((s) => s.id).join(", ")} shell bicrypto-ops and declare ` +
      `lane:true.\n` +
      `  A lane's exit 3 is SKIP (SYNTHESIS A21). bicrypto-ops keeps the MIGRATIONS.md §0 codes, ` +
      `where 3 is FATAL —\n` +
      `  and it is the one command here that writes to an operator database. Remove lane:true; a 3 ` +
      `from it is RED.`
  );
  process.exit(2);
}
assertNoOpsLane();

const expand = (ids) => ids.flatMap((id) => GROUPS.get(id) ?? [id]);
const only = idList("--only") === null ? null : expand(idList("--only"));
const skip = expand(idList("--skip") ?? []);
for (const id of [...(idList("--only") ?? []), ...(idList("--skip") ?? [])]) {
  if (!known.has(id) && !GROUPS.has(id)) {
    console.error(
      `gate.mjs: unknown step id '${id}'. Known ids: ${[...known].join(", ")}` +
        (GROUPS.size ? `\n  Known groups: ${[...GROUPS.keys()].join(", ")}` : "")
    );
    process.exit(2);
  }
}
for (const arg of argv) {
  if (!["--fast", "--full", "--list"].includes(arg) && !/^--(only|skip)=/.test(arg)) {
    console.error(`gate.mjs: unknown argument '${arg}'`);
    process.exit(2);
  }
}

/*
  ─────────────────────────────────────────────────────────────────────────────
  `--skip` CANNOT REMOVE A REQUIRED STEP, AND A SKIPPED ONE IS NAMED.

  This filter used to drop every `--skip`ped id before the run loop, so those
  steps never entered `results`, never appeared in the per-step summary, never
  appeared in the "Skipped is NOT passed" block (which lists preflight skips
  only) and left a step count that looked ordinary. `node scripts/gate.mjs
  --fast --skip=red-runs,design,jest` printed `GATE PASS (15 passed, 0 skipped)`
  with no trace anywhere that three REQUIRED steps had been removed.

  That contradicts this file's first convention — "SKIPPED IS NOT PASSED… the
  final line names them" — and it does so on the one path a person reaches for
  when a step is inconvenient. `required` means the gate does not get to not
  check it, so asking is now an error rather than a quiet success, the same way
  an unknown id already is. Everything else may be skipped and is REPORTED as
  skipped.
  ─────────────────────────────────────────────────────────────────────────────
*/
const skippedRequired = STEPS.filter((s) => skip.includes(s.id) && s.required);
if (skippedRequired.length) {
  console.error(
    `gate.mjs: --skip cannot remove a required step: ` +
      `${skippedRequired.map((s) => s.id).join(", ")}.\n` +
      `  "required" means a missing precondition is a FAILURE rather than a skip, so ` +
      `there is no state in which not running it is an answer.\n` +
      `  Use --only=<id>,... to run a subset deliberately; that selection is printed ` +
      `in the header and the summary shows exactly what ran.`
  );
  process.exit(2);
}

const inScope = (step) => {
  if (only) return only.includes(step.id);
  if (FAST) return step.fast;
  if (FULL) return true;
  return !step.full;
};

const selected = STEPS.filter((step) => !skip.includes(step.id) && inScope(step));
/* Named in the summary rather than erased from it. */
const flagSkipped = STEPS.filter((step) => skip.includes(step.id) && inScope(step));

if (LIST) {
  const when = (s) => (s.fast ? "fast" : s.full ? "full" : "default");
  /* `--only=<group> --list` prints the group's steps rather than all of them: the question being
     asked is "what does this selection run", and answering it with the whole table is how a person
     ends up reading the wrong ten lines. */
  const shown = only ? STEPS.filter((s) => only.includes(s.id)) : STEPS;
  console.log("id                     group    when     required  title");
  for (const step of shown) {
    console.log(
      `${step.id.padEnd(22)} ${(step.group ?? "-").padEnd(8)} ${when(step).padEnd(8)} ` +
        `${String(!!step.required).padEnd(9)} ${step.title}`
    );
  }
  if (GROUPS.size) {
    console.log(
      "\nGroups: " +
        [...GROUPS.entries()].map(([g, ids]) => `${g} (${ids.length} steps)`).join(", ")
    );
  }
  console.log("\nSelected by these flags:", selected.map((s) => s.id).join(", ") || "(none)");
  process.exit(0);
}

/* ── the machine has to be able to answer ────────────────────────────────── */

/*
 * A STARVED BOX REPORTS ITSELF AS BROKEN CODE, AND THAT IS THE WORST SHAPE A
 * GATE FAILURE CAN TAKE.
 * ---------------------------------------------------------------------------
 * This file's first convention is that a gate reporting success for work it
 * never did is worse than no gate. The mirror case costs just as much: a gate
 * reporting FAILURE for work the machine could not do sends a person to debug
 * code that is fine, and the second time it happens they learn to re-run
 * instead of to read.
 *
 * MEASURED on 2026-09-08 on this machine (64 GB), while a leaked `next dev`
 * from a concurrent session held 31 GB and left 0.8 GB free:
 *
 *   step           run alone            run in the same `--fast` pass
 *   i18n-keys      PASS                 FAIL — report truncated mid-sentence,
 *                                       no error, no exit message
 *   vitest         PASS, 197 files      FAIL after 9s, no test output at all
 *   vitest-store   PASS, 27 files       FAIL after 5.6s
 *   jest-unit      PASS, 747 suites     FAIL — 2 suites "Jest worker ran out of
 *                                       memory and crashed", 1 child spawn
 *                                       killed (status null), and 3 assertions
 *                                       in password-change.test.ts
 *
 * That last row is why this check exists rather than a line in a README. Those
 * three assertions failed as "The current password you entered is incorrect",
 * "Invalid OTP or recovery code" and 400-instead-of-401 — the exact text a real
 * auth regression produces. Nothing in the output said "the box is full". By
 * then `node -e` was itself failing to start with `EUNKNOWN: uv_spawn`.
 *
 * TWO FLOORS, because one would be a new way to block a push:
 *
 *   REFUSE  below `min(3 GB, 10% of RAM)` — nothing here can run, so the gate
 *           spends exit 2 ("the gate itself could not run") rather than exit 1,
 *           which is a verdict it has not earned.
 *   WARN    below `min(8 GB, 25% of RAM)` — the lanes usually survive this, so
 *           the run continues; but the banner is printed up front and, if
 *           anything then fails, the summary says memory was short and names
 *           the biggest consumer. The reader gets to check the cheap
 *           explanation before the expensive one.
 *
 * Both scale so a small box is not permanently blocked, and GATE_MEM_FLOOR_MB
 * overrides the pair (0 disables them) for anyone who disagrees on their own
 * machine.
 */
const MB = 1024 * 1024;
const freeMb = () => Math.round(os.freemem() / MB);
const totalMb = Math.round(os.totalmem() / MB);

const memFloorOverride = process.env.GATE_MEM_FLOOR_MB;
const WARN_FLOOR_MB =
  memFloorOverride === undefined
    ? Math.min(8 * 1024, Math.floor(totalMb * 0.25))
    : Number(memFloorOverride);
/* The override moves BOTH floors, keeping the 3:8 ratio of the defaults. An
   override that silently dropped the hard floor would be a surprising way to
   lose the only protection against grading a box that cannot run anything. */
const REFUSE_FLOOR_MB = Math.floor(WARN_FLOOR_MB * (3 / 8));

/**
 * The single biggest resident process, for the banner. Best-effort by design:
 * under the conditions this is printed in, spawning anything can fail — which
 * is the very symptom being reported — so a failure here is silence, never an
 * error.
 */
function biggestProcess() {
  try {
    const res =
      process.platform === "win32"
        ? spawnSync("tasklist", ["/fo", "csv", "/nh"], { encoding: "utf8", timeout: 10_000 })
        : spawnSync("ps", ["-eo", "rss=,comm="], { encoding: "utf8", timeout: 10_000 });
    if (res.error || res.status !== 0 || !res.stdout) return null;
    const rows = res.stdout
      .split("\n")
      .map((line) => {
        if (process.platform === "win32") {
          /* "node.exe","45172","Console","1","31,081,234 K" */
          const cells = line.match(/"([^"]*)"/g);
          if (!cells || cells.length < 5) return null;
          const strip = (c) => c.slice(1, -1);
          const kb = Number(strip(cells[4]).replace(/[^\d]/g, ""));
          if (!Number.isFinite(kb) || !kb) return null;
          return { mb: Math.round(kb / 1024), name: strip(cells[0]), pid: strip(cells[1]) };
        }
        const m = line.trim().match(/^(\d+)\s+(.*)$/);
        if (!m) return null;
        return { mb: Math.round(Number(m[1]) / 1024), name: m[2], pid: "" };
      })
      .filter(Boolean);
    if (!rows.length) return null;
    rows.sort((a, b) => b.mb - a.mb);
    return rows[0];
  } catch {
    return null;
  }
}

/** `12,345 MB`, so a four-figure number is readable at a glance. */
const mb = (n) => `${n.toLocaleString("en-US")} MB`;

function memoryBanner(free) {
  const top = biggestProcess();
  const lines = [
    `  free memory ${mb(free)} of ${mb(totalMb)}.`,
    top ? `  biggest process: ${top.name}${top.pid ? ` (pid ${top.pid})` : ""} holding ${mb(top.mb)}.` : null,
    `  Close what is holding it — a leaked \`next dev\` or a stray test runner is the usual one —`,
    `  then re-run. Override with GATE_MEM_FLOOR_MB=<n> (0 disables the check).`,
  ];
  return lines.filter(Boolean).join("\n");
}

const freeAtStart = freeMb();
if (WARN_FLOOR_MB > 0 && freeAtStart < REFUSE_FLOOR_MB) {
  console.error(
    `\ngate.mjs: not enough memory to grade anything (floor ${mb(REFUSE_FLOOR_MB)}).\n` +
      memoryBanner(freeAtStart) +
      `\n\n  Refusing at exit 2 rather than exit 1: a run this starved reports green steps as` +
      `\n  failing tests, and the messages read like real defects.`
  );
  process.exit(2);
}
const memoryShort = WARN_FLOOR_MB > 0 && freeAtStart < WARN_FLOOR_MB;
if (memoryShort) {
  console.warn(
    `\ngate.mjs: WARNING — memory is short (floor ${mb(WARN_FLOOR_MB)}). Running anyway.\n` +
      memoryBanner(freeAtStart) +
      `\n  If a step fails below, check this before the code: a starved box makes the test` +
      `\n  lanes crash and report the crash as an assertion failure.`
  );
}

/* ── run ─────────────────────────────────────────────────────────────────── */

const results = [];
const started = Date.now();
/* The worst it got, sampled per step, so the summary can say whether a failure
   happened while the box was full rather than only whether it started that way. */
let lowWaterMb = freeAtStart;

/* Seeded BEFORE the run loop so a `--skip`ped step holds its place in the
   per-step summary instead of vanishing from it. */
for (const step of flagSkipped) {
  results.push({
    step,
    state: "skip",
    reason: "--skip",
    fix: `re-run without --skip=${step.id}`,
  });
}

/*
  ─────────────────────────────────────────────────────────────────────────────
  THE STEPS RUN CONCURRENTLY. THEY USED TO RUN ONE AT A TIME, AND THAT WAS THE
  WHOLE COST OF THE GATE.

  MEASURED on this tree, 2026-09-09, `--fast`, 41 steps, all green:

      sequential            332.4s
      the longest step       95.2s   (jest-unit: 748 suites, 14,425 tests)

  Nothing else in those 332 seconds was waiting on anything. Every remaining
  step was a node process reading files with 31 idle cores beside it. A gate
  whose wall clock is the SUM of its steps is paying for an ordering that
  nothing needs, on the one path a developer cannot route around — the pre-push
  hook — which is exactly where a slow check gets bypassed with GATE_SKIP=1 and
  then stays bypassed.

  WHY THIS IS SAFE, checked rather than assumed:

    1. NO FAST STEP WRITES TO THE TREE. Every `tools/check-*.mjs` reads; the
       only `fs.writeFileSync` calls in any of them are inside `--self-test`,
       and every one of those writes into its own `fs.mkdtempSync` directory
       under the OS temp dir. Two self-tests running at once cannot see each
       other's fixtures. (The `permissions` step is the one that USED to
       regenerate a tracked file and diff it; the note on that step records why
       it does not any more. Had it still done so, it could not be here.)
    2. NO FAST STEP OWNS A PORT, A DATABASE OR A LOCK. The steps that do —
       `dex-live`, `eco-perf`, `eco-chaos`, `e2e`, `jest-integration` — are all
       `fast: false` and are not in this set. The scheduler does not know that,
       so it is stated here rather than relied upon: a future step that needs
       exclusive hold of something must declare `serial: true` below.
    3. THE TEST LANES BRING THEIR OWN WORKER POOLS and those pools are already
       capped: jest at `min(8, cpus/2)` in e2e/jest.config.cjs and vitest at 8
       threads in e2e/vitest.config.ts, both from measured tables in those
       files. So `JOBS` below caps how many POOLS may overlap, not how many
       cores are busy — which is why it divides by 4 rather than by 1.

  WHAT IS DELIBERATELY NOT PARALLEL: the preflights. They run first, in one
  pass, before anything is scheduled. They are cheap probes (`which`, a file
  stat, a cache lookup), several of them use `spawnSync`, and a synchronous
  spawn inside a worker would block the event loop and stall every OTHER step's
  I/O — the one way a concurrent runner can be slower than a serial one. Doing
  them up front also keeps their FAIL/SKIP semantics exactly as they were.

  WHAT THE OUTPUT GIVES UP, and what it does not: a step's output no longer
  streams as it happens. It is buffered and printed as one block when that step
  finishes, so two children can never interleave. Nothing is dropped, filtered
  or shortened — the block is byte-for-byte what the step said, under the same
  `--- id: title` header and the same `PASS`/`FAIL`/`SKIP` verdict line the
  serial runner printed. The completion ORDER is now finishing order rather
  than table order; the summary at the end is still in table order, because
  that is the part people read twice.

  A PER-STEP TIME UNDER CONCURRENCY IS NOT THE TIME THAT STEP COSTS. It is wall
  clock while up to `JOBS` other steps competed for the same box, so it reads
  HIGH and the sum of the column now exceeds the total. Said in the header, so
  nobody tunes against it. `GATE_JOBS=1` restores true serial timings and is
  the honest way to measure one step.
  ─────────────────────────────────────────────────────────────────────────────
*/

/*
  Longest-first. With `JOBS` workers pulling from one queue, total wall clock is
  bounded below by the longest single step — but only if that step STARTS first.
  Left in table order, `jest-unit` sits 39th of 41 and the run becomes
  "everything else, then 95 more seconds". These are the measured seconds from
  the 2026-09-09 `--fast` run above; a step with no entry sorts as 1s, which is
  right for the ~25 checks that finished in under two.

  This is a scheduling HINT and nothing reads it as a fact. A number going stale
  costs a few seconds of ordering, never a wrong verdict.
*/
const COST_HINTS = {
  "jest-unit": 95,
  vitest: 42,
  bytes: 39,
  "settings-keys": 32,
  "eslint-dex": 32,
  "vitest-store": 17,
  "ws-contract": 15,
  design: 14,
  "i18n-keys": 11,
  "duplicate-declarations": 8,
  "route-response": 5,
  "metadata-contract": 3,
  "enum-values": 3,
  "docs-reality": 2,
  "icon-names": 2,
  claims: 2,
  "sql-tables": 2,
  superseded: 2,
  "model-columns": 1,
  "guide-anchors": 1,
  "mobile-policy": 1,
};

/*
  How many steps may be in flight. Each heavy step already runs its own pool, so
  this counts POOLS: at 32 cores it is 8, which puts jest's 8 workers, vitest's
  8 threads and six single-process scanners on the box at once and leaves
  headroom. A small box scales down instead of thrashing — and thrashing here is
  not a slow run, it is the memory starvation this file already refuses to grade
  through, which reports green steps as failing tests.

  `GATE_JOBS=<n>` overrides. `GATE_JOBS=1` is exactly the old serial runner.
*/
const JOBS = (() => {
  const override = Number(process.env.GATE_JOBS);
  if (Number.isFinite(override) && override >= 1) return Math.floor(override);
  const byCpu = Math.max(1, Math.min(8, Math.floor(os.cpus().length / 4)));
  /* ~2 GB of headroom per concurrent step: jest's pool is the big one and it is
     the reason this divides free memory rather than total. */
  const byMem = Math.max(1, Math.floor(freeAtStart / 2048));
  return Math.max(1, Math.min(byCpu, byMem));
})();

console.log(
  `\n== gate ${FAST ? "--fast" : FULL ? "--full" : ""}  ${selected.length} step(s)  ` +
    `${JOBS} job(s)  GATE=1 ==`
);
if (JOBS > 1) {
  console.log(
    `   steps run concurrently; each block is printed whole when its step finishes.\n` +
      `   Per-step times are wall clock under load and read high — GATE_JOBS=1 to measure one.\n`
  );
} else {
  console.log("");
}

/* An ENOENT is a broken box, not a failing check. Collected here and reported
   after everything has settled, because exiting from inside the run would
   orphan every child still going. */
const fatalEnv = [];

/**
 * Run one step to a verdict, capturing everything it prints.
 * Returns the block to print and the state for the summary; prints nothing
 * itself, so two steps finishing at once cannot interleave.
 */
async function runStep(step) {
  const out = [];
  const at = Date.now();
  let ok = true;
  let detail = "";
  /* Set when a `lane: true` step's child exits 3 — the A21 "I could not run" code. */
  let laneSkip = null;

  if (step.fn) {
    try {
      const res = step.fn();
      ok = res.ok;
      detail = res.message;
    } catch (error) {
      /* An `fn` step used to be able to take the whole runner down with it. With
         other steps in flight that would also orphan their children, so it is a
         failure of THIS step and the message is its own. */
      ok = false;
      out.push(`gate.mjs: the check threw: ${error?.stack ?? error}\n`);
    }
  } else {
    for (const cmd of step.cmds) {
      const res = await execAsync(cmd, out);
      /*
        EXIT 3 FROM A LANE IS SKIPPED, AND SKIPPED IS NOT PASSED.

        The lane has printed which tool it could not find; repeating a guess here would be a second
        source of truth for something it already knows. What this file adds is that the outcome is
        recorded as a skip — named in the summary, named again in the "Skipped is NOT passed" block
        — instead of a pass, which is the whole reason the convention has its own exit code.

        Only for `lane: true`. `bicrypto-ops` steps keep MIGRATIONS.md §0, where 3 is FATAL;
        `assertNoOpsLane()` refuses a gate in which one of them claims to be a lane.
      */
      if (res.status === 3 && step.lane) {
        laneSkip = `the lane exited 3 (SKIP) — its own reason is printed above`;
        break;
      }
      if (res.enoent) {
        fatalEnv.push(`${step.id}: ${res.enoent}`);
        ok = false;
        break;
      }
      /* cmd.exe's "not recognised" code. Only reachable for the pnpm steps,
         which are the only ones not launched through `node`. */
      if (res.status === 9009) {
        fatalEnv.push(`${step.id}: '${cmd.cmd}' is not on PATH`);
        ok = false;
        break;
      }
      if (res.status !== 0) {
        ok = false;
        break;
      }
    }
  }

  const secs = ((Date.now() - at) / 1000).toFixed(1);
  /* Strip ONE trailing newline and split. `split("\n").slice(0, -1)` looks
     equivalent and is not: it drops the last real line whenever a child's final
     write had no newline on it, which is how a failing assertion loses the line
     naming the file. */
  const text = out.join("");
  const block = [
    `--- ${step.id}: ${step.title}`,
    ...(text ? text.replace(/\n$/, "").split("\n") : []),
  ];

  if (laneSkip) {
    const fix = `read the lane's own output above, then re-run: node scripts/gate.mjs --only=${step.id}`;
    block.push(`    SKIP  ${laneSkip}`, `          make it runnable: ${fix}`, "");
    return { step, state: "skip", reason: laneSkip, fix, block };
  }
  if (ok) {
    block.push(`    PASS  ${detail || `${secs}s`}`, "");
    return { step, state: "pass", block };
  }
  if (detail) block.push(`    ${detail}`);
  if (step.onFail) block.push(`    ${step.onFail}`);
  block.push(`    FAIL  ${secs}s`, "");
  return { step, state: "fail", block };
}

/*
  PREFLIGHTS FIRST, IN ONE SERIAL PASS. See the header: several of them spawn
  synchronously, and a synchronous spawn inside a worker stalls every other
  step's I/O. Doing them here also means the queue below holds only steps that
  can actually run, so a blocked step never occupies a worker slot.
*/
const runnable = [];
const blockedResults = new Map();
for (const step of selected) {
  const blocked = step.preflight ? await step.preflight() : null;
  if (!blocked) {
    runnable.push(step);
    continue;
  }
  const block = [`--- ${step.id}: ${step.title}`];
  if (step.required) {
    block.push(`    FAIL  ${blocked.reason}`, `          make it runnable: ${blocked.fix}`, "");
    blockedResults.set(step.id, { step, state: "fail", block });
  } else {
    block.push(`    SKIP  ${blocked.reason}`, `          make it runnable: ${blocked.fix}`, "");
    blockedResults.set(step.id, {
      step,
      state: "skip",
      reason: blocked.reason,
      fix: blocked.fix,
      block,
    });
  }
}
for (const r of blockedResults.values()) console.log(r.block.join("\n"));

/* Longest-first over one shared queue: `JOBS` workers each take the next step
   until there are none, so a worker that finishes a one-second check picks up
   more work instead of waiting for the slowest step in some fixed batch. */
const queue = [...runnable].sort(
  (a, b) => (COST_HINTS[b.id] ?? 1) - (COST_HINTS[a.id] ?? 1)
);
const finished = new Map();
let cursor = 0;
let completed = 0;

async function worker() {
  while (cursor < queue.length) {
    const step = queue[cursor++];
    lowWaterMb = Math.min(lowWaterMb, freeMb());
    const result = await runStep(step);
    completed++;
    lowWaterMb = Math.min(lowWaterMb, freeMb());
    finished.set(step.id, result);
    /* Printed the moment the step finishes, as one block, so a long run still
       reports progress — and `[n/total]` says how much is left, which the
       serial runner could not because it never knew. The counter goes on the
       header line only; the captured output keeps the exact shape the step
       printed, because that is what people paste into a bug report. */
    const [header, ...rest] = result.block;
    console.log(
      [`[${String(completed).padStart(2)}/${queue.length}] ${header}`, ...rest].join("\n")
    );
  }
}

await Promise.all(Array.from({ length: Math.min(JOBS, queue.length || 1) }, worker));

/* Table order, not finishing order: the summary is the part people read twice,
   and a list that reshuffles between runs cannot be diffed against the last one. */
for (const step of selected) {
  const result = finished.get(step.id) ?? blockedResults.get(step.id);
  if (result) results.push(result);
}

if (fatalEnv.length) {
  console.error(
    `\ngate.mjs: the box is missing something the gate needs — this is not a failing check.\n` +
      fatalEnv.map((line) => `  ${line}`).join("\n") +
      `\n\n  Exit 2 rather than 1, and only now that every other step has finished:` +
      `\n  leaving mid-run would orphan the jest and vitest pools still going.`
  );
  process.exit(2);
}

/* ── summary ─────────────────────────────────────────────────────────────── */

const passed = results.filter((r) => r.state === "pass");
const failed = results.filter((r) => r.state === "fail");
const skipped = results.filter((r) => r.state === "skip");

console.log(`== summary (${((Date.now() - started) / 1000).toFixed(1)}s) ==`);
for (const r of results) {
  console.log(`  ${r.state.toUpperCase().padEnd(5)} ${r.step.id}`);
}
if (skipped.length) {
  console.log("\n  Skipped is NOT passed. To run them:");
  for (const r of skipped) console.log(`    ${r.step.id}: ${r.fix}`);
}

/* Never fails the gate: an operator who has not installed the hook still has a
   working gate, they just have to remember to run it. */
const hooksPath = spawnSync("git", ["config", "--get", "core.hooksPath"], { encoding: "utf8" });
if ((hooksPath.stdout ?? "").trim() !== "scripts/hooks") {
  console.log("\nhint: run pnpm hooks:install");
}

if (failed.length) {
  console.log(`\nGATE FAIL (${failed.length} failed, ${passed.length} passed, ${skipped.length} skipped)`);
  console.log(`  failed: ${failed.map((r) => r.step.id).join(", ")}`);
  /*
    Named here as well as at the top, because by this point the banner is
    thousands of lines up the scrollback and the failures are what the reader is
    looking at. `lowWaterMb` rather than the current reading: the run may have
    finished with the memory back, and it is the moment the step failed that
    decides whether the result means anything.
  */
  if (WARN_FLOOR_MB > 0 && (memoryShort || lowWaterMb < WARN_FLOOR_MB)) {
    console.log(
      `\n  CHECK MEMORY BEFORE THE CODE. Free memory got down to ${mb(lowWaterMb)} during this run,` +
        `\n  under the ${mb(WARN_FLOOR_MB)} floor. A starved box makes the jest and vitest lanes crash` +
        `\n  and reports the crash as an assertion failure, with text that reads like a real defect.` +
        `\n  Re-run the failing step alone to tell the two apart:  node scripts/gate.mjs --only=${failed[0].step.id}`
    );
  }
  process.exit(1);
}
console.log(`\nGATE PASS (${passed.length} passed, ${skipped.length} skipped)`);
process.exit(0);
