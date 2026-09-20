#!/usr/bin/env node
/**
 * Skeleton / layout-shift debt scanner.
 *
 * Read-only. Answers one question per file: when this component is waiting for
 * data, does it keep its own layout, or does it throw the layout away and put
 * something differently-shaped in its place?
 *
 * Usage:
 *   node scripts/scan-skeleton-debt.js                report
 *   node scripts/scan-skeleton-debt.js --top 30       worst files first
 *   node scripts/scan-skeleton-debt.js --json out.json machine worklist
 *   node scripts/scan-skeleton-debt.js --rule full-swap-return
 *   node scripts/scan-skeleton-debt.js --baseline     (re)write the ratchet file
 *   node scripts/scan-skeleton-debt.js --check        CI gate: fail on NEW debt
 *
 * WHY AN AST AND NOT A REGEX
 * --------------------------
 * `scan-design-debt.js` next door is regex-based and right to be: it matches
 * class-name SHAPE, which is a lexical property. This scanner matches CONTROL
 * FLOW — "is this JSX the whole of what the function returns, or one branch of
 * a value-level swap" — and that is not a lexical property. A regex for
 * `if (loading) return` cannot tell a full-page bail-out from an early return
 * inside a `.map()` callback, and both spellings are in this codebase.
 *
 * TypeScript is already a dependency (5.9.3) and parses TSX directly, so the
 * accuracy is free.
 *
 * THE RULES, and what each one costs a user
 * -----------------------------------------
 * full-swap-return      The component returns a DIFFERENT tree while loading.
 *                       Everything below the swap point reflows when data
 *                       lands. Worst when the fallback is `min-h-screen`,
 *                       because then the page height itself changes.
 *
 * hidden-while-loading  A subtree gated on `!loading`. It is absent, then
 *                       present — so the container GROWS at the moment of
 *                       arrival and pushes everything after it down. This is
 *                       the sneakiest one: the skeleton can be pixel-perfect
 *                       and the page still jumps, because the shift is caused
 *                       by what the skeleton state OMITS.
 *
 *                       ONE LEGITIMATE EXCEPTION: an empty/error state MUST be
 *                       gated this way, or it fires against undefined data and
 *                       tells the user something false. This rule cannot tell
 *                       "no results found" from a withheld delta row, and it
 *                       should not try to guess from the markup.
 *
 *                       The resolution is to hoist the condition to a named
 *                       predicate — `const showEmptyState = !loading && !rows.length`
 *                       — which reads better anyway and takes the loading token
 *                       out of the JSX. That is a real improvement, not a way
 *                       of silencing the rule: the name is where you say WHICH
 *                       of the two cases this is.
 *
 * divergent-branch      `loading ? <A/> : <B/>` where A and B are structurally
 *                       different roots. A value-level swap is fine and is not
 *                       flagged; a tree-level one is a reflow.
 *
 * spinner-fallback      The waiting state has no shape at all. A spinner
 *                       communicates "wait" and reserves nothing, so 100% of
 *                       the eventual layout arrives as shift.
 *
 * unmeasured-skeleton   `<Skeleton className="h-8 w-24"/>` standing in for
 *                       text. The box is a guess that cannot track the
 *                       typography it imitates. Advisory severity: it is only
 *                       WRONG if the number is wrong, but it is unverifiable
 *                       by construction, which is why `SkeletonText` exists.
 *
 * Rule severities are multiplied by measured viewport area where the source
 * says so (`min-h-screen`, `h-screen`, `inset-0`), because a full-viewport
 * swap and a swap inside one card are not the same defect.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components'];
const BASELINE_FILE = path.join(__dirname, 'skeleton-debt.baseline.json');

/**
 * What counts as "this expression is about a pending fetch".
 *
 * Deliberately broad on the left (`loadingTier`, `isLoadingTemplates`,
 * `analytics.isLoading`) and deliberately NOT matching `loaded`/`isLoaded`,
 * which invert the meaning and would flag correct code. `\bpending\b` is in
 * because react-query and several hooks here spell it that way.
 *
 * KNOWN FRICTION, and it is the intended trade: `\bpending\b` also matches a
 * PER-ROW variable. Converting a list to pending rows usually produces
 * `{!pending && …}` or `{pending ? … : …}` inside the map callback, and this
 * rule cannot tell that from a page-level flag — so a correct conversion can
 * RAISE the score. One sweep went 338 -> 359 that way before coming down to
 * 112.
 *
 * The fix is the one the `hidden-while-loading` note already prescribes: hoist
 * the condition to a named predicate (`artworkReady`, `showRarityBadge`) so
 * the loading token leaves the JSX. That is not a workaround — the name is
 * where you state which of the two cases it is, which is exactly the
 * information the rule is missing. Narrowing the regex instead would lose the
 * hooks that legitimately spell it `pending`.
 */
const LOADING_RE =
  /\b(is|are)?_?[Ll]oading[A-Za-z]*\b|\bisFetching\b|\bisPending\b|\bpending\b|\bstate\s*===\s*["'`]loading["'`]/;

/**
 * A guard that fires only once loading has FINISHED.
 *
 * `if (!isLoading && !data) return <NotFound/>` is not a loading swap — it is
 * the opposite, and it is mandatory. Removing an early return un-shadows every
 * branch below it, so empty and error states have to be re-gated on `!loading`
 * or they fire against undefined data and assert things that are false ("no
 * wallet found", "verification required", "0% completion rate").
 *
 * The first version of this scanner matched the loading token anywhere in the
 * condition and flagged all of those. On one tree that was 17 of 24 remaining
 * findings — every one of them the fix. A ratchet that reports correct code as
 * debt trains people to ignore it, or worse, to "fix" it back into a bug, so
 * this is a correctness requirement for the tool and not a nicety.
 *
 * Matches `!loading`, `!isLoading`, `!data.isLoading`, `!pending`,
 * `!loadingTier`, `!(loading)`, `loading === false`.
 *
 * The leading `[\w.$]*` MUST be allowed to match empty. It was
 * `[A-Za-z_$][\w.$]*`, requiring at least one character before the keyword,
 * which meant the rule recognised `!isLoading` but not a bare `!loading` — so
 * whether a correct empty-state guard was reported as debt came down to what
 * the author had named their flag. Three files were flagged for that reason
 * alone.
 *
 * It still must NOT match a bare `isLoading` (a genuine pending swap); the
 * leading `!` is what carries the meaning here, not the identifier.
 */
const RESOLVED_GUARD_RE =
  /!\s*\(?\s*[\w.$]*(?:[Ll]oading|[Pp]ending|[Ii]sFetching)[\w.$]*|(?:[Ll]oading|[Pp]ending)\s*===\s*false/;

/**
 * A gate on "has this component mounted in a browser yet".
 *
 * THIS RULE EXISTS BECAUSE THE SCANNER MISSED THE BIGGEST DEFECT IN THE APP.
 * `LOADING_RE` does not match `mounted`, so every instance of this pattern was
 * invisible to every other rule here. Four were found by measuring in a
 * browser instead, and between them they were the largest single source of
 * layout shift in the codebase:
 *
 *   components/partials/footer/index.tsx   `if (!mounted …) return null`
 *                                          — the site footer was absent from
 *                                          the server HTML on EVERY page
 *   components/license/LicenseGate.tsx     blanked 19 admin back offices
 *   admin/gateway/context/…-mode.tsx       blanked one back office
 *   app/[locale]/components/home-route-…   the homepage
 *
 * The pattern is always written as a hydration-safety measure, and it always
 * has the same cost: the server renders a DIFFERENT page, and the real one
 * arrives at hydration. It is sometimes genuinely necessary — a persisted
 * store really can hold a value the server could not know — but the fix is to
 * gate the smallest possible thing, or to thread the value through the server
 * render, never to withhold the subtree.
 *
 * Matches `!mounted`, `!isMounted`, `!hasMounted`, `!isClient`, `!didMount`.
 */
const MOUNT_GATE_RE =
  /!\s*\(?\s*(?:is|has|did)?[Mm]ounted\b|!\s*\(?\s*is[Cc]lient\b|!\s*\(?\s*hasHydrated\b/;

/** Fallbacks that reserve nothing. */
const SPINNER_RE = /\bLoader2\b|\bLoaderCircle\b|animate-spin|\bSpinner\b|\bLoadingSpinner\b/;

/** Source that says "this covers a large fraction of the viewport". */
const FULL_VIEWPORT_RE = /min-h-screen|h-screen|h-\[calc\(100vh|inset-0|min-h-\[\d+vh\]/;

const RULES = {
  'full-swap-return': { weight: 10, label: 'whole-subtree swap on loading' },
  'hidden-while-loading': { weight: 6, label: 'content withheld until loaded (container grows)' },
  'divergent-branch': { weight: 5, label: 'loading branch has a different root than the real one' },
  'spinner-fallback': { weight: 8, label: 'shapeless fallback (spinner)' },
  /**
   * Weighted highest of all, and it earned that: the server sends a DIFFERENT
   * PAGE, so 100% of the real layout arrives at hydration. A mis-sized
   * skeleton costs pixels; this costs the whole tree.
   */
  'mount-gate': { weight: 12, label: 'subtree withheld until mounted (server renders a different page)' },
  /**
   * ADVISORY, and therefore weight 0.
   *
   * It was weight 1, which sounds harmless and inverted the ranking: a
   * `loading.tsx` holding 65 hand-sized blocks scored 65 and sorted ABOVE a
   * page that replaces itself with a full-viewport spinner (54). One of those
   * is a page that might be a few pixels out; the other is a page that isn't
   * there. Counting them on one scale said they were comparable.
   *
   * The count is still reported — it is the size of the "cannot be verified by
   * reading it" surface — it just does not compete with structural defects for
   * attention.
   */
  'unmeasured-skeleton': { weight: 0, label: 'hardcoded skeleton box standing in for text' },
};

/** Rules that describe a real reflow, as opposed to an unverifiable guess. */
const STRUCTURAL = new Set([
  'full-swap-return',
  'hidden-while-loading',
  'divergent-branch',
  'spinner-fallback',
  'mount-gate',
]);

// ---------------------------------------------------------------------------
// file walk
// ---------------------------------------------------------------------------

const SKIP_DIR = new Set(['node_modules', '.next', 'dist', 'build', '.turbo', 'coverage']);

/**
 * Files where a "defect" is the point of the file.
 *
 * `ui/skeleton.tsx` DEFINES `Loadable`, whose whole body is
 * `if (!loading) return <>{children}</>` — the primitive every fix in this
 * codebase routes through, reported as debt by the rule it exists to satisfy.
 * `__lintprobe.tsx` is a fixture asserting the rules fire; it renders nowhere.
 *
 * Kept deliberately tiny and named one file at a time. An ignore list is how a
 * scanner stops being trusted, so anything added here needs a reason of this
 * kind — "the rule is definitionally inapplicable" — not "this one is
 * inconvenient to fix".
 */
const IGNORE_FILES = new Set([
  'components/ui/skeleton.tsx',
  'app/[locale]/trade/pro/components/trading/__lintprobe.tsx',
]);

function* walkFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR.has(entry.name)) continue;
      yield* walkFiles(full);
    } else if (entry.isFile() && /\.tsx$/.test(entry.name)) {
      yield full;
    }
  }
}

// ---------------------------------------------------------------------------
// analysis
// ---------------------------------------------------------------------------

/**
 * Does this expression evaluate to JSX?
 *
 * The `||` / `??` cases are not pedantry — they hid the single
 * highest-leverage defect in the codebase. `LicenseGate`, which wraps TWENTY
 * route trees including their header and footer, spells its pending state:
 *
 *     if (isLoading) return loadingComponent || (<div …spinner… />)
 *
 * A rule that only recognised a bare returned element walked straight past a
 * component that blanks a fifth of the application. The "customisable fallback"
 * idiom — `prop || <default/>` — is common precisely in the shared components
 * where a swap costs the most, so it is the LAST place the check should be
 * weakest.
 *
 * A conditional (`cond ? <A/> : <B/>`) counts too: it is still a subtree being
 * returned, and the `divergent-branch` rule inspects its arms separately.
 */
function isJsxish(node) {
  if (!node) return false;
  if (
    ts.isJsxElement(node) ||
    ts.isJsxSelfClosingElement(node) ||
    ts.isJsxFragment(node)
  ) {
    return true;
  }
  if (ts.isParenthesizedExpression(node)) return isJsxish(node.expression);
  /* `fallbackProp || <Default/>` and `fallbackProp ?? <Default/>`. */
  if (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    return isJsxish(node.left) || isJsxish(node.right);
  }
  if (ts.isConditionalExpression(node)) {
    return isJsxish(node.whenTrue) || isJsxish(node.whenFalse);
  }
  return false;
}

function unwrap(node) {
  while (node && ts.isParenthesizedExpression(node)) node = node.expression;
  return node;
}

function rootTagName(node) {
  node = unwrap(node);
  if (!node) return null;
  if (ts.isJsxFragment(node)) return 'Fragment';
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  return null;
}

/**
 * Is this `return` the component's own exit, or a callback's?
 *
 * `items.map(i => { if (loading) return null; ... })` is not a page-level bail
 * out. Walking up to the nearest function and asking whether it is an arrow
 * passed as an argument separates the two, and that distinction is the reason
 * this scanner parses instead of greps.
 */
function isComponentLevel(node) {
  let fn = node.parent;
  while (fn && !ts.isFunctionDeclaration(fn) && !ts.isFunctionExpression(fn) && !ts.isArrowFunction(fn)) {
    fn = fn.parent;
  }
  if (!fn) return false;
  /*
   * Walk out through parentheses before asking whether this function is being
   * called. An IIFE is `(async () => {…})()`, so the arrow's immediate parent
   * is a ParenthesizedExpression and only its GRANDparent is the call — which
   * meant every `(async () => { … })()` inside an effect looked like a
   * component body.
   */
  let outer = fn.parent;
  while (outer && ts.isParenthesizedExpression(outer)) outer = outer.parent;
  if (outer && ts.isCallExpression(outer)) return false; // a callback or IIFE
  return true;
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function analyze(file, src) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (IGNORE_FILES.has(rel)) return [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];

  const add = (rule, node, extra = {}) => {
    const text = node.getText(sf);
    findings.push({
      file: rel,
      rule,
      line: lineOf(sf, node),
      fullViewport: FULL_VIEWPORT_RE.test(text),
      ...extra,
    });
  };

  const visit = (node) => {
    // ---- full-swap-return: `if (<loading>) return <JSX/>` -------------------
    /* A condition that NEGATES the loading flag is a resolved-state guard —
       an empty or not-found branch — not a pending swap. See
       RESOLVED_GUARD_RE. */
    if (
      ts.isIfStatement(node) &&
      LOADING_RE.test(node.expression.getText(sf)) &&
      !RESOLVED_GUARD_RE.test(node.expression.getText(sf))
    ) {
      const branch = node.thenStatement;
      const stmts = ts.isBlock(branch) ? branch.statements : [branch];
      for (const st of stmts) {
        if (ts.isReturnStatement(st) && st.expression && isJsxish(st.expression)) {
          if (!isComponentLevel(st)) break;
          const text = st.getText(sf);
          add('full-swap-return', st, { root: rootTagName(st.expression) });
          if (SPINNER_RE.test(text) && !/\bSkeleton\b/.test(text)) {
            add('spinner-fallback', st, { root: rootTagName(st.expression) });
          }
          break;
        }
      }
    }

    // ---- mount-gate: `if (!mounted) return null` ---------------------------
    /* Unlike every other rule here the interesting return is usually `null`,
       not JSX — the component withholds itself entirely — so this cannot piggy
       back on the JSX check above. A returned element counts too: whatever it
       is, it is not what the server sent. */
    if (ts.isIfStatement(node) && MOUNT_GATE_RE.test(node.expression.getText(sf))) {
      const branch = node.thenStatement;
      const stmts = ts.isBlock(branch) ? branch.statements : [branch];
      for (const st of stmts) {
        if (!ts.isReturnStatement(st)) continue;
        /*
         * An EXPLICIT `null` or JSX only. A bare `return;` is not a render
         * gate — it is the standard post-unmount cleanup guard:
         *
         *     (async () => { const d = await fetch(); if (!isMounted) return; … })()
         *
         * which exists to avoid setting state on an unmounted component and is
         * exactly right. Accepting a bare return flagged eight landing clients
         * that were doing the correct thing, on a rule whose whole purpose is
         * to be trusted about a severe defect.
         */
        const returnsNull =
          st.expression && st.expression.kind === ts.SyntaxKind.NullKeyword;
        if ((returnsNull || isJsxish(st.expression)) && isComponentLevel(st)) {
          add('mount-gate', st, {
            returns: returnsNull ? 'null' : rootTagName(st.expression),
          });
        }
        break;
      }
    }

    // ---- hidden-while-loading: `!loading && <JSX/>` -------------------------
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      isJsxish(node.right)
    ) {
      const left = node.left.getText(sf);
      // A negated loading test: `!loading`, `!isLoading && data`, `loaded &&`.
      if (/(^|\W)!\s*[A-Za-z_$][\w.$]*/.test(left) && LOADING_RE.test(left)) {
        add('hidden-while-loading', node, { gate: left.trim().slice(0, 60) });
      }
    }
    // `loading ? null : <JSX/>` is the same defect spelled differently.
    if (
      ts.isConditionalExpression(node) &&
      LOADING_RE.test(node.condition.getText(sf)) &&
      unwrap(node.whenTrue).kind === ts.SyntaxKind.NullKeyword &&
      isJsxish(node.whenFalse)
    ) {
      add('hidden-while-loading', node, { gate: node.condition.getText(sf).slice(0, 60) });
    }

    // ---- divergent-branch: `loading ? <A/> : <B/>` with different roots -----
    if (
      ts.isConditionalExpression(node) &&
      LOADING_RE.test(node.condition.getText(sf)) &&
      isJsxish(node.whenTrue) &&
      isJsxish(node.whenFalse)
    ) {
      const a = rootTagName(node.whenTrue);
      const b = rootTagName(node.whenFalse);
      if (a && b && a !== b) {
        add('divergent-branch', node, { loadingRoot: a, loadedRoot: b });
      }
      const t = node.whenTrue.getText(sf);
      if (SPINNER_RE.test(t) && !/\bSkeleton\b/.test(t)) {
        add('spinner-fallback', node, { root: a });
      }
    }

    // ---- unmeasured-skeleton: <Skeleton className="h-8 w-24"/> -------------
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sf);
      if (/^Skeleton$/.test(tag)) {
        const cls = node.attributes.properties.find(
          (p) => ts.isJsxAttribute(p) && p.name.getText(sf) === 'className'
        );
        const clsText = cls ? cls.getText(sf) : '';
        if (/\bh-\d|\bh-\[/.test(clsText)) {
          add('unmeasured-skeleton', node, { className: clsText.slice(0, 80) });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

// ---------------------------------------------------------------------------
// scoring + reporting
// ---------------------------------------------------------------------------

function score(findings) {
  return findings.reduce((sum, f) => {
    const base = RULES[f.rule]?.weight ?? 1;
    return sum + base * (f.fullViewport ? 3 : 1);
  }, 0);
}

function scan() {
  const all = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walkFiles(path.join(ROOT, dir))) {
      const src = fs.readFileSync(file, 'utf8');
      if (!LOADING_RE.test(src) && !/\bSkeleton\b/.test(src)) continue;
      try {
        all.push(...analyze(file, src));
      } catch (err) {
        process.stderr.write(`  ! parse failed: ${file}: ${err.message}\n`);
      }
    }
  }
  return all;
}

function byFile(findings) {
  const map = new Map();
  for (const f of findings) {
    if (!map.has(f.file)) map.set(f.file, []);
    map.get(f.file).push(f);
  }
  return map;
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1] ?? true;
  };
  const has = (name) => argv.includes(name);

  const ruleFilter = arg('--rule');
  let findings = scan();
  if (ruleFilter && typeof ruleFilter === 'string') {
    findings = findings.filter((f) => f.rule === ruleFilter);
  }

  const files = byFile(findings);

  const jsonOut = arg('--json');
  if (jsonOut && typeof jsonOut === 'string') {
    const payload = [...files.entries()]
      .map(([file, fs_]) => ({ file, score: score(fs_), findings: fs_ }))
      .sort((a, b) => b.score - a.score);
    fs.writeFileSync(jsonOut, JSON.stringify(payload, null, 2));
    process.stdout.write(`wrote ${payload.length} files to ${jsonOut}\n`);
  }

  // ---- report -------------------------------------------------------------
  const counts = {};
  for (const f of findings) counts[f.rule] = (counts[f.rule] || 0) + 1;

  process.stdout.write('\nSkeleton / layout-shift debt\n');
  process.stdout.write('============================\n\n');
  for (const [rule, meta] of Object.entries(RULES)) {
    const n = counts[rule] || 0;
    const vp = findings.filter((f) => f.rule === rule && f.fullViewport).length;
    process.stdout.write(
      `  ${String(n).padStart(5)}  ${rule.padEnd(22)} ${meta.label}${vp ? `  (${vp} full-viewport)` : ''}\n`
    );
  }
  process.stdout.write(`\n  ${String(files.size).padStart(5)}  files affected\n`);
  process.stdout.write(`  ${String(score(findings)).padStart(5)}  total weighted score\n\n`);

  const top = arg('--top');
  if (top) {
    const n = Number(top) || 20;
    const ranked = [...files.entries()]
      .map(([file, fs_]) => ({
        file,
        s: score(fs_),
        n: fs_.filter((f) => STRUCTURAL.has(f.rule)).length,
      }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, n);
    process.stdout.write(`Worst ${ranked.length} files\n`);
    process.stdout.write('-'.repeat(60) + '\n');
    for (const r of ranked) {
      process.stdout.write(`  ${String(r.s).padStart(4)}  ${String(r.n).padStart(3)} structural  ${r.file}\n`);
    }
    process.stdout.write('\n');
  }

  // ---- ratchet ------------------------------------------------------------
  if (has('--baseline')) {
    const baseline = {};
    for (const [file, fs_] of files) baseline[file] = score(fs_);
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
    process.stdout.write(`baseline written: ${Object.keys(baseline).length} files\n`);
    return;
  }

  if (has('--check')) {
    if (!fs.existsSync(BASELINE_FILE)) {
      process.stderr.write('no baseline; run --baseline first\n');
      process.exit(2);
    }
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    const regressions = [];
    for (const [file, fs_] of files) {
      const now = score(fs_);
      const before = baseline[file] ?? 0;
      if (now > before) regressions.push({ file, before, now });
    }
    if (regressions.length) {
      process.stderr.write('\nNEW skeleton debt:\n');
      for (const r of regressions) {
        process.stderr.write(`  ${r.file}: ${r.before} -> ${r.now}\n`);
      }
      process.stderr.write(
        '\nKeep the layout in ONE tree: render the real chrome and swap only the\n' +
          'value, with <Loadable>/<SkeletonText> from @/components/ui/skeleton.\n\n'
      );
      process.exit(1);
    }
    process.stdout.write('no new skeleton debt\n');
  }
}

main();
