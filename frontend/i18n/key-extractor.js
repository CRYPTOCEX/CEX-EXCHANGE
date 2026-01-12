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
  const fileIssues = [];
  fileIssues.push(...findClientHooksInServerComponents(source, filePath));
  fileIssues.push(...findMissingNamespace(source, filePath));
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
  const useTranslationsMatches = source.matchAll(/const\s+(\w+)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g);
  for (match of useTranslationsMatches) {
    const [, varName, namespace] = match;
    namespaceVars.set(varName, namespace);
    if (!result.namespaces.has(namespace)) {
      result.namespaces.set(namespace, new Set());
    }
    result.hasTranslations = true;
  }

  // Find getTranslations assignments: const t = await getTranslations({ locale, namespace: "dashboard" })
  const getTranslationsMatches = source.matchAll(/const\s+(\w+)\s*=\s*await\s+getTranslations\s*\(\s*\{[^}]*namespace\s*:\s*["']([^"']+)["'][^}]*\}\s*\)/g);
  for (match of getTranslationsMatches) {
    const [, varName, namespace] = match;
    namespaceVars.set(varName, namespace);
    if (!result.namespaces.has(namespace)) {
      result.namespaces.set(namespace, new Set());
    }
    result.hasTranslations = true;
  }

  // Find getTranslationsForLocale assignments: const t = await getTranslationsForLocale(locale, "namespace")
  const getForLocaleMatches = source.matchAll(/const\s+(\w+)\s*=\s*await\s+getTranslationsForLocale\s*\([^,]+,\s*["']([^"']+)["']\s*\)/g);
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

  // Extract imports for dependency tracking
  const importMatches = source.matchAll(/import\s+(?:[\w\s{},*]+)\s+from\s+["']([^"']+)["']/g);
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
 */
function resolveImport(importPath, fromFile, projectRoot) {
  // Handle @/ alias
  if (importPath.startsWith("@/")) {
    importPath = importPath.replace("@/", "./");
  }

  // Resolve relative path
  let resolved;
  if (importPath.startsWith(".")) {
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

/**
 * Recursively extract keys from a file and its dependencies
 */
function extractFromFile(filePath, projectRoot, visited = new Set(), depth = 0, maxDepth = 10) {
  // Prevent infinite loops and limit depth
  if (visited.has(filePath) || depth > maxDepth) {
    return new Map();
  }
  visited.add(filePath);

  // Skip node_modules and i18n system files
  if (filePath.includes("node_modules") || filePath.includes("/i18n/")) {
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

module.exports = {
  extractFromSource,
  extractFromFile,
  extractPageKeys,
  resolveImport,
  validateFile,
  validateSource,
  clearIssues,
  getIssues,
  addIssue,
  formatIssues,
};
