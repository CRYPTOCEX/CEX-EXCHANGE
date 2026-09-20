#!/usr/bin/env node
/**
 * `pnpm design:check` — every design gate, in one run, with one summary.
 *
 *   node scripts/design-check.mjs            run every lane
 *   node scripts/design-check.mjs --only=x,y run some
 *   node scripts/design-check.mjs --list     what lanes exist
 *
 * WHY THIS IS A SCRIPT AND NOT A CHAIN OF `&&`
 *
 * The previous form was:
 *
 *   gen-design-defaults --check && verify-component-tokens --check && scan-design-debt --check
 *
 * `&&` SHORT-CIRCUITS. A stale token mirror — the cheapest, most mechanical
 * failure of the three, fixed by running one command — hid the other two
 * entirely. You fix it, re-run, and only then discover the scanner has been
 * failing as well. With eight lanes that becomes eight round trips.
 *
 * Every lane runs here, always. The summary at the end is the whole picture, and
 * the exit code is 1 if any lane failed.
 *
 * WHY THESE LANES AND NOT THREE
 *
 * Four checks already existed and were wired to nothing — no npm script chained
 * them, and `scripts/gate.mjs`, which is this repo's entire CI, had no design
 * lane at all. So they ran only when a human remembered, which for
 * `skeleton:check` meant never: it is RED, and had been silently accumulating
 * regressions against its own baseline. A check nobody runs is not a check.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');

/**
 * `blocking: false` marks a lane that reports a real, pre-existing backlog which
 * is not this change's to clear. It still runs, still prints, and still shows up
 * in the summary — it just does not fail the build. Turn one blocking the moment
 * its backlog reaches zero; that is the whole point of keeping the number in
 * front of people.
 */
const LANES = [
  {
    id: 'tokens',
    what: 'the admin panel’s mirror of globals.css is current',
    args: ['scripts/gen-design-defaults.js', '--check'],
  },
  {
    id: 'self-test',
    what: 'every scanner rule still fires on its own known-bad corpus',
    args: ['scripts/scan-design-debt.js', '--self-test'],
  },
  {
    id: 'debt',
    what: 'no new design-system debt; backlog dimensions within budget',
    args: ['scripts/scan-design-debt.js', '--check'],
  },
  {
    id: 'components',
    what: 'every component token is read by at least one compiled rule',
    args: ['scripts/verify-component-tokens.js', '--check'],
  },
  {
    id: 'status',
    what: 'no columns.tsx disagrees with lib/status-tone.ts',
    args: ['scripts/audit-status-variants.js', '--check'],
  },
  {
    id: 'skeleton',
    what: 'no new layout-shift debt',
    args: ['scripts/scan-skeleton-debt.js', '--check'],
    blocking: false,
  },
];

const argv = process.argv.slice(2);
if (argv.includes('--list')) {
  for (const l of LANES) console.log(`  ${l.id.padEnd(12)} ${l.what}${l.blocking === false ? '   (non-blocking)' : ''}`);
  process.exit(0);
}
const only = argv.find((a) => a.startsWith('--only='));
const selected = only ? new Set(only.slice(7).split(',')) : null;
const lanes = LANES.filter((l) => !selected || selected.has(l.id));

const results = [];
for (const lane of lanes) {
  process.stdout.write(`\n[1m── ${lane.id} [0m— ${lane.what}\n`);
  const started = Date.now();
  const r = spawnSync(process.execPath, lane.args, { cwd: FRONTEND, stdio: 'inherit' });
  results.push({ ...lane, code: r.status ?? 1, ms: Date.now() - started });
}

const failed = results.filter((r) => r.code !== 0);
const blocking = failed.filter((r) => r.blocking !== false);

console.log('\n' + '='.repeat(74));
console.log('  DESIGN CHECK');
console.log('='.repeat(74));
for (const r of results) {
  const mark = r.code === 0 ? 'PASS' : r.blocking === false ? 'WARN' : 'FAIL';
  console.log(`  ${mark}  ${r.id.padEnd(12)} ${String(r.ms).padStart(6)}ms   ${r.what}`);
}
console.log('='.repeat(74));

if (!failed.length) {
  console.log('  All lanes green.\n');
  process.exit(0);
}
if (!blocking.length) {
  console.log(`  ${failed.length} non-blocking lane(s) reporting a known backlog. Not failing the build.\n`);
  process.exit(0);
}
console.log(`  ${blocking.length} blocking lane(s) failed: ${blocking.map((r) => r.id).join(', ')}\n`);
process.exit(1);
