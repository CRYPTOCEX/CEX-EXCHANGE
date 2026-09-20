/**
 * Turn "136 local variant functions" into a list of REAL disagreements.
 *
 * `components/blocks/data-table/content/rows/cells/badge.tsx` checks
 * `config.variant` BEFORE falling back to `statusTone()`, so any local
 * `variant: (value) => ...` in a columns.tsx overrides the shared table.
 *
 * But most of those functions are legitimate: plenty map CATEGORICAL enums
 * (DEPOSIT/WITHDRAW/SPOT/FIAT/BINARY_ORDER) that are not statuses at all and
 * that `status-tone.ts` has no opinion about. Flagging those would be exactly
 * the "cries wolf" failure that gets a rule switched off.
 *
 * So: extract each function's literal KEY -> variant mapping, keep only keys the
 * shared table actually knows, and report where the two disagree.
 */
const fs = require("fs");
const path = require("path");

const ROOT = require("path").resolve(__dirname, "..");

// Parse STATUS_TONE + ALIASES straight out of the source of truth.
const toneSrc = fs.readFileSync(path.join(ROOT, "lib/status-tone.ts"), "utf8");
const table = {};
{
  const body = toneSrc.slice(
    toneSrc.indexOf("export const STATUS_TONE"),
    /* ALIASES is declared `const`, NOT exported — searching for
       "export const ALIASES" never matched, so this slice ran to end-of-file and
       swallowed DOMAIN_STATUS_TONE. Its `support: { OPEN: "info" }` then
       overwrote the real `OPEN: "success"`, and every OPEN line the audit
       printed showed the wrong expected tone. BadgeCell calls statusTone(value)
       with NO domain, so the table value is the one that matters here. */
    toneSrc.indexOf("const ALIASES") > 0
      ? toneSrc.indexOf("const ALIASES")
      : toneSrc.length
  );
  for (const m of body.matchAll(/^\s*([A-Z0-9_]+)\s*:\s*"([a-z-]+)"/gm)) table[m[1]] = m[2];
}
const aliases = {};
{
  const i = toneSrc.indexOf("ALIASES");
  if (i > 0) {
    const body = toneSrc.slice(i, toneSrc.indexOf("function normalise"));
    for (const m of body.matchAll(/^\s*([A-Z0-9_]+)\s*:\s*"([A-Z0-9_]+)"/gm)) aliases[m[1]] = m[2];
  }
}
const toneOf = (k) => table[k] ?? table[aliases[k]] ?? null;

/* Badge `variant` names -> the tone they render as. From
   cells/badge.tsx TONE_TO_VARIANT plus the Badge primitive's own variants. */
const VARIANT_TONE = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
  danger: "destructive",
  info: "info",
  primary: "primary",
  secondary: "secondary",
  muted: "neutral",
  outline: "neutral",
  default: "primary",
};

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (["node_modules", ".next", "dist", "build"].includes(e.name)) continue;
      walk(path.join(dir, e.name));
    } else if (e.name === "columns.tsx") files.push(path.join(dir, e.name));
  }
})(path.join(ROOT, "app"));

const disagreements = [];
const homonyms = [];
const unknownKeys = new Map();
let fnCount = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/variant:\s*\(([^)]*)\)\s*=>\s*\{?([\s\S]{0,1400}?)(?:\n\s{4}\}|\n\s{6}\},)/g)) {
    fnCount++;
    const body = m[2];
    const line = src.slice(0, m.index).split("\n").length;
    // Literal mappings: `KEY: "variant"` or `=== "KEY" ? "variant"` or `case "KEY": return "variant"`
    const pairs = [];
    /* The leading [{,] is load-bearing. Without it this same pattern matches a
       TERNARY colon: in `value === "BUY" ? "success" : "destructive"` it read
       `SUCCESS -> destructive`, which is nonsense, and produced roughly forty
       phantom disagreements in the first run. An object entry is preceded by
       `{` or `,`; a ternary's else-branch is not. */
    for (const p of body.matchAll(/[{,]\s*["'`]([A-Za-z0-9_]+)["'`]\s*:\s*["'`]([a-z]+)["'`]/g)) pairs.push([p[1], p[2]]);
    for (const p of body.matchAll(/[{,]\s*([A-Z0-9_]{2,})\s*:\s*["'`]([a-z]+)["'`]/g)) pairs.push([p[1], p[2]]);
    for (const p of body.matchAll(/===\s*["'`]([A-Za-z0-9_]+)["'`]\s*\?\s*["'`]([a-z]+)["'`]/g)) pairs.push([p[1], p[2]]);
    for (const p of body.matchAll(/case\s+["'`]([A-Za-z0-9_]+)["'`]\s*:\s*return\s+["'`]([a-z]+)["'`]/g)) pairs.push([p[1], p[2]]);

    /* ------------------------------------------------------------------------
       IS THIS A STATUS MAPPER AT ALL? Decide once, for the whole function.

       Dropping keys the table does not know was not enough on its own, because
       the leftovers include HOMONYMS — a key that is a status somewhere else and
       a category here:

         admin/crm/support/columns.tsx   LIVE  -> info
           `LIVE` vs `TICKET`: the CHANNEL a conversation arrived through. The
           shared table's `LIVE: "success"` means a live/open thing, which is a
           different word that happens to be spelled the same.

         admin/forex-trading/deal/columns.tsx   OPEN -> primary
           `dealKindTone` maps a deal KIND — DEPOSIT, WITHDRAW, ADJUSTMENT,
           NBP_CORRECTION, WITHDRAW_REVERSAL, OPEN. `OPEN` here is "opening a
           position", not "this record is open".

       Those two were the audit's ENTIRE output, so 100% of what it reported was
       wrong, and wiring it into `design:check` unchanged would have failed the
       build on two correct files — the fastest possible way to have the whole
       lane switched off again.

       A genuine status mapper speaks status vocabulary throughout. A categorical
       mapper brushes against it once by accident. So: judge a function only when
       at least TWO of its keys are known to the table AND they are at least half
       of its keys. Both counts matter — the first alone would still judge a
       two-key channel column, the second alone would still judge a large enum
       that happens to contain two homonyms.
       ------------------------------------------------------------------------ */
    const known = pairs.filter(([k]) => toneOf(k.toUpperCase().replace(/[\s-]+/g, "_")));
    const isStatusMapper = known.length >= 2 && known.length * 2 >= pairs.length;

    for (const [rawKey, variant] of pairs) {
      const key = rawKey.toUpperCase().replace(/[\s-]+/g, "_");
      const want = toneOf(key);
      if (!want) {
        unknownKeys.set(key, (unknownKeys.get(key) || 0) + 1);
        continue; // categorical enum the table has no opinion on — not a defect
      }
      if (!isStatusMapper) {
        homonyms.push({ rel, line, key, variant, keys: pairs.length, known: known.length });
        continue;
      }
      const got = VARIANT_TONE[variant];
      if (!got) continue;
      if (got !== want) disagreements.push({ rel, line, key, got, want, variant });
    }
  }
}

console.log(`columns.tsx files: ${files.length}   variant functions parsed: ${fnCount}`);
console.log(`table keys: ${Object.keys(table).length}   aliases: ${Object.keys(aliases).length}`);
console.log(`\n===== DISAGREEMENTS WITH lib/status-tone.ts: ${disagreements.length} =====`);
const byFile = new Map();
for (const d of disagreements) {
  if (!byFile.has(d.rel)) byFile.set(d.rel, []);
  byFile.get(d.rel).push(d);
}
for (const [rel, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${rel}  (${list.length})`);
  for (const d of list) console.log(`   ${String(d.key).padEnd(22)} local=${d.variant.padEnd(12)} -> ${d.got.padEnd(12)} table=${d.want}`);
}
console.log(`\nfiles with at least one disagreement: ${byFile.size}`);
/* Printed, never gating. These are the calls the homonym guard chose not to
   judge, and they are exactly where a future false negative would hide — if a
   real status column ever lands here, this list is the only place it shows. */
console.log(`\nhomonyms skipped (a key the table knows, in a mapper that is not about status): ${homonyms.length}`);
for (const h of homonyms) {
  console.log(`   ${h.rel}:${h.line}  ${h.key} -> ${h.variant}   (only ${h.known} of ${h.keys} keys are status vocabulary)`);
}
const topUnknown = [...unknownKeys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(`\nkeys the table has NO entry for (categorical or genuinely missing), top 12:`);
console.log("  " + topUnknown.map(([k, n]) => `${k}(${n})`).join(", "));

if (disagreements.length > 0 && process.argv.includes("--check")) process.exit(1);
