#!/usr/bin/env node
/**
 * Log in once and save the session, so `measure-layout-shift.mjs` can reach the
 * ~261 admin pages instead of only the public site.
 *
 * Usage (PowerShell — see the MSYS note in measure-layout-shift.mjs):
 *   $env:SKELETON_EMAIL="admin@example.com"
 *   $env:SKELETON_PASSWORD="..."
 *   node scripts/auth-storage-state.mjs --out .auth.json
 *   node scripts/measure-layout-shift.mjs --all --storage .auth.json
 *
 * WHY THIS IS NOT JUST `page.fill()` + click
 * ------------------------------------------
 * Login is behind a proof-of-work challenge, so the form cannot be driven
 * blind. The flow is: ask for a challenge, burn some hashes, post the answer
 * with the credentials. It is cheap — `medium` difficulty is 17 leading zero
 * BITS, a few thousand SHA-256s, well under a second — but it must happen, and
 * it must happen from INSIDE the page so the session cookie lands on the right
 * origin.
 *
 * THE FAILURE MODE THIS GUARDS AGAINST
 * ------------------------------------
 * An under-privileged session does not look like an auth failure. The admin
 * APIs answer a non-admin with nothing, so the page renders its own empty
 * state: a 200, no console errors, a screenshot that looks like a real page,
 * and a layout-shift measurement of approximately zero because there was never
 * any data to arrive. That is a false PASS, and it is the exact failure this
 * whole harness exists to avoid.
 *
 * So this script does not just log in — it asserts the session can actually
 * see admin data before it writes the file. If you get a clean bill of health
 * from a run whose storage state came from here, the session was real.
 */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = argv.indexOf(n);
  return i === -1 ? d : argv[i + 1];
};

const BASE = arg('--base', 'http://localhost:3000');
const OUT = resolve(arg('--out', '.auth.json'));
const EMAIL = process.env.SKELETON_EMAIL;
const PASSWORD = process.env.SKELETON_PASSWORD;
/** A page that renders nothing useful without an admin session. */
const PROBE = arg('--probe', '/en/admin');

if (!EMAIL || !PASSWORD) {
  process.stderr.write('set SKELETON_EMAIL and SKELETON_PASSWORD\n');
  process.exit(2);
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    /* fall through */
  }
  for (const root of [process.env.PLAYWRIGHT_ROOT, join(HERE, '..', '..', 'envato'), join(HERE, '..', '..')].filter(Boolean)) {
    try {
      return createRequire(pathToFileURL(join(root, 'noop.js')))('playwright');
    } catch {
      /* next */
    }
  }
  return null;
}

/** `difficulty` counts leading zero BITS, not zero characters. */
function solve(challenge, difficulty) {
  const bytes = Math.ceil(difficulty / 8);
  for (let nonce = 0; nonce < 50_000_000; nonce++) {
    const hash = createHash('sha256').update(`${challenge}:${nonce}`).digest();
    let bits = 0;
    for (let i = 0; i < bytes; i++) {
      const b = hash[i];
      if (b === 0) {
        bits += 8;
        continue;
      }
      bits += Math.clz32(b) - 24;
      break;
    }
    if (bits >= difficulty) return { nonce, hash: hash.toString('hex') };
  }
  throw new Error('proof-of-work did not converge');
}

const pw = await loadPlaywright();
if (!pw) {
  process.stderr.write('playwright not resolvable (see measure-layout-shift.mjs)\n');
  process.exit(2);
}

let browser;
for (const channel of [undefined, 'chrome', 'msedge']) {
  try {
    browser = await pw.chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    break;
  } catch {
    /* next channel */
  }
}
if (!browser) {
  process.stderr.write('no chromium channel available\n');
  process.exit(2);
}

const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${BASE}/en/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

/*
 * Retry everything. The PoW endpoint returns a bare 500 a good fraction of the
 * time, and under nodemon the dev backend restarts mid-flight, which surfaces
 * as a thrown `Failed to fetch` rather than a status code. Each step succeeds
 * eventually; none of them succeed reliably first time.
 */
async function attempt() {
  const challenge = await page.evaluate(async () => {
    const r = await fetch('/api/auth/pow/challenge?action=login', { credentials: 'include' });
    if (!r.ok) throw new Error(`challenge ${r.status}`);
    return r.json();
  });

  let solution = null;
  if (challenge?.enabled !== false && challenge?.challenge) {
    const { nonce, hash } = solve(challenge.challenge, challenge.difficulty ?? 17);
    solution = { challenge: challenge.challenge, nonce, hash };
  }

  return page.evaluate(
    async ([email, password, powSolution]) => {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(powSolution ? { email, password, powSolution } : { email, password }),
      });
      return { status: r.status, body: await r.text() };
    },
    [EMAIL, PASSWORD, solution]
  );
}

let res = null;
for (let i = 0; i < 8; i++) {
  try {
    res = await attempt();
    if (res.status < 400) break;
  } catch (err) {
    res = { status: 0, body: String(err) };
  }
  await page.waitForTimeout(2000);
}

if (!res || res.status >= 400) {
  process.stderr.write(`login failed: ${res?.status} ${res?.body?.slice(0, 300)}\n`);
  await browser.close();
  process.exit(1);
}

/*
 * Prove the session is not merely authenticated but ADMIN. See the header note:
 * an under-privileged session renders a plausible empty page and measures as a
 * perfect zero, which would be reported as a pass.
 */
await page.goto(BASE + PROBE, { waitUntil: 'networkidle', timeout: 60000 });
const probe = await page.evaluate(() => ({
  elements: document.querySelectorAll('*').length,
  text: document.body.innerText.slice(0, 400).toLowerCase(),
}));

const denied = /log in|sign in|restricted|not authorized|permission/.test(probe.text);
if (denied || probe.elements < 150) {
  process.stderr.write(
    `session reached ${PROBE} but it does not look like an admin page ` +
      `(${probe.elements} elements). Refusing to write a storage state that would ` +
      `measure empty pages as clean.\n`
  );
  await browser.close();
  process.exit(1);
}

await context.storageState({ path: OUT });
process.stdout.write(`session saved: ${OUT}  (probe ${PROBE}: ${probe.elements} elements)\n`);
await browser.close();
