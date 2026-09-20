/**
 * Key Extractor - Extracts translation keys from source code
 *
 * This module analyzes source files to find all translation key usages.
 * It recursively follows imports to find keys used in child components.
 *
 * Also validates for common i18n issues:
 * - useTranslations called outside React components (at module level)
 * - useTranslations (client hook) used in server components
 * - getTranslations/await in non-async functions
 * - Missing namespace in translation calls
 */

const fs = require("fs");
const path = require("path");

// Track all issues found during extraction
let issues = [];

function clearIssues() { issues = []; }
function getIssues() { return [...issues]; }
function addIssue(issue) { issues.push(issue); }

function getLineNumber(source, position) {
  return source.substring(0, position).split("\n").length;
}

/**
 * `source` with every comment replaced by spaces. Nothing moves.
 *
 * THE VALIDATORS BELOW ARE REGEX SCANS OVER RAW TEXT, so a comment that merely
 * NAMES the pattern it is warning about reads as an occurrence of that pattern.
 * `app/[locale]/(ext)/admin/dex/wallet/page.tsx` carries two paragraphs
 * explaining why a translator must not be lifted into a helper that takes `t`
 * as a parameter, and to say so they write `useTranslations()` — empty parens,
 * because the call SHAPE is the subject. Both were reported as
 * MISSING_NAMESPACE, which is severity `error`, which exits `pnpm build:i18n`
 * non-zero, which is the first half of `pnpm build:frontend`. The release build
 * could not run because of a comment, and the two lines it named were the only
 * two lines in the file that were not code.
 *
 * Comments are BLANKED rather than removed so every offset — and therefore
 * every line number an issue reports — still points where it did before.
 *
 * Strings, template literals (including `${...}` nesting) and regex literals
 * are tracked only so far as is needed to not mistake their contents for a
 * comment opener: `"https://..."` is the common one. Deciding regex-vs-division
 * uses the usual previous-token heuristic, which can be fooled; the cost when
 * it is, is that part of one line is blanked that should not have been, so a
 * `useTranslations()` sharing that line goes unreported. Nothing is written
 * from this — it feeds validation only, never key extraction.
 */
function blankComments(source) {
  const out = source.split("");
  const blank = (from, to) => {
    for (let i = from; i < to; i++) if (out[i] !== "\n") out[i] = " ";
  };

  /* `/` opens a regex when the last meaningful character cannot end an
     expression. After a name, a number, `)`, `]` or `}` it is division. */
  const DIVISION_AFTER = /[\w$)\]}]/;
  const REGEX_AFTER_WORD = /\b(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;

  const templates = []; // one entry per open template literal: `${` depth
  let prev = ""; // last meaningful character seen
  let prevIndex = -1;
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    /* The literal text of a template comes FIRST, before the comment checks:
       `https://host` is the reason this function exists at all, and inside the
       backticks that `//` is text. Only `${` and the closing backtick end it. */
    if (templates.length > 0 && templates[templates.length - 1] === 0) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "$" && next === "{") {
        templates[templates.length - 1] = 1;
        i += 2;
        continue;
      }
      if (ch === "`") {
        templates.pop();
        prev = "`";
        prevIndex = i;
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      blank(i, end === -1 ? source.length : end);
      i = end === -1 ? source.length : end;
      continue;
    }

    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }

    if (ch === '"' || ch === "'") {
      i++;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === "\\") i++;
        else if (source[i] === "\n") break; // unterminated; do not eat the file
        i++;
      }
      i++;
      prev = ch;
      continue;
    }

    if (ch === "`") {
      templates.push(0);
      i++;
      continue;
    }

    if (ch === "{" && templates.length > 0) templates[templates.length - 1]++;
    if (ch === "}" && templates.length > 0 && --templates[templates.length - 1] === 0) {
      i++;
      continue; // back to the literal part
    }

    if (ch === "/") {
      const word = source.slice(Math.max(0, prevIndex - 12), prevIndex + 1);
      const isRegex = !prev || !DIVISION_AFTER.test(prev) || REGEX_AFTER_WORD.test(word);
      if (isRegex) {
        i++;
        let inClass = false;
        while (i < source.length) {
          const c = source[i];
          if (c === "\\") i++;
          else if (c === "[") inClass = true;
          else if (c === "]") inClass = false;
          else if (c === "/" && !inClass) break;
          else if (c === "\n") break; // not a regex after all
          i++;
        }
        i++;
        prev = "/";
        continue;
      }
    }

    if (!/\s/.test(ch)) {
      prev = ch;
      prevIndex = i;
    }
    i++;
  }

  return out.join("");
}

function isServerComponent(source) {
  const header = source.substring(0, 500);
  return !header.includes('"use client"') && !header.includes("'use client'");
}

function isLoadingFile(filePath) {
  return filePath.endsWith("loading.tsx") || filePath.endsWith("loading.ts");
}

function isServerOnlyFile(filePath) {
  // These files are always server components in Next.js App Router
  const serverOnlyPatterns = [
    /[/\\]page\.tsx$/,
    /[/\\]layout\.tsx$/,
    /[/\\]loading\.tsx$/,
    /[/\\]error\.tsx$/,
    /[/\\]not-found\.tsx$/,
    /[/\\]template\.tsx$/,
  ];
  return serverOnlyPatterns.some(pattern => pattern.test(filePath));
}

function findClientHooksInServerComponents(source, filePath) {
  const foundIssues = [];

  // Only check server-only files (page, layout, loading, error)
  // Other component files may be imported by client components
  if (!isServerOnlyFile(filePath)) return foundIssues;
  if (!isServerComponent(source)) return foundIssues;

  const regex = /useTranslations\s*\(/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    const lineNum = getLineNumber(source, match.index);
    const isLoading = isLoadingFile(filePath);
    foundIssues.push({
      type: "CLIENT_HOOK_IN_SERVER_COMPONENT",
      file: filePath,
      line: lineNum,
      message: isLoading
        ? `useTranslations() in loading.tsx (server component). Use Skeleton components instead.`
        : `useTranslations() (client hook) in server component. Add "use client" or use getTranslations().`,
      severity: "error",
      isLoadingFile: isLoading,
    });
  }
  return foundIssues;
}

function findMissingNamespace(source, filePath) {
  const foundIssues = [];
  const emptyRegex = /useTranslations\s*\(\s*\)/g;
  let match;
  while ((match = emptyRegex.exec(source)) !== null) {
    foundIssues.push({
      type: "MISSING_NAMESPACE",
      file: filePath,
      line: getLineNumber(source, match.index),
      message: `useTranslations() called without namespace.`,
      severity: "error",
    });
  }
  return foundIssues;
}

function validateSource(source, filePath) {
  /* Both finders scan text, so they see prose as code unless the comments are
     taken out first. Blanked, not removed, so the line numbers still hold —
     see blankComments(). */
  const code = blankComments(source);
  const fileIssues = [];
  fileIssues.push(...findClientHooksInServerComponents(code, filePath));
  fileIssues.push(...findMissingNamespace(code, filePath));
  return fileIssues;
}

function validateFile(filePath) {
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    return validateSource(source, filePath);
  } catch (error) {
    return [{ type: "READ_ERROR", file: filePath, message: error.message, severity: "error" }];
  }
}

function formatIssues(issueList) {
  if (issueList.length === 0) return "No i18n issues found.";
  const lines = [];
  lines.push(`\n${"=".repeat(60)}`);
  lines.push(`  i18n VALIDATION ISSUES (${issueList.length} total)`);
  lines.push(`${"=".repeat(60)}\n`);

  const grouped = {};
  for (const issue of issueList) {
    if (!grouped[issue.file]) grouped[issue.file] = [];
    grouped[issue.file].push(issue);
  }

  for (const [file, fileIssues] of Object.entries(grouped)) {
    const relativePath = file.replace(/.*[/\\]frontend[/\\]/, "");
    lines.push(`\n  ${relativePath}`);
    for (const issue of fileIssues) {
      const icon = issue.severity === "error" ? "X" : "!";
      lines.push(`    [${icon}] Line ${issue.line}: ${issue.message}`);
    }
  }

  const errors = issueList.filter(i => i.severity === "error").length;
  const warnings = issueList.filter(i => i.severity === "warning").length;
  lines.push(`\n  Summary: ${errors} error(s), ${warnings} warning(s)\n`);
  return lines.join("\n");
}

// Regex patterns for extracting translation calls
const PATTERNS = {
  // useTranslations("namespace") -> then t("key") or t('key')
  useTranslations: /useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g,

  // getTranslations({ namespace: "xxx" })
  getTranslations: /getTranslations\s*\(\s*\{[^}]*namespace\s*:\s*["']([^"']+)["'][^}]*\}\s*\)/g,

  // getTranslationsForLocale(locale, "namespace")
  getTranslationsForLocale: /getTranslationsForLocale\s*\([^,]+,\s*["']([^"']+)["']\s*\)/g,

  // t("key") or t('key') - basic translation call
  translationCall: /\bt\s*\(\s*["']([^"']+)["'](?:\s*,|\s*\))/g,

  // t("key", { params }) - with params
  translationCallWithParams: /\bt\s*\(\s*["']([^"']+)["']\s*,\s*\{/g,

  // tNamespace("key") patterns like tCommon("key"), tDashboard("key")
  namedTranslationCall: /\bt[A-Z]\w*\s*\(\s*["']([^"']+)["'](?:\s*,|\s*\))/g,

  // Import statements
  importStatement: /import\s+(?:[\w\s{},*]+)\s+from\s+["']([^"']+)["']/g,

  // Dynamic import
  dynamicImport: /import\s*\(\s*["']([^"']+)["']\s*\)/g,
};

/**
 * Extract namespaces and their keys from a source file
 */
function extractFromSource(source, filePath = "") {
  const result = {
    namespaces: new Map(), // namespace -> Set of keys
    imports: [],           // imported files
    hasTranslations: false,
  };

  // First, find all namespace declarations
  const namespaceVars = new Map(); // variable name -> namespace

  // Find useTranslations assignments: const t = useTranslations("common")
  // Also handle: const { t } = ... patterns won't work but const t = useTranslations works
  let match;
  const useTranslationsMatches = source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g);
  for (match of useTranslationsMatches) {
    const [, varName, namespace] = match;
    namespaceVars.set(varName, namespace);
    if (!result.namespaces.has(namespace)) {
      result.namespaces.set(namespace, new Set());
    }
    result.hasTranslations = true;
  }

  // Find getTranslations assignments: const t = await getTranslations({ locale, namespace: "dashboard" })
  const getTranslationsMatches = source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+getTranslations\s*\(\s*\{[^}]*namespace\s*:\s*["']([^"']+)["'][^}]*\}\s*\)/g);
  for (match of getTranslationsMatches) {
    const [, varName, namespace] = match;
    namespaceVars.set(varName, namespace);
    if (!result.namespaces.has(namespace)) {
      result.namespaces.set(namespace, new Set());
    }
    result.hasTranslations = true;
  }

  /*
   * The STRING form of the same call: `const t = await getTranslations("menu")`.
   *
   * `getTranslations` accepts both conventions — see i18n/server.ts, which
   * branches on `typeof optionsOrNamespace === "string"` for next-intl parity —
   * but only the object form was scanned here. Twelve call sites use the string
   * form, `app/[locale]/layout.tsx` among them, and for every one of them the
   * variable never entered `namespaceVars`, so none of its `t("…")` calls were
   * collected and the route chunk shipped without them.
   */
  const getTranslationsStringMatches = source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+getTranslations\s*\(\s*["']([^"']+)["']\s*\)/g);
  for (match of getTranslationsStringMatches) {
    const [, varName, namespace] = match;
    namespaceVars.set(varName, namespace);
    if (!result.namespaces.has(namespace)) {
      result.namespaces.set(namespace, new Set());
    }
    result.hasTranslations = true;
  }

  // Find getTranslationsForLocale assignments: const t = await getTranslationsForLocale(locale, "namespace")
  const getForLocaleMatches = source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+getTranslationsForLocale\s*\([^,]+,\s*["']([^"']+)["']\s*\)/g);
  for (match of getForLocaleMatches) {
    const [, varName, namespace] = match;
    namespaceVars.set(varName, namespace);
    if (!result.namespaces.has(namespace)) {
      result.namespaces.set(namespace, new Set());
    }
    result.hasTranslations = true;
  }

  // Now find all translation key usages for each namespace variable
  for (const [varName, namespace] of namespaceVars) {
    // Match varName("key") or varName('key') - with backtick support too
    // Use matchAll to avoid lastIndex issues
    const varKeyMatches = source.matchAll(new RegExp(`\\b${varName}\\s*\\(\\s*["'\`]([^"'\`]+)["'\`]`, "g"));
    for (const keyMatch of varKeyMatches) {
      result.namespaces.get(namespace).add(keyMatch[1]);
    }

    // Match varName.has("key"), varName.raw("key"), varName.rich("key")
    const methodKeyMatches = source.matchAll(new RegExp(`\\b${varName}\\.(has|raw|rich)\\s*\\(\\s*["'\`]([^"'\`]+)["'\`]`, "g"));
    for (const methodMatch of methodKeyMatches) {
      result.namespaces.get(namespace).add(methodMatch[2]);
    }
  }

  // Extract imports for dependency tracking.
  //
  // `export ... from` must be matched too, not just `import ... from`. A pure
  // re-export barrel (index.ts full of `export { X } from "./X"`) is otherwise a
  // dead end in the dependency graph, and every key used by the modules behind it
  // is invisible to extraction. That is exactly what happened to the deposit
  // gateways: `gateways/index.ts` is all re-exports, so NONE of the
  // `pay_with_<gateway>` keys reached the generated locale chunks and every
  // gateway button rendered its raw key in production.
  const importMatches = source.matchAll(
    /(?:import|export)\s+(?:[\w\s{},*]+)\s+from\s+["']([^"']+)["']/g
  );
  for (match of importMatches) {
    const importPath = match[1];
    // Only track relative imports and @/ aliases
    if (importPath.startsWith(".") || importPath.startsWith("@/")) {
      result.imports.push(importPath);
    }
  }

  return result;
}

/**
 * Resolve import path to absolute file path
 *
 * `@/` IS ROOTED AT THE PROJECT, NOT AT THE IMPORTING FILE.
 *
 * This used to rewrite `@/components/x` into `./components/x` and then take the
 * `startsWith(".")` branch, which resolves against `path.dirname(fromFile)`. So
 * `@/components/ui/button` imported from `app/[locale]/(dashboard)/page.tsx`
 * was looked for at `app/[locale]/(dashboard)/components/ui/button` — a path
 * that does not exist — `resolveImport` returned null, and the whole subtree
 * behind that import was never crawled. Every alias import in the app is
 * spelled `@/`, so in practice extraction saw a page's own file plus whatever
 * it reached through `./`-relative siblings and nothing else. That is the same
 * class of failure already documented above the import matcher (the
 * `pay_with_<gateway>` re-export barrel): a dead end in the dependency graph
 * costs every key behind it, and the loss is invisible in dev because dev loads
 * the whole of `messages/<locale>.json`.
 *
 * Measured on this tree: 49 routes extracted ZERO keys before this fix.
 * `tsconfig.json` maps `"@/*" -> "./*"` against the frontend root, which is
 * exactly `projectRoot` here.
 */
function resolveImport(importPath, fromFile, projectRoot) {
  let resolved;
  if (importPath.startsWith("@/")) {
    resolved = path.resolve(projectRoot, importPath.slice(2));
  } else if (importPath.startsWith(".")) {
    const dir = path.dirname(fromFile);
    resolved = path.resolve(dir, importPath);
  } else {
    resolved = path.resolve(projectRoot, importPath);
  }

  // Try different extensions
  const extensions = [".tsx", ".ts", ".jsx", ".js"];

  // Try exact path first
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt)) {
      return withExt;
    }
  }

  // Try index file
  for (const ext of extensions) {
    const indexFile = path.join(resolved, `index${ext}`);
    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }

  return null;
}

/*
 * How deep the import crawl goes.
 *
 * Raised from 10. Once `@/` resolves (see resolveImport above) the graph is a
 * lot deeper than it was when 10 was chosen, because the crawl now actually
 * leaves the route folder. Measured saturation on this tree is at depth 8 — no
 * route gains a key past it — so 12 is headroom against a future page that
 * nests further, not a cost anyone pays today.
 */
const DEFAULT_MAX_DEPTH = 12;

/*
 * The crawler must not wander into the i18n runtime itself.
 *
 * The old test was `filePath.includes("/i18n/")` — a POSIX separator, against a
 * path that `path.resolve` produced. On Windows that path is
 * `C:\xampp\...\frontend\i18n\loader.ts`, the test never fires, and the crawl
 * walks into loader.ts, utils.ts and the 90 `import("@/messages/<locale>.json")`
 * lines it holds. Nothing there is a translation KEY, so the damage is wasted
 * work and a polluted `visited` set rather than wrong output — but it is wasted
 * work on every one of ~500 routes, and it is invisible on the CI box because
 * CI is Linux and Linux was the half that worked.
 */
const I18N_RUNTIME_PATH = /[/\\]i18n[/\\]/;

/**
 * Recursively extract keys from a file and its dependencies
 */
function extractFromFile(filePath, projectRoot, visited = new Set(), depth = 0, maxDepth = DEFAULT_MAX_DEPTH) {
  // Prevent infinite loops and limit depth
  if (visited.has(filePath) || depth > maxDepth) {
    return new Map();
  }
  visited.add(filePath);

  // Skip node_modules and i18n system files
  if (filePath.includes("node_modules") || I18N_RUNTIME_PATH.test(filePath)) {
    return new Map();
  }

  // Read file
  let source;
  try {
    source = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    return new Map();
  }

  // Extract from this file
  const extracted = extractFromSource(source, filePath);
  const result = new Map(extracted.namespaces);

  // Recursively extract from imports
  for (const importPath of extracted.imports) {
    const resolvedPath = resolveImport(importPath, filePath, projectRoot);
    if (resolvedPath) {
      const childKeys = extractFromFile(resolvedPath, projectRoot, visited, depth + 1, maxDepth);
      // Merge child keys
      for (const [namespace, keys] of childKeys) {
        if (!result.has(namespace)) {
          result.set(namespace, new Set());
        }
        for (const key of keys) {
          result.get(namespace).add(key);
        }
      }
    }
  }

  return result;
}

/**
 * Extract all keys used by a page and its components
 */
function extractPageKeys(pageFile, projectRoot) {
  const keys = extractFromFile(pageFile, projectRoot);

  // Convert to plain object
  const result = {};
  for (const [namespace, keySet] of keys) {
    result[namespace] = Array.from(keySet).sort();
  }

  return result;
}

/**
 * Extract the union of keys reachable from an ORDERED LIST of entry files,
 * sharing one `visited` set across all of them.
 *
 * A rendered page is never just its `page.tsx`. App Router composes it with
 * every `layout.tsx` / `template.tsx` above it — plus the `error`, `not-found`
 * and `loading` boundaries that can take its place — and those files own real
 * on-screen strings. `site-header.tsx` reaches the tree only through
 * `app/[locale]/layout.tsx`, so `open_menu`, `dashboard`, `user` and `admin`
 * appeared in NO route chunk: extraction started at the page and the header is
 * not below the page.
 *
 * The shared `visited` set is the point. Crawling each entry with its own set
 * would re-walk the entire common subtree once per ancestor (five or six times
 * for a deep route), and after the `@/` fix that subtree is most of the app.
 *
 * @param {string[]} files      Entry files, outermost ancestor first, page last.
 * @param {string}   projectRoot Frontend root — what `@/` resolves against.
 * @param {number}   [maxDepth]  Import depth per entry.
 * @returns {Record<string, string[]>} namespace -> sorted keys
 */
function extractChainKeys(files, projectRoot, maxDepth = DEFAULT_MAX_DEPTH) {
  const visited = new Set();
  const merged = new Map();

  for (const file of files) {
    if (!file) continue;
    const keys = extractFromFile(file, projectRoot, visited, 0, maxDepth);
    for (const [namespace, keySet] of keys) {
      if (!merged.has(namespace)) merged.set(namespace, new Set());
      const bucket = merged.get(namespace);
      for (const key of keySet) bucket.add(key);
    }
  }

  const result = {};
  for (const [namespace, keySet] of merged) {
    result[namespace] = Array.from(keySet).sort();
  }
  return result;
}

module.exports = {
  blankComments,
  extractFromSource,
  extractFromFile,
  extractPageKeys,
  extractChainKeys,
  DEFAULT_MAX_DEPTH,
  resolveImport,
  validateFile,
  validateSource,
  clearIssues,
  getIssues,
  addIssue,
  formatIssues,
};
