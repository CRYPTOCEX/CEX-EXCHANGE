#!/usr/bin/env node
/**
 * Layout-shift measurement harness — the runtime half of the skeleton work.
 *
 * `scan-skeleton-debt.js` reads source and finds structures that CANNOT be
 * right. This one drives a real browser and measures what actually moves, so
 * "the skeleton matches the loaded page" stops being a claim and becomes a
 * number per route.
 *
 * WHAT IT MEASURES, AND WHY NOT JUST CLS
 * --------------------------------------
 * It reports Cumulative Layout Shift, because that is the metric everyone
 * already knows. But CLS alone is close to useless for FIXING anything: it is
 * one number for the whole page, it says nothing about which element moved,
 * and it under-reports the case we care about most — a shift in content below
 * the fold scores zero because CLS is weighted by viewport impact, yet it is
 * still a page that jumps when you scroll to it.
 *
 * So the primary output is a STATIC-CHROME DIFF instead:
 *
 *   1. Freeze every `/api/**` response. Navigate. The page paints its loading
 *      state. Record the bounding box of every element that carries text.
 *   2. Release the responses. Wait for the data to land. Record again.
 *   3. Any element whose TEXT IS IDENTICAL in both passes is static chrome — a
 *      heading, a label, a column name, a button. It is not what we were
 *      waiting for, so it had no business moving. If its box changed, the
 *      skeleton beside it was the wrong size, and the delta in pixels is
 *      exactly how wrong.
 *
 * That framing is what makes the output actionable: it names the element, in
 * text, and gives a signed pixel delta. "The 'Total Volume' label moved down
 * 22px" points at one card. A CLS of 0.04 points at nothing.
 *
 * RUNNING IT (Windows — both of these are load-bearing)
 * ----------------------------------------------------
 * Playwright lives in a sibling package and no browser binaries were ever
 * downloaded, so it must borrow an installed Chrome:
 *
 *   $env:NODE_PATH="C:\xampp\htdocs\v5\envato\node_modules"
 *   node scripts/measure-layout-shift.mjs --routes /en,/en/blog
 *
 * Drive it from PowerShell, NOT Git Bash: MSYS rewrites a leading-slash
 * argument into a Windows path, so `--routes /en` arrives as
 * `C:/Program Files/Git/en` and Chrome answers "Cannot navigate to invalid
 * URL". `MSYS2_ARG_CONV_EXCL="*"` is the escape hatch if you must.
 *
 * SCOPE — read this before trusting a green result
 * ------------------------------------------------
 * Freezing `/api/**` holds CLIENT-side fetches, which is where this app's
 * shift lives (225 of 452 pages are `"use client"` and fetch in an effect).
 * It does NOT hold a server component's own data fetch — that happens before
 * any bytes reach the browser, so a purely server-rendered route will report a
 * clean 0 here whether or not its `loading.tsx` is faithful. Those need the
 * source-level scanner, not this. A route is only as verified as the state
 * this harness could actually catch it in, and `--require-loading-state` makes
 * that explicit by failing when the skeleton pass looked identical to the
 * loaded one.
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Find Playwright, which is not a dependency of this package.
 *
 * `NODE_PATH` does NOT work here and the failure is confusing: it is honoured
 * only by CommonJS `require`, and ES modules resolve through a different path
 * that ignores it entirely. Setting it and then getting ERR_MODULE_NOT_FOUND
 * from an `import` is the expected behaviour, not a broken environment.
 *
 * `createRequire` gives back the CommonJS resolver, anchored wherever we point
 * it — so pointing it at the sibling package that does have Playwright
 * installed resolves it without touching either package's dependencies.
 */
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    /* fall through to the anchored resolvers */
  }
  const roots = [
    process.env.PLAYWRIGHT_ROOT,
    join(HERE, '..', '..', 'envato'),
    join(HERE, '..', '..'),
    join(HERE, '..'),
  ].filter(Boolean);

  for (const root of roots) {
    try {
      const req = createRequire(pathToFileURL(join(root, 'noop.js')));
      return req('playwright');
    } catch {
      /* try the next root */
    }
  }
  return null;
}

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(name);

const BASE = arg('--base', 'http://localhost:3000');

/**
 * Derive the route list from the app directory.
 *
 * A hand-typed list is the thing this whole exercise is trying to get rid of:
 * it goes stale exactly like a hand-written skeleton does, and the routes it
 * quietly stops covering are the ones nobody is looking at.
 *
 * DYNAMIC SEGMENTS ARE SKIPPED, not guessed. `/en/blog/[slug]` needs a real
 * slug and inventing one produces a 404 that measures a beautiful zero — the
 * most dangerous possible result, because it looks like a pass. Pass those
 * explicitly via `--routes` with a known id when you want them covered.
 */
function discoverRoutes(locale) {
  const appDir = join(HERE, '..', 'app', '[locale]');
  const out = [];
  const walk = (dir, segments) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === 'page.tsx')) {
      out.push('/' + [locale, ...segments].join('/'));
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('_') || e.name === 'node_modules') continue;
      /* `(group)` segments are organisational and contribute no URL segment. */
      const isGroup = e.name.startsWith('(') && e.name.endsWith(')');
      const isDynamic = e.name.includes('[');
      if (isDynamic) continue;
      walk(join(dir, e.name), isGroup ? segments : [...segments, e.name]);
    }
  };
  walk(appDir, []);
  return [...new Set(out)].sort();
}

const LOCALE = arg('--locale', 'en');

/**
 * Where to forward `/api/*`. Set this to measure a PRODUCTION build.
 *
 * Unset (the default) the harness leaves API traffic alone, which is correct
 * against `next dev` — its own rewrite proxies to the backend already.
 */
const API_TARGET = (() => {
  const raw = arg('--api-target', null);
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    process.stderr.write(`--api-target is not a URL: ${raw}\n`);
    process.exit(2);
  }
})();

/**
 * How many routes to measure at once.
 *
 * Serial, a 353-route sweep is ~25 minutes against a production build and
 * hours against dev. Concurrency is what makes a full sweep a routine thing to
 * run rather than an event.
 *
 * A CAVEAT THAT MUST NOT BE LOST: concurrent pages share one machine's CPU, so
 * the TIMING-sensitive number — CLS, which is scored per animation frame — can
 * be inflated by contention that has nothing to do with the page. The
 * box-diff metrics (`matched`, `moved`, `pageHeightDelta`) are computed from
 * two snapshots and are unaffected, which is another reason they, not CLS, are
 * this tool's primary output.
 *
 * So: sweep wide with concurrency to FIND routes that move, then re-measure
 * those few serially before believing a CLS figure. Default 1 keeps the
 * careful path the default.
 */
const CONCURRENCY = Math.max(1, Number(arg('--concurrency', 1)) || 1);
const ROUTES = has('--all')
  ? discoverRoutes(LOCALE)
  : (arg('--routes', `/${LOCALE}`) || '').split(',').map((r) => r.trim()).filter(Boolean);
const LIMIT = Number(arg('--limit', 0));
const HOLD_MS = Number(arg('--hold', 1200));
const SETTLE_MS = Number(arg('--settle', 2500));
const VIEWPORT = { width: Number(arg('--width', 1440)), height: Number(arg('--height', 900)) };
const TOLERANCE = Number(arg('--tolerance', 1));
const STORAGE = arg('--storage', null);
const JSON_OUT = arg('--json', null);
const REQUIRE_LOADING = has('--require-loading-state');

/**
 * Collect a box per text-bearing element, keyed by its own text.
 *
 * Runs in the page. The key deliberately uses the element's DIRECT text only
 * (`childNodes` filtered to text nodes) — `textContent` on a wrapper returns
 * the concatenation of everything beneath it, so a single `<body>` would key
 * as the whole page and every ancestor would collide with its children.
 *
 * Keys that appear more than once are dropped rather than disambiguated by
 * position: two elements reading "Balance" cannot be told apart across a DOM
 * that restructured between passes, and a wrong pairing invents a shift that
 * did not happen. Losing a duplicate is a false negative; keeping it is a
 * false positive, and this tool is worthless if it cries wolf.
 */
const COLLECT = `(() => {
  const out = new Map();
  const dupes = new Set();
  for (const el of document.querySelectorAll('body *')) {
    let text = '';
    for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
    text = text.trim().replace(/\\s+/g, ' ');
    if (!text || text.length > 80) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const key = el.tagName + '|' + text;
    if (out.has(key)) { dupes.add(key); continue; }
    out.set(key, {
      text,
      tag: el.tagName,
      x: Math.round(r.x * 100) / 100,
      y: Math.round((r.y + window.scrollY) * 100) / 100,
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
    });
  }
  for (const k of dupes) out.delete(k);
  return { boxes: Object.fromEntries(out), height: document.documentElement.scrollHeight };
})()`;

/**
 * Installed before any page script so no shift entry is missed.
 *
 * `entry.sources` is the part worth having. A bare CLS number cannot be acted
 * on — and worse, it can be actively misleading, because the browser groups
 * shifts into session windows and scores a frame on the UNION of everything
 * that moved in it. One small shift landing in the same frame as a large one
 * inherits the whole frame's score, so a number can rise while the layout
 * genuinely improves. Recording the offending node per entry is what separates
 * "this got worse" from "this got grouped".
 */
const CLS_INIT = `
  window.__cls = 0;
  window.__clsEntries = [];
  const __describe = (node) => {
    if (!node || node.nodeType !== 1) return '(unknown)';
    const id = node.id ? '#' + node.id : '';
    const cls = typeof node.className === 'string' && node.className
      ? '.' + node.className.trim().split(/\\s+/).slice(0, 3).join('.')
      : '';
    let text = '';
    for (const n of node.childNodes) if (n.nodeType === 3) text += n.nodeValue;
    text = text.trim().replace(/\\s+/g, ' ').slice(0, 40);
    return node.tagName.toLowerCase() + id + cls + (text ? ' "' + text + '"' : '');
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__cls += entry.value;
      window.__clsEntries.push({
        value: Math.round(entry.value * 10000) / 10000,
        at: Math.round(entry.startTime),
        sources: (entry.sources || []).slice(0, 4).map((s) => ({
          node: __describe(s.node),
          dy: s.currentRect && s.previousRect
            ? Math.round(s.currentRect.y - s.previousRect.y)
            : null,
        })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
`;

async function launch(chromium) {
  /* No bundled binaries here, so fall through the installed channels. */
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try {
      return await chromium.launch({ headless: !has('--headed'), ...(channel ? { channel } : {}) });
    } catch {
      /* try the next channel */
    }
  }
  throw new Error(
    'No Chromium available. Install a browser channel, or run `npx playwright install chromium`.'
  );
}

async function measureRoute(context, route) {
  const page = await context.newPage();
  await page.addInitScript(CLS_INIT);

  /*
   * Console and page errors, captured alongside the layout measurement.
   *
   * A hydration mismatch is the failure mode this whole exercise can most
   * easily introduce: rendering one tree on the server and a differently-
   * shaped pending tree on the client is exactly what React refuses to
   * reconcile. It does not throw — it warns, silently repairs the DOM, and
   * leaves you with a page that shifts for a reason no layout metric explains.
   * So the only way to know a conversion is clean is to watch the console
   * while it loads, which costs nothing once a browser is already open.
   */
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const text = msg.text();
    /* Next's dev overlay repeats every error as a second generic line. */
    if (/^\[Fast Refresh\]/.test(text)) return;
    consoleErrors.push({ type: msg.type(), text: text.slice(0, 300) });
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ type: 'pageerror', text: String(err.message).slice(0, 300) });
  });

  /* The gate. Every API response parks here until `release()` resolves, which
     is what holds the page in its loading state long enough to photograph. */
  let release;
  const gate = new Promise((r) => (release = r));
  let held = 0;

  await page.route('**/api/**', async (r) => {
    held += 1;
    await gate;
    if (!API_TARGET) {
      await r.continue().catch(() => {});
      return;
    }
    /*
     * Stand in for the reverse proxy, so this can measure a PRODUCTION build.
     *
     * `next.config.ts` rewrites `/api/*` to the backend "(dev only)" — a real
     * deployment fronts it with nginx. So under `next start` there is no proxy,
     * `/api/*` falls through to the CMS catch-all, and every fetch resolves to
     * an HTML page. The first attempt to measure production reported a wall of
     * `Unexpected token '<'` and layout numbers taken from pages whose data
     * never arrived — a whole run that looked like signal and was noise.
     *
     * Forwarding here is what makes production measurable at all, and
     * production is worth measuring: dev compiles each route on first hit
     * (~35s), which is the difference between a sweep of hours and one of
     * minutes, and dev is not the artefact that ships.
     *
     * `route.fetch` replays the original request — method, headers, body,
     * cookies — against the rewritten origin. Cookies are not port-scoped, so
     * a session captured on :3000 is sent to :4000 unchanged.
     */
    try {
      const url = new URL(r.request().url());
      url.protocol = API_TARGET.protocol;
      url.host = API_TARGET.host;
      const response = await r.fetch({ url: url.toString() });
      await r.fulfill({ response });
    } catch (err) {
      /* A failed forward must not look like a slow one: abort so the page's own
         error handling runs, rather than hanging until the navigation times
         out and the route is reported as errored for the wrong reason. */
      await r.abort().catch(() => {});
    }
  });

  const result = { route, ok: false };

  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(HOLD_MS);

    const before = await page.evaluate(COLLECT);

    release();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(SETTLE_MS);

    const after = await page.evaluate(COLLECT);
    const cls = await page.evaluate('window.__cls');
    const clsEntries = await page.evaluate('window.__clsEntries');

    /* Elements present, with identical text, in BOTH passes: static chrome. */
    const shifts = [];
    for (const [key, a] of Object.entries(before.boxes)) {
      const b = after.boxes[key];
      if (!b) continue;
      const dy = Math.round((b.y - a.y) * 100) / 100;
      const dx = Math.round((b.x - a.x) * 100) / 100;
      const dh = Math.round((b.h - a.h) * 100) / 100;
      if (Math.abs(dy) > TOLERANCE || Math.abs(dx) > TOLERANCE || Math.abs(dh) > TOLERANCE) {
        shifts.push({ text: a.text, tag: a.tag, dx, dy, dh, from: a.y, to: b.y });
      }
    }
    shifts.sort((p, q) => Math.abs(q.dy) - Math.abs(p.dy));

    Object.assign(result, {
      ok: true,
      cls: Math.round(cls * 10000) / 10000,
      /* Biggest-scoring frames first — that is the order you would fix them. */
      clsEntries: (clsEntries || []).sort((a, b) => b.value - a.value).slice(0, 6),
      apiCallsHeld: held,
      matchedChrome: Object.keys(before.boxes).filter((k) => k in after.boxes).length,
      chromeBefore: Object.keys(before.boxes).length,
      chromeAfter: Object.keys(after.boxes).length,
      pageHeightDelta: after.height - before.height,
      shifted: shifts.length,
      worst: shifts.slice(0, 12),
      consoleErrors,
      /** Hydration is called out separately: it is the defect this work risks. */
      hydrationErrors: consoleErrors.filter((e) =>
        /hydrat|did not match|server HTML|server rendered/i.test(e.text)
      ),
      /* A route where nothing was held, and whose two passes look the same,
         was never actually observed in a loading state. Reporting 0 shift for
         it would be reporting that we looked, and we did not. */
      observedLoadingState: held > 0 || Object.keys(before.boxes).length !== Object.keys(after.boxes).length,
      /*
       * THE OTHER FALSE PASS, and it is worse than the one above because it
       * looks like a perfect score.
       *
       * `shifted` counts elements present in BOTH passes whose box moved. If
       * almost nothing is present in both, there is almost nothing to move, so
       * a page that replaced itself ENTIRELY reports `moved: 0` — the same
       * output as a page that never moved at all.
       *
       * Seen for real: the CMS catch-all reported CLS 0.0003 / moved 0 at
       * `--hold 1200` while being completely broken. By 1200ms it had already
       * swapped itself, so both photographs were of the page that replaced the
       * first one. At `--hold 60` the same route reported `matched 0` — not
       * one element survived — which is the signal that was there all along.
       *
       * So: a low overlap between the two passes invalidates the result. It
       * does not mean "clean", it means the two photographs are of different
       * pages and the comparison is meaningless.
       */
      lowOverlap:
        Object.keys(before.boxes).length > 0 &&
        Object.keys(before.boxes).filter((k) => k in after.boxes).length <
          Math.max(2, Object.keys(before.boxes).length * 0.25),
    });
  } catch (err) {
    result.error = err.message;
    release?.();
  } finally {
    await page.close().catch(() => {});
  }
  return result;
}

async function main() {
  const pw = await loadPlaywright();
  if (!pw) {
    process.stderr.write(
      'playwright not resolvable. It is not a dependency of frontend/; on this\n' +
        'machine it is installed in the sibling `envato` package, which the\n' +
        'resolver above looks for. Override with PLAYWRIGHT_ROOT=<dir containing\n' +
        'node_modules/playwright>. Note NODE_PATH does not help an ES module.\n'
    );
    process.exit(2);
  }
  const { chromium } = pw;

  const browser = await launch(chromium);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    ...(STORAGE ? { storageState: STORAGE } : {}),
  });

  const routes = LIMIT > 0 ? ROUTES.slice(0, LIMIT) : ROUTES;
  process.stdout.write(`${routes.length} route(s)${LIMIT && ROUTES.length > LIMIT ? ` (of ${ROUTES.length}, --limit applied)` : ''}\n`);

  /*
   * Measure `CONCURRENCY` routes at a time, then REPORT in the original order.
   *
   * Reporting is deliberately separated from measuring: interleaving the output
   * of parallel runs produces a log nobody can read, and the per-route blocks
   * below assume they own the cursor.
   */
  const results = [];
  if (CONCURRENCY > 1) {
    process.stdout.write(
      `measuring ${CONCURRENCY} at a time` +
        (API_TARGET ? `, forwarding /api/* -> ${API_TARGET.origin}` : '') +
        '\n'
    );
  } else if (API_TARGET) {
    process.stdout.write(`forwarding /api/* -> ${API_TARGET.origin}\n`);
  }

  for (let i = 0; i < routes.length; i += CONCURRENCY) {
    const batch = routes.slice(i, i + CONCURRENCY);
    const measured = await Promise.all(batch.map((route) => measureRoute(context, route)));
    results.push(...measured);
    if (CONCURRENCY > 1) {
      process.stdout.write(
        `  … ${Math.min(i + CONCURRENCY, routes.length)}/${routes.length}\n`
      );
    }
  }

  for (const r of results) {
    const route = r.route;
    process.stdout.write(`\n${route}\n${'-'.repeat(Math.max(8, route.length))}\n`);

    if (!r.ok) {
      process.stdout.write(`  ERROR  ${r.error}\n`);
      continue;
    }
    if (!r.observedLoadingState) {
      process.stdout.write(
        '  SKIPPED  no loading state observed (no /api call held — likely server-rendered).\n' +
          '           Source-scan this route instead; this harness cannot see its swap.\n'
      );
      continue;
    }
    process.stdout.write(
      `  CLS ${r.cls}   static chrome matched ${r.matchedChrome}   moved ${r.shifted}   page height ${r.pageHeightDelta >= 0 ? '+' : ''}${r.pageHeightDelta}px\n`
    );
    for (const s of r.worst) {
      const parts = [];
      if (s.dy) parts.push(`y ${s.dy > 0 ? '+' : ''}${s.dy}`);
      if (s.dx) parts.push(`x ${s.dx > 0 ? '+' : ''}${s.dx}`);
      if (s.dh) parts.push(`h ${s.dh > 0 ? '+' : ''}${s.dh}`);
      process.stdout.write(`    ${parts.join('  ').padEnd(22)} ${s.tag}  "${s.text}"\n`);
    }
    if (r.lowOverlap) {
      process.stdout.write(
        `    !! LOW OVERLAP — only ${r.matchedChrome} of ${r.chromeBefore} pending elements survived into the\n` +
          `       loaded page. The two passes are largely DIFFERENT pages, so "moved" is\n` +
          `       meaningless here and a low number is NOT a pass. This usually means the\n` +
          `       route replaces its whole tree; re-run with a much smaller --hold (e.g. 60)\n` +
          `       to catch the first paint before the swap.\n`
      );
    } else if (!r.shifted) {
      process.stdout.write('    no static chrome moved\n');
    }

    if (r.hydrationErrors?.length) {
      process.stdout.write(`    HYDRATION (${r.hydrationErrors.length}):\n`);
      for (const e of r.hydrationErrors.slice(0, 3)) {
        process.stdout.write(`      ${e.text.replace(/\s+/g, ' ').slice(0, 160)}\n`);
      }
    }
    const otherErrors = (r.consoleErrors || []).filter(
      (e) => !r.hydrationErrors.includes(e)
    );
    if (otherErrors.length) {
      process.stdout.write(`    console (${otherErrors.length}):\n`);
      for (const e of otherErrors.slice(0, 4)) {
        process.stdout.write(`      [${e.type}] ${e.text.replace(/\s+/g, ' ').slice(0, 150)}\n`);
      }
    }

    if (r.clsEntries?.length) {
      process.stdout.write('    CLS by frame (largest first):\n');
      for (const e of r.clsEntries) {
        const who = e.sources
          .map((s) => `${s.node}${s.dy !== null ? ` [dy ${s.dy}]` : ''}`)
          .join(' | ');
        process.stdout.write(`      ${String(e.value).padEnd(8)} @${String(e.at).padEnd(6)} ${who || '(no source)'}\n`);
      }
    }
  }

  await browser.close();

  const measured = results.filter((r) => r.ok && r.observedLoadingState);
  /* `lowOverlap` counts as dirty, not clean — see the note on the field. */
  const dirty = measured.filter((r) => r.shifted > 0 || r.lowOverlap);
  const invalid = measured.filter((r) => r.lowOverlap);
  const unobserved = results.filter((r) => r.ok && !r.observedLoadingState);
  const errored = results.filter((r) => !r.ok);

  process.stdout.write('\n' + '='.repeat(60) + '\n');
  process.stdout.write(
    `measured ${measured.length}   clean ${measured.length - dirty.length}   shifting ${dirty.length}   ` +
      `unobserved ${unobserved.length}   errored ${errored.length}` +
      (invalid.length ? `   INVALID(low-overlap) ${invalid.length}` : '') +
      '\n'
  );
  if (invalid.length) {
    process.stdout.write(
      `  low-overlap routes (result meaningless, re-run with a smaller --hold): ${invalid
        .map((r) => r.route)
        .join(', ')}\n`
    );
  }

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
    process.stdout.write(`json: ${JSON_OUT}\n`);
  }

  if (has('--check')) {
    const failed = dirty.length + errored.length + (REQUIRE_LOADING ? unobserved.length : 0);
    process.exit(failed ? 1 : 0);
  }
}

main();
