/**
 * The gate for vendor disclosure.
 *
 *   pnpm --filter backend check:vendor
 *
 * WHY THIS EXISTS AS ITS OWN SWEEP.
 *
 * The platform is white-labelled. The operator sells it under their own name,
 * and their customer has no relationship with — and no reason to ever hear of —
 * the company that wrote the software or the company that runs the model. Five
 * separate audit findings turned out to be the same missing sweep, each caught
 * by a different lens purely by accident:
 *
 *   - a help page that said "Bicrypto" where it meant "the platform";
 *   - a citation URL pointing at the vendor's docs host;
 *   - a built knowledge pack whose CUSTOMER chunks carried the product name
 *     into retrieval, where the model reads it as the platform's own name;
 *   - a system prompt that permitted repeating those URLs back;
 *   - a `claude-*` model id recorded on a turn and printed in the Live Inbox.
 *
 * No single existing check could see all five, because they live in three
 * different artefacts: markdown source, a compiled binary artefact, and code.
 * This script scans all three.
 *
 * WHAT IS AND IS NOT A DISCLOSURE.
 *
 * A vendor string is only a defect where it can REACH somebody. Three carve-outs
 * are therefore built in, and each is explicit rather than heuristic:
 *
 *   THE PRODUCT DIRECTORY NAME IS NOT PROSE. The corpus lives at
 *   `store/content/docs/bicrypto/…`; that path is filing, not content. A page
 *   under it may say "the platform" but must not say "Bicrypto", and a link
 *   target of `/docs/bicrypto/help/x` is a route, not a sentence.
 *
 *   FRONTMATTER `tags:` ARE NOT PROSE. They are retrieval keywords, never
 *   rendered and never shown to a reader.
 *
 *   THE OPERATOR'S OWN CONFIGURATION IS NOT A DISCLOSURE. An operator running
 *   their own Anthropic key chose that model and pays the bill; hiding it from
 *   them would be withholding their own settings. That is why the provider
 *   surface is an explicit FILE allowlist, printed on every run, rather than a
 *   pattern that tries to guess intent. Adding a file to that list is a review
 *   decision someone has to make on purpose.
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
// An explicit root lets the falsification fixture run the docs lens against a
// scratch tree instead of the live corpus.
const DOCS_ROOT =
  process.argv[2] && !process.argv[2].startsWith("-")
    ? path.resolve(process.argv[2])
    : path.join(REPO_ROOT, "store", "content", "docs");
const PACK_DIR = path.join(REPO_ROOT, "backend", "knowledge");
const SUPPORT_DIR = path.join(
  REPO_ROOT,
  "backend",
  "src",
  "api",
  "(ext)",
  "ai",
  "support"
);

// ---------------------------------------------------------------------------
// The vendor vocabulary
// ---------------------------------------------------------------------------

/**
 * Deliberately substring matches, not `\b`-anchored words. `claude-sonnet-5`,
 * `gpt-4o-mini` and `openai_compatible` all have to be findable, and a word
 * boundary fails on every one of them (`_` and the digits are word characters).
 * The cost of that bluntness is paid by the exemption lists below, which are
 * whole-literal and enumerated, so nothing is waved through by accident.
 */
const VENDOR_TERMS = [
  { term: "mashdiv", what: "the software vendor" },
  { term: "bicrypto", what: "the vendor's product name" },
  { term: "claude", what: "the model vendor's product" },
  { term: "anthropic", what: "the model vendor" },
  { term: "openai", what: "a model vendor" },
  { term: "gpt-", what: "a model family" },
];

const VENDOR_RE = new RegExp(
  VENDOR_TERMS.map((v) => v.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "gi"
);

/** Every distinct vendor term in a piece of text, deduped, in order. */
function vendorHits(text) {
  const found = [];
  for (const match of String(text ?? "").matchAll(VENDOR_RE)) {
    const hit = match[0];
    if (!found.some((f) => f.toLowerCase() === hit.toLowerCase())) found.push(hit);
  }
  return found;
}

/**
 * Vendor terms with the one distinction that changes what a fix looks like:
 * whether the term sits in prose or inside a markdown link target.
 *
 * Both are reported. A pack body is handed to the model VERBATIM, so
 * `../bicrypto/operate/troubleshooting.md` is text it can read and echo — but a
 * link is repointed, while a sentence is rewritten, and whoever picks this up
 * should not have to open the file to find out which.
 */
function vendorHitsWithPlacement(text) {
  const value = String(text ?? "");
  const targets = [];
  for (const link of value.matchAll(/\]\(([^)]*)\)/g)) {
    const start = (link.index ?? 0) + link[0].indexOf("(") + 1;
    targets.push([start, start + link[1].length]);
  }

  const found = [];
  for (const match of value.matchAll(VENDOR_RE)) {
    const at = match.index ?? 0;
    const inLink = targets.some(([from, to]) => at >= from && at < to);
    const key = `${match[0].toLowerCase()}|${inLink}`;
    if (found.some((f) => f.key === key)) continue;
    found.push({ key, term: match[0], inLink });
  }
  return found;
}

// ---------------------------------------------------------------------------
// §3 — the code allowlist. Printed on every run.
// ---------------------------------------------------------------------------

/**
 * Files under `ai/support/` where a vendor id is the point of the file.
 *
 * Keyed by repo-relative POSIX path so a typo is a miss, not a wildcard. The
 * reason is printed next to the path: a list nobody can read is a list nobody
 * will ever prune.
 */
const CODE_ALLOWLIST = new Map([
  [
    "backend/src/api/(ext)/ai/support/utils/knowledge/ingest.ts",
    "builds the doc-pack citationUrl; `toCustomerCitations` is what stops it reaching a customer",
  ],
  [
    "backend/src/api/(ext)/ai/support/utils/knowledge/question-report.ts",
    "the gateway HOST it posts fingerprints to — an HTTP target, never rendered",
  ],
  [
    "backend/src/api/(ext)/ai/support/utils/knowledge/remote-docs.ts",
    "the gateway HOST it fetches shared documentation from — an HTTP target, never rendered",
  ],
  /*
   * `utils/settings.ts` USED TO BE ON THIS LIST, and its exemption was wrong.
   *
   * The rationale read "default model ids for a SELF-MANAGED provider, where the
   * operator brought the key and chose the model" — which describes one provider
   * out of three and is not the default one. `DEFAULT_SETTINGS` applies to EVERY
   * install, the settings screen renders the value, so an operator running
   * MashDiv AI opened Settings and read `claude-sonnet-5`.
   *
   * The defaults are now tiers, so the file needs no exemption and does not get
   * one. Leaving it allowlisted would mean the next vendor id added to it is
   * invisible to this gate for the same bad reason.
   */
  [
    "backend/src/api/(ext)/ai/support/utils/providers/pricing.ts",
    "the price table IS the model list; `displayModel` is the mask that reads from it",
  ],
  [
    "backend/src/api/(ext)/ai/support/utils/providers/anthropic.ts",
    "the direct-API adapter; the operator brought this key and chose this model",
  ],
  [
    "backend/src/api/(ext)/ai/support/utils/providers/mashdiv.ts",
    "the gateway adapter; `toTier` lives here precisely to stop vendor ids crossing the wire",
  ],
  [
    "backend/src/api/(ext)/ai/support/utils/providers/openai-compatible.ts",
    "names the wire format it speaks, which is the vendor's format",
  ],
  [
    "backend/src/api/(ext)/ai/support/utils/providers/registry.ts",
    "the provider picker's own labels — an operator cannot choose a provider they cannot see named",
  ],
  [
    "backend/src/api/(ext)/ai/support/utils/providers/types.ts",
    "the `ProviderId` union",
  ],
]);

/**
 * Whole-literal exemptions that apply everywhere else in the tree.
 *
 * A literal is exempt only if it matches ENTIRELY. `"anthropic"` as a stored
 * settings value is a database enum nobody reads; `"the anthropic key"` is a
 * sentence, and no entry here can ever match it.
 */
const LITERAL_EXEMPTIONS = [
  {
    re: /^(anthropic|openai_compatible|mashdiv|null)$/,
    why: "ProviderId / settings enum value — stored, never rendered",
  },
  {
    re: /^x-mashdiv-[a-z-]+$/i,
    why: "gateway HMAC header name — wire protocol, machine to machine",
  },
  {
    re: /^(bicrypto|mailwizard-bicrypto)$/,
    why: "knowledge-pack directory slug — filing, not prose",
  },
  {
    re: /^mashdiv-docs$/,
    why: "internal sourceId used for retrieval ranking",
  },
  {
    /*
     * The TIER IDS, and this exemption is the point of the whole vocabulary
     * rather than a hole in it.
     *
     * The rule this gate enforces has two halves. A customer must never learn
     * which software their operator runs or who sells it — that is why almost
     * everything here is forbidden. The OPERATOR, by contrast, knowingly bought
     * MashDiv AI, and the product they bought is sold in tiers whose display
     * names are "MashDiv AI Lite/Core/Max". Hiding the name of the thing on
     * their own invoice would not be white-labelling, it would be a bug.
     *
     * What must never reach them is the other direction: `claude-*`, Anthropic,
     * Opus, Sonnet, Haiku. Which model serves a tier is a routing decision on
     * the gateway, and an install that names one is asserting knowledge it does
     * not have and pinning a choice that goes stale the moment routing changes.
     *
     * These ids are also never rendered raw — `pricing.ts` carries the display
     * name — so this covers the enum value, not the label.
     */
    re: /^mashdiv-(lite|core|max)$/,
    why: "MashDiv AI tier id — the operator's own purchase, and the mask that keeps vendor model ids off their screen",
  },
];

function exemptLiteral(value) {
  const trimmed = value.trim();
  return LITERAL_EXEMPTIONS.find((e) => e.re.test(trimmed)) || null;
}

// ---------------------------------------------------------------------------

/** @type {{file:string,line:number,scope:string,term:string,message:string}[]} */
const problems = [];

function report(file, line, scope, term, message) {
  problems.push({ file, line, scope, term, message });
}

const rel = (file) => path.relative(REPO_ROOT, file).replace(/\\/g, "/");

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

// ---------------------------------------------------------------------------
// §1 — the docs corpus
// ---------------------------------------------------------------------------

/** Splits `---` frontmatter off the top. Returns raw text for both halves. */
function splitFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { head: "", body: source, offset: 0 };
  return {
    head: match[1],
    body: source.slice(match[0].length),
    offset: match[0].split(/\r?\n/).length - 1,
  };
}

/** `key: value` at column 0. Enough for the fields this gate cares about. */
function frontmatterValue(head, key) {
  const match = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(head);
  return match ? match[1].trim() : "";
}

/**
 * Blanks `tags:` — inline (`tags: [a, b]`) or block (`tags:\n  - a`) — while
 * preserving line count, so every reported line number still points at the
 * line the author would open.
 */
function stripTags(head) {
  const lines = head.split(/\r?\n/);
  let inBlock = false;
  return lines
    .map((line) => {
      if (/^tags:/.test(line)) {
        inBlock = !/^tags:\s*\[/.test(line) && !/^tags:\s*\S/.test(line);
        return "";
      }
      if (inBlock) {
        if (/^\s*-\s/.test(line)) return "";
        inBlock = false;
      }
      return line;
    })
    .join("\n");
}

/**
 * Blanks the TARGET of a docs cross-reference, `](/docs/product/section/page)`.
 *
 * Only `/docs/…` targets. An external link is left intact on purpose: a
 * citation URL pointing at the vendor's own host is one of the five findings
 * this gate was written for, and blanking every target would hide it.
 */
function stripDocsLinkTargets(body) {
  return body.replace(/\]\((\/docs\/[^)]*)\)/g, (whole, target) =>
    "](" + " ".repeat(target.length) + ")"
  );
}

function walkMarkdown(root) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".md")) out.push(full);
    }
  };
  visit(root);
  return out.sort();
}

function scanDocs() {
  const files = walkMarkdown(DOCS_ROOT);
  const scanned = [];

  for (const file of files) {
    const posix = rel(file);
    const source = fs.readFileSync(file, "utf8");
    const { head, body } = splitFrontmatter(source);

    const isHelp = /\/help\//.test(posix);
    const isCustomer = frontmatterValue(head, "audience") === "CUSTOMER";
    if (!isHelp && !isCustomer) continue;
    scanned.push(posix);

    // Rebuild the page with the non-prose regions blanked, so offsets — and
    // therefore line numbers — survive intact.
    const prose =
      "---\n" + stripTags(head) + "\n---\n" + stripDocsLinkTargets(body);

    for (const match of prose.matchAll(VENDOR_RE)) {
      const line = lineOf(prose, match.index ?? 0);
      const context = prose
        .split(/\r?\n/)[line - 1].trim()
        .replace(/\s+/g, " ")
        .slice(0, 96);
      report(
        posix,
        line,
        "docs",
        match[0],
        `"${match[0]}" in ${isHelp ? "a help page" : "an audience: CUSTOMER page"} — say "the platform". ${context}`
      );
    }
  }

  return scanned;
}

// ---------------------------------------------------------------------------
// §2 — the built knowledge packs
// ---------------------------------------------------------------------------

/**
 * The packs are the artefact that actually ships and actually retrieves. A page
 * fixed in `store/` but not rebuilt here is still answering customers with the
 * old text, which is why this is a separate scope rather than a derived one.
 *
 * Audience is carried on the page. `text`/`title`/`breadcrumb` are the chunk
 * field names; the pack lines are pages, so `body` and `trail` are read under
 * both names — the chunker copies one to the other verbatim.
 */
function scanPacks() {
  if (!fs.existsSync(PACK_DIR)) return null;
  const packs = fs
    .readdirSync(PACK_DIR)
    .filter((name) => name.endsWith(".ndjson.gz"))
    .sort();
  if (!packs.length) return null;

  let customerChunks = 0;

  for (const name of packs) {
    const full = path.join(PACK_DIR, name);
    const posix = rel(full);
    const productSlug = name.replace(/\.ndjson\.gz$/, "");

    let text;
    try {
      text = zlib.gunzipSync(fs.readFileSync(full)).toString("utf8");
    } catch (error) {
      report(posix, 1, "packs", "-", `pack could not be read: ${error.message}`);
      continue;
    }

    const lines = text.split(/\r?\n/);
    lines.forEach((raw, index) => {
      if (!raw.trim()) return;
      let entry;
      try {
        entry = JSON.parse(raw);
      } catch {
        report(posix, index + 1, "packs", "-", "line is not valid JSON");
        return;
      }
      if ((entry.audience || "CUSTOMER") !== "CUSTOMER") return;
      customerChunks++;

      const breadcrumb = entry.breadcrumb ?? entry.trail ?? [];
      // The product slug segment is the pack's own filing, exactly as the
      // directory name is in the docs tree. Any OTHER segment is prose the
      // retriever indexes at 2.5x and the model reads as the platform's name.
      const crumbs = (Array.isArray(breadcrumb) ? breadcrumb : [breadcrumb])
        .filter((segment) => String(segment) !== productSlug)
        .join(" > ");

      const fields = [
        ["title", entry.title ?? ""],
        ["breadcrumb", crumbs],
        ["text", entry.text ?? entry.body ?? ""],
      ];

      for (const [field, value] of fields) {
        for (const { term, inLink } of vendorHitsWithPlacement(value)) {
          report(
            posix,
            index + 1,
            "packs",
            term,
            `"${term}" in the ${field}${inLink ? " (link target)" : ""} of CUSTOMER chunk ` +
              `\`${entry.slug || entry.id || "?"}\` — this is what retrieval feeds the model`
          );
        }
      }
    });
  }

  return { packs: packs.length, customerChunks };
}

// ---------------------------------------------------------------------------
// §3 — string literals in the agent's own code
// ---------------------------------------------------------------------------

/**
 * Yields every string literal in a TS source with its line number, skipping
 * comments — a comment is returned to nobody — and regex literals, which
 * otherwise swallow the scanner whole the first time one contains a quote.
 *
 * Template literals yield their static spans only; `${…}` is code, and whatever
 * it evaluates to is caught wherever it is defined.
 */
function stringLiterals(source) {
  const out = [];
  let line = 1;
  let i = 0;
  // The last significant character decides whether `/` opens a regex or divides.
  let lastSignificant = "";

  const push = (value, startLine) => out.push({ value, line: startLine });

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === "\n") {
      line++;
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }

    if (ch === "/" && /^[=(,:[!&|?{};+\-*%~^<>]$/.test(lastSignificant)) {
      // Regex literal. Consume it, respecting escapes and character classes.
      i++;
      let inClass = false;
      while (i < source.length) {
        const c = source[i];
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) {
          i++;
          break;
        } else if (c === "\n") {
          // An unterminated regex means the guess was wrong; bail out rather
          // than eat the rest of the file.
          break;
        }
        i++;
      }
      lastSignificant = "/";
      continue;
    }

    if (ch === "'" || ch === '"') {
      const startLine = line;
      const quote = ch;
      let value = "";
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") {
          value += source[i + 1] ?? "";
          i += 2;
          continue;
        }
        if (source[i] === "\n") line++;
        value += source[i];
        i++;
      }
      i++;
      push(value, startLine);
      lastSignificant = quote;
      continue;
    }

    if (ch === "`") {
      let startLine = line;
      let value = "";
      i++;
      while (i < source.length && source[i] !== "`") {
        if (source[i] === "\\") {
          value += source[i + 1] ?? "";
          i += 2;
          continue;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          // Flush the static span, then skip the expression with brace depth.
          push(value, startLine);
          value = "";
          i += 2;
          let depth = 1;
          while (i < source.length && depth > 0) {
            if (source[i] === "{") depth++;
            else if (source[i] === "}") depth--;
            else if (source[i] === "\n") line++;
            i++;
          }
          startLine = line;
          continue;
        }
        if (source[i] === "\n") line++;
        value += source[i];
        i++;
      }
      i++;
      push(value, startLine);
      lastSignificant = "`";
      continue;
    }

    if (!/\s/.test(ch)) lastSignificant = ch;
    i++;
  }

  return out;
}

function walkSources(root) {
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(full);
    }
  };
  visit(root);
  return out.sort();
}

function scanCode() {
  if (!fs.existsSync(SUPPORT_DIR)) return { files: 0, skipped: 0 };
  const files = walkSources(SUPPORT_DIR);
  let skipped = 0;

  for (const file of files) {
    const posix = rel(file);
    if (CODE_ALLOWLIST.has(posix)) {
      skipped++;
      continue;
    }

    const source = fs.readFileSync(file, "utf8");
    for (const literal of stringLiterals(source)) {
      const hits = vendorHits(literal.value);
      if (!hits.length) continue;
      if (exemptLiteral(literal.value)) continue;

      const shown =
        literal.value.length > 88
          ? literal.value.slice(0, 88).replace(/\s+/g, " ") + "…"
          : literal.value.replace(/\s+/g, " ");
      report(
        posix,
        literal.line,
        "code",
        hits[0],
        `"${hits.join('", "')}" in a string literal: "${shown}"`
      );
    }
  }

  // A stale allowlist is a hole nobody can see, so the entries are verified to
  // exist. A renamed adapter must not silently keep its exemption.
  for (const entry of CODE_ALLOWLIST.keys()) {
    if (!fs.existsSync(path.join(REPO_ROOT, entry))) {
      report(
        entry,
        1,
        "code",
        "-",
        "allowlisted file does not exist — the exemption is stale and covers nothing"
      );
    }
  }

  return { files: files.length, skipped };
}

// ---------------------------------------------------------------------------

function main() {
  console.log("vendor terms:  " + VENDOR_TERMS.map((v) => v.term).join(", "));

  console.log("\ncode allowlist (files where a vendor id is the point):");
  for (const [file, why] of CODE_ALLOWLIST) console.log(`  ${file}\n      ${why}`);

  console.log("\nliteral exemptions (whole-literal match only):");
  for (const { re, why } of LITERAL_EXEMPTIONS) {
    console.log(`  ${String(re).padEnd(38)} ${why}`);
  }

  const scannedDocs = scanDocs();
  const packStats = scanPacks();
  const codeStats = scanCode();

  const byFile = new Map();
  for (const problem of problems) {
    if (!byFile.has(problem.file)) byFile.set(problem.file, []);
    byFile.get(problem.file).push(problem);
  }

  for (const [file, list] of [...byFile].sort()) {
    console.log(`\n${file}`);
    for (const p of list.sort((a, b) => a.line - b.line)) {
      console.log(`  ${String(p.line).padStart(5)}  ${p.scope.padEnd(6)} ${p.message}`);
    }
  }

  console.log(
    `\ndocs:     ${scannedDocs.length} customer-facing page${scannedDocs.length === 1 ? "" : "s"} scanned`
  );
  if (packStats === null) {
    console.log(
      "packs:    none built — run `pnpm --filter backend knowledge:build` to include them. NOT a failure."
    );
  } else {
    console.log(
      `packs:    ${packStats.packs} pack${packStats.packs === 1 ? "" : "s"}, ${packStats.customerChunks} CUSTOMER chunks scanned`
    );
  }
  console.log(
    `code:     ${codeStats.files - codeStats.skipped} file${codeStats.files - codeStats.skipped === 1 ? "" : "s"} scanned, ${codeStats.skipped} allowlisted`
  );

  const byScope = new Map();
  for (const p of problems) byScope.set(p.scope, (byScope.get(p.scope) || 0) + 1);

  if (!problems.length) {
    console.log("\n0 vendor strings can reach a customer or an operator.");
    return;
  }

  console.log(
    `\n${problems.length} VENDOR STRING${problems.length === 1 ? "" : "S"} REACHABLE BY A CUSTOMER OR OPERATOR ` +
      `(${[...byScope].map(([s, n]) => `${s}: ${n}`).join(", ")})`
  );
  console.log(
    "The platform is white-labelled. Every one of these is the vendor's name arriving\n" +
      "somewhere the operator never agreed to put it."
  );
  process.exit(1);
}

// An explicit entry guard, so the falsification fixture can import the scanner
// and feed it sources this tree does not contain.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

export { stringLiterals, vendorHits, exemptLiteral, CODE_ALLOWLIST, VENDOR_TERMS };
