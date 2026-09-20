/**
 * The gate for the customer help corpus.
 *
 *   pnpm --filter backend knowledge:check
 *
 * Contract: `plans/AI-SUPPORT-KNOWLEDGE.md`. This script is the executable half
 * of it. Every rule here exists because breaking it produces an answer that is
 * confidently wrong rather than absent — the page retrieves, it carries a
 * citation, and it misleads.
 *
 * The two that matter most:
 *
 *   AN INVENTED ROUTE CANNOT BE LINKED. The agent never types URLs; it calls
 *   `propose_action({route})`, which re-checks the path against ROUTE_CATALOG.
 *   A path this corpus mentions but the catalog does not have is a dead end the
 *   model will keep trying to walk down.
 *
 *   AN OPERATOR-VARIABLE NUMBER IS A LIE ON MOST INSTALLS. The corpus ships to
 *   every buyer. "Withdrawals have a 1% fee" is false for all but one of them,
 *   and it defeats the refusal machinery that exists precisely to say "your
 *   operator has not published this" instead of guessing.
 */

import * as fs from "fs";
import * as path from "path";
import { ROUTE_CATALOG } from "../src/api/(ext)/ai/support/utils/routes-catalog";
import { estimateTokens } from "../src/api/(ext)/ai/support/utils/knowledge/tokenize";
import { parseFrontmatter } from "./build-knowledge-packs";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DOCS_ROOT = path.join(REPO_ROOT, "store", "content", "docs");

const CATALOG_PATHS = new Set(ROUTE_CATALOG.map((entry) => entry.path));

interface Problem {
  file: string;
  line: number;
  level: "error" | "warn";
  rule: string;
  message: string;
}

// ---------------------------------------------------------------------------
// §5.1 — operator-variable claims
// ---------------------------------------------------------------------------

/**
 * Digit shapes that are SOFTWARE facts, not operator policy, and must survive.
 *
 * A 6-digit authenticator code is 6 digits on every install ever built. Level 2
 * verification is level 2 everywhere. Stripping these first is what lets the
 * claim patterns below stay blunt enough to actually catch things.
 */
const DIGIT_ALLOWANCES: RegExp[] = [
  /\b\d+[-\s]?(digit|character|word|byte)\b/gi,
  /\blevel\s+\d+\b/gi,
  /\btwo[-\s]?factor\b/gi,
  /\b2FA\b/g,
  /\bBIP-?\d+\b/gi,
  /\bERC-?\d+\b/gi,
  /\bBEP-?\d+\b/gi,
  /\bTRC-?\d+\b/gi,
  /\bSHA-?\d+\b/gi,
  /\b\d+\s+decimal\s+places?\b/gi,
  // Ordinals in prose: "the 1st time", "step 3".
  /\bstep\s+\d+\b/gi,
  /\b\d+(st|nd|rd|th)\b/gi,
];

const CLAIM_PATTERNS: Array<{ rule: string; re: RegExp; message: string }> = [
  {
    rule: "no-percentage",
    re: /\d+(\.\d+)?\s*(%|per\s?cent)/gi,
    message:
      "a percentage is operator-set (fee, spread, rate). Say where it is shown instead.",
  },
  {
    rule: "no-currency-amount",
    re: /(?:[$€£]\s?\d|(?<![\w-])\d+(?:[.,]\d+)?\s*(?:USD|USDT|EUR|GBP|BTC|ETH|BNB|TRX|SOL)\b)/g,
    message:
      "a concrete amount is operator-set and per-currency. Say where it is shown instead.",
  },
  {
    rule: "no-duration-promise",
    re: /\b(?:within|takes?|up\s+to|usually|typically|normally|around|about|approximately)\s+\d+[-–\s]*(?:\d+\s*)?(?:second|minute|hour|day|week|month|business\s+day)s?\b/gi,
    message:
      "a processing or review time is a promise the operator has to keep. Describe the STATE, not the duration.",
  },
  {
    rule: "no-duration-promise",
    re: /\b\d+[-–]\d+\s*(?:second|minute|hour|day|week|business\s+day)s?\b/gi,
    message:
      "a processing or review time is a promise the operator has to keep. Describe the STATE, not the duration.",
  },
  {
    rule: "no-numeric-limit",
    re: /\b(?:minimum|maximum|min\.?|max\.?|limit|fee|cap|threshold)\b[^.\n]{0,30}?\d/gi,
    message:
      "a minimum, maximum, limit or fee figure is operator-set. Say where it is shown instead.",
  },
  {
    rule: "no-confirmation-count",
    re: /\b\d+\s+(?:network\s+)?confirmations?\b/gi,
    message:
      "the required confirmation count is per-chain and operator-configured. Say that the deposit completes once the network confirms it.",
  },
];

// ---------------------------------------------------------------------------
// §4.1 — headings must be questions or symptoms
// ---------------------------------------------------------------------------

/**
 * A heading passes if it ENDS in a question mark, or reads as a reported
 * symptom. Both put the customer's own words into the breadcrumb, which is
 * indexed at ×2.5 and is the strongest retrieval signal in the index.
 *
 * The symptom test is deliberately a CONTENT test rather than a list of
 * approved openers. A first cut anchored on "I"/"My" rejected "The password
 * reset email has not arrived" and "It says my email or password is incorrect"
 * — both perfect customer phrasings — which would have pushed authors toward
 * blander headings to satisfy the gate. What actually separates a symptom from
 * a filing label is that a symptom is a SENTENCE about something going wrong:
 * several words, and at least one word naming the person or the failure.
 * "Configuration", "Overview" and "Fees and limits" carry neither.
 */
const SYMPTOM_MARKERS =
  /\b(i|i'm|i've|my|me|you|your|it|says|isn't|is\s+not|wasn't|won't|will\s+not|doesn't|does\s+not|didn't|can't|cannot|couldn't|not|no|never|failed|fails|failing|missing|wrong|stuck|rejected|declined|incorrect|expired|blocked|locked|lost|late|empty|different|disappeared|charged|hasn't|haven't)\b/i;

function headingIsQuestionOrSymptom(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.endsWith("?")) return true;

  // Four words is the shortest real symptom seen in practice ("My deposit has
  // not arrived"); anything shorter is a filing label however it is worded.
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 4 && SYMPTOM_MARKERS.test(trimmed);
}

// ---------------------------------------------------------------------------

/** Body with fenced code blocks blanked, so prose rules do not scan samples. */
function stripFences(body: string): string {
  return body.replace(/^(```+|~~~+)[\s\S]*?^\1.*$/gm, (block) =>
    block.replace(/[^\n]/g, " ")
  );
}

function walkHelpPages(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".md") && /[\\/]help[\\/]/.test(full)) {
        out.push(full);
      }
    }
  };
  visit(root);
  return out.sort();
}

interface Section {
  heading: string;
  depth: number;
  line: number;
  tokens: number;
}

/**
 * Splits a page at the chunker's own split points — H2 and H3 — so the token
 * counts reported here are the ones the chunker will actually see.
 */
function sections(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const found: Section[] = [];
  let current: Section | null = null;
  let buffer: string[] = [];
  let inFence = false;

  const close = () => {
    if (current) {
      current.tokens = estimateTokens(buffer.join("\n").trim());
      found.push(current);
    }
    buffer = [];
  };

  lines.forEach((line, i) => {
    const fence = /^(```+|~~~+)/.exec(line.trim());
    if (fence) inFence = !inFence;

    const heading = !inFence && /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      close();
      current = {
        heading: heading[2].trim(),
        depth: heading[1].length,
        line: i + 1,
        tokens: 0,
      };
      return;
    }
    buffer.push(line);
  });
  close();

  return found;
}

function lineOf(body: string, index: number): number {
  return body.slice(0, index).split(/\r?\n/).length;
}

function checkPage(file: string): Problem[] {
  const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
  const problems: Problem[] = [];
  const add = (
    level: "error" | "warn",
    rule: string,
    line: number,
    message: string
  ) => problems.push({ file: rel, line, level, rule, message });

  const source = fs.readFileSync(file, "utf8");
  const { meta, body } = parseFrontmatter(source);
  const frontmatterLines = source.slice(0, source.length - body.length).split(/\r?\n/).length;

  // --- §3 frontmatter -----------------------------------------------------
  for (const key of ["title", "description"]) {
    if (!meta[key]?.trim()) add("error", "frontmatter", 1, `missing \`${key}\``);
  }
  if (meta.section !== "Help") {
    add("error", "frontmatter", 1, `\`section\` must be exactly "Help" (found ${JSON.stringify(meta.section ?? null)})`);
  }
  if (meta.audience !== "CUSTOMER") {
    add("error", "frontmatter", 1, `\`audience\` must be exactly "CUSTOMER" (found ${JSON.stringify(meta.audience ?? null)})`);
  }

  const prose = stripFences(body);

  // --- §6 routes ----------------------------------------------------------
  for (const match of prose.matchAll(/`(\/[^`\s]*)`/g)) {
    const route = match[1].replace(/[.,;:)]+$/, "");
    const line = frontmatterLines + lineOf(body, match.index ?? 0) - 1;

    if (route.startsWith("/admin")) {
      add("error", "no-admin-path", line, `\`${route}\` — customers have no admin panel`);
      continue;
    }
    if (CATALOG_PATHS.has(route)) continue;

    // A deep link under a catalog route (`/finance/wallet/USDT`) is still a
    // page the agent cannot propose — resolveAction matches the path exactly.
    const parent = [...CATALOG_PATHS].find((p) => route.startsWith(`${p}/`));
    add(
      "error",
      "unknown-route",
      line,
      parent
        ? `\`${route}\` is not in ROUTE_CATALOG — the agent can only link \`${parent}\` exactly`
        : `\`${route}\` is not in ROUTE_CATALOG, so the agent cannot link it`
    );
  }

  // Bare admin mentions outside backticks are just as bad.
  for (const match of prose.matchAll(/(?<!`)\/admin\/[\w/\[\]-]+/g)) {
    add(
      "error",
      "no-admin-path",
      frontmatterLines + lineOf(body, match.index ?? 0) - 1,
      `${match[0]} — customers have no admin panel`
    );
  }

  // --- §5.1 operator-variable claims --------------------------------------
  let scannable = prose;
  for (const allowance of DIGIT_ALLOWANCES) {
    scannable = scannable.replace(allowance, (m) => m.replace(/\d/g, "#"));
  }
  for (const { rule, re, message } of CLAIM_PATTERNS) {
    for (const match of scannable.matchAll(re)) {
      add(
        "error",
        rule,
        frontmatterLines + lineOf(body, match.index ?? 0) - 1,
        `"${match[0].trim()}" — ${message}`
      );
    }
  }

  // --- §4 headings and chunk sizes ----------------------------------------
  const list = sections(body);
  if (!list.length) add("error", "no-sections", 1, "page has no `##` sections");

  for (const section of list) {
    const line = frontmatterLines + section.line - 1;

    if (section.depth === 2 && !headingIsQuestionOrSymptom(section.heading)) {
      add(
        "error",
        "heading-shape",
        line,
        `"${section.heading}" — an H2 must be the customer's question ("How do I …?") or their symptom ("I lost my phone …"). The breadcrumb is indexed at 2.5x.`
      );
    }

    if (section.tokens > 700) {
      add(
        "error",
        "section-too-long",
        line,
        `~${section.tokens} tokens — the chunker splits at 700, so this answer will be cut in half. Split it into two questions.`
      );
    } else if (section.tokens < 120) {
      add(
        "warn",
        "section-too-short",
        line,
        `~${section.tokens} tokens — the chunker merges anything under 120 into its neighbour, so this heading stops matching its own content.`
      );
    }
  }

  // --- §8 leaked directives -----------------------------------------------
  const opens = (prose.match(/^:::\w/gm) || []).length;
  const closes = (prose.match(/^:::\s*$/gm) || []).length;
  if (opens !== closes) {
    add(
      "error",
      "unbalanced-directive",
      1,
      `${opens} \`:::\` opened, ${closes} closed — an unclosed directive ships as literal text on the page`
    );
  }

  return problems;
}

function main(): void {
  // An explicit root lets the falsification fixture run against a scratch tree
  // instead of the live corpus.
  const files = walkHelpPages(process.argv[2] || DOCS_ROOT);

  if (!files.length) {
    console.log("No help pages found under store/content/docs/**/help/.");
    return;
  }

  const problems: Problem[] = [];
  let totalSections = 0;
  let totalTokens = 0;

  for (const file of files) {
    problems.push(...checkPage(file));
    const { body } = parseFrontmatter(fs.readFileSync(file, "utf8"));
    const list = sections(body);
    totalSections += list.filter((s) => s.depth === 2).length;
    totalTokens += list.reduce((sum, s) => sum + s.tokens, 0);
  }

  const byFile = new Map<string, Problem[]>();
  for (const problem of problems) {
    if (!byFile.has(problem.file)) byFile.set(problem.file, []);
    byFile.get(problem.file)!.push(problem);
  }

  for (const [file, list] of [...byFile].sort()) {
    console.log(`\n${file}`);
    for (const p of list.sort((a, b) => a.line - b.line)) {
      const tag = p.level === "error" ? "ERROR" : "warn ";
      console.log(`  ${tag} ${String(p.line).padStart(4)}  ${p.rule.padEnd(22)} ${p.message}`);
    }
  }

  /*
   * ---- coverage ----------------------------------------------------------
   *
   * Per-page rules cannot see a page that was never written. A route the agent
   * may link but no page mentions is a destination it will never offer, and the
   * gap appears silently every time a route is added to the catalog after the
   * pages were authored — which is exactly how nine of them ended up unnamed.
   *
   * Reported, not failed: a genuinely new route legitimately has no page yet,
   * and a gate that blocks the commit adding it would just get bypassed.
   */
  const corpus = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const unnamed = ROUTE_CATALOG.filter(
    (entry) => !corpus.includes("`" + entry.path + "`")
  );

  if (unnamed.length) {
    console.log(
      `\ncoverage: ${CATALOG_PATHS.size - unnamed.length}/${CATALOG_PATHS.size} catalog routes named in a help page`
    );
    for (const entry of unnamed) {
      console.log(`  unnamed  ${entry.path.padEnd(28)} ${entry.title}`);
    }
  } else {
    console.log(`\ncoverage: all ${CATALOG_PATHS.size} catalog routes are named in a help page`);
  }

  /*
   * ---- does the route EXIST? ----------------------------------------------
   *
   * THE CATALOG IS ITS OWN SOURCE OF TRUTH, AND THAT IS THE HOLE.
   *
   * `resolveAction` validates a route the model proposes by looking it up in
   * ROUTE_CATALOG. So a catalog entry is valid BY DEFINITION, and a wrong one
   * cannot be caught anywhere downstream — the pre-flight passes, the button
   * renders, and the customer lands on an error page.
   *
   * It shipped: `/support/ticket` was the catalog entry for the ticket list, and
   * `frontend/app/[locale]/support/ticket/` holds `[id]/` and `components/` and
   * no `page.tsx`. The real list is `/support`. That made the single most common
   * answer this assistant gives — "open a support ticket" — resolve to a 404,
   * and because the corpus is written against the catalog it propagated: 229
   * occurrences across 81 help pages, every one of them a dead link.
   *
   * Fetching the URL cannot test this either. An extension-disabled page does
   * not 404, it renders empty, so "the page responded" proves nothing. The
   * router's own file tree is the only authority, and it is right here.
   *
   * A route group segment — `(dashboard)`, `(ext)`, `(blog)` — is not part of
   * the URL, so it is stripped before comparing. Dynamic segments are left
   * alone: the catalog deliberately holds no `[id]` paths, so a catalog entry
   * that needs one is itself the error.
   *
   * This one FAILS the build rather than reporting, because unlike a missing
   * help page it is never a legitimate intermediate state.
   */
  const APP_DIR = path.join(REPO_ROOT, "frontend", "app", "[locale]");
  const realRoutes = new Set<string>();
  if (fs.existsSync(APP_DIR)) {
    const walkRoutes = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkRoutes(full);
        } else if (entry.name === "page.tsx") {
          const url = path
            .relative(APP_DIR, dir)
            .split(path.sep)
            .filter((segment) => segment && !/^\(.*\)$/.test(segment))
            .join("/");
          realRoutes.add("/" + url);
        }
      }
    };
    walkRoutes(APP_DIR);
  }

  const phantom = realRoutes.size
    ? ROUTE_CATALOG.filter((entry) => !realRoutes.has(entry.path))
    : [];

  if (phantom.length) {
    console.log(
      `\nROUTES THAT DO NOT EXIST: ${phantom.length} catalog path(s) have no page.tsx`
    );
    for (const entry of phantom) {
      console.log(`  MISSING  ${entry.path.padEnd(28)} ${entry.title}`);
    }
    console.log(
      "  Every one of these is a link the agent can offer and the router will 404."
    );
  } else if (realRoutes.size) {
    console.log(
      `routes:   all ${CATALOG_PATHS.size} catalog paths resolve to a real page`
    );
  }

  const errors = problems.filter((p) => p.level === "error").length + phantom.length;
  const warns = problems.length - errors;

  console.log(
    `\n${files.length} help page${files.length === 1 ? "" : "s"}, ` +
      `${totalSections} customer questions, ` +
      `~${totalTokens.toLocaleString()} tokens (~${Math.round(totalTokens / 700)} chunks)`
  );
  console.log(`${errors} errors, ${warns} warnings`);

  if (errors) process.exit(1);
}

if (require.main === module) main();

export { checkPage, walkHelpPages, headingIsQuestionOrSymptom, CLAIM_PATTERNS };
