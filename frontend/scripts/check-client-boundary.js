#!/usr/bin/env node
/**
 * Client-boundary guard.
 *
 * Catches the failure mode:
 *   ⨯ Error: Attempted to call redirect() from the server but redirect is on
 *     the client. It's not possible to invoke a client function from the server.
 *
 * A module marked "use client" is compiled to a set of client *references*. When
 * a server component imports one of those exports it does NOT get the function —
 * it gets a proxy whose only job is to be serialised into the RSC payload.
 * Rendering it as JSX is fine. Calling it, or reading a property off it, throws
 * at request time, so the route answers HTTP 500 rather than doing whatever the
 * call was supposed to do. TypeScript cannot see this: the types line up
 * perfectly, and the build succeeds.
 *
 * This script flags server-graph modules that call (or property-read) a binding
 * whose origin module is "use client". It follows re-export/barrel chains and
 * tsconfig path aliases, because the import that trips this is usually laundered
 * through a barrel that has no directive of its own.
 *
 * Usage:  node scripts/check-client-boundary.js [--json]
 * Exits 1 when anything is found, so it can gate CI.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..").replace(/\\/g, "/");
const SKIP = new Set([
  "node_modules", ".next", ".git", "dist", "build", "out", "coverage", "scripts",
]);

/** Bare specifiers that tsconfig remaps into the repo. Keep in sync with tsconfig paths. */
const ALIASES = {
  "next-intl": "i18n/next-intl-compat",
  "next-intl/server": "i18n/next-intl-compat/server",
};

// ---------------------------------------------------------------- file walk
const files = [];
(function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      files.push(full.replace(/\\/g, "/"));
    }
  }
})(ROOT);

const sourceCache = new Map();
function read(file) {
  if (!sourceCache.has(file)) {
    try {
      sourceCache.set(file, fs.readFileSync(file, "utf8"));
    } catch {
      sourceCache.set(file, "");
    }
  }
  return sourceCache.get(file);
}

/** "use client" only counts as the first statement — comments may precede it. */
function isClientModule(file) {
  const head = read(file)
    .slice(0, 4000)
    .replace(/^\uFEFF/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trimStart();
  return /^["']use client["']/.test(head);
}
const clientModules = new Set(files.filter(isClientModule));

function resolveSpecifier(spec, fromFile) {
  let base;
  if (ALIASES[spec]) base = path.join(ROOT, ALIASES[spec]);
  else if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // real package — not ours to check

  base = base.replace(/\\/g, "/");
  const candidates = [
    `${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`, `${base}.mjs`,
    `${base}/index.tsx`, `${base}/index.ts`, `${base}/index.js`,
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Blank out comments and string bodies so usage scans never match prose. */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/`(?:\\[\s\S]|[^\\`])*`/g, "``")
    .replace(/"(?:\\[\s\S]|[^\\"])*"/g, '""')
    .replace(/'(?:\\[\s\S]|[^\\'])*'/g, "''");
}

/**
 * Walk re-export chains to find the module that actually defines `name`.
 * Returns the first "use client" module hit, which is the real boundary.
 */
function originOf(mod, name, seen = new Set()) {
  const key = `${mod}#${name}`;
  if (!mod || seen.has(key)) return null;
  seen.add(key);
  if (clientModules.has(mod)) return mod;

  const src = read(mod);

  const named = /export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  let match;
  while ((match = named.exec(src))) {
    for (const part of match[1].split(",")) {
      const token = part.trim().replace(/^type\s+/, "");
      if (!token) continue;
      const aliased = token.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
      const local = aliased ? aliased[1] : token;
      const exposed = aliased ? aliased[2] : token;
      if (exposed !== name) continue;
      const next = resolveSpecifier(match[2], mod);
      return next ? originOf(next, local, seen) : null;
    }
  }

  const star = /export\s*\*\s*from\s*["']([^"']+)["']/g;
  while ((match = star.exec(src))) {
    const next = resolveSpecifier(match[1], mod);
    if (!next) continue;
    const nextSrc = read(next);
    const declares =
      new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${name}\\b`).test(nextSrc) ||
      new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`).test(nextSrc);
    if (!declares) continue;
    const found = originOf(next, name, seen);
    if (found) return found;
  }

  return mod; // declared right here, in a module with no client directive
}

// ------------------------------------------------------- server module graph
function importsOf(file) {
  const out = [];
  const re =
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
  const src = read(file);
  let match;
  while ((match = re.exec(src))) {
    const resolved = resolveSpecifier(match[1] || match[2], file);
    if (resolved) out.push(resolved);
  }
  return out;
}

const serverEntries = files.filter((file) => {
  if (clientModules.has(file)) return false;
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  return (
    /^app\/.*\/(page|layout|template|default|not-found|loading|route)\.(tsx|ts|js|jsx)$/.test(rel) ||
    /^app\/(page|layout|not-found|route)\.(tsx|ts)$/.test(rel) ||
    /^(middleware|instrumentation)\.(ts|js)$/.test(rel) ||
    /^middlewares\//.test(rel) ||
    /^["']use server["']/.test(read(file).trimStart())
  );
});

// Traversal stops at every "use client" module: past that boundary the code runs
// on the client, where calling these bindings is exactly right.
const serverGraph = new Set();
const stack = [...serverEntries];
while (stack.length) {
  const file = stack.pop();
  if (serverGraph.has(file)) continue;
  serverGraph.add(file);
  for (const dep of importsOf(file)) {
    if (!clientModules.has(dep) && !serverGraph.has(dep)) stack.push(dep);
  }
}

// ------------------------------------------------------------------- scan
const IMPORT_RE = /import\s+([\s\S]*?)\s+from\s*["']([^"']+)["']/g;
const findings = [];

for (const file of serverGraph) {
  const src = read(file);
  const code = codeOnly(src);
  let match;
  IMPORT_RE.lastIndex = 0;
  while ((match = IMPORT_RE.exec(src))) {
    if (/^\s*import\s+type\s/.test(match[0])) continue; // types are erased
    const mod = resolveSpecifier(match[2], file);
    if (!mod) continue;

    const clause = match[1];
    const bindings = [];
    const braced = clause.match(/\{([\s\S]*?)\}/);
    if (braced) {
      for (const part of braced[1].split(",")) {
        const token = part.trim();
        if (!token || token.startsWith("type ")) continue;
        const aliased = token.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        bindings.push({
          local: aliased ? aliased[2] : token,
          original: aliased ? aliased[1] : token,
        });
      }
    }
    const lead = clause.replace(/\{[\s\S]*?\}/g, "").replace(/^type\s+/, "");
    for (const part of lead.split(",")) {
      const token = part.trim().replace(/^\*\s*as\s+/, "");
      if (token && /^[\w$]+$/.test(token)) bindings.push({ local: token, original: token });
    }

    for (const { local, original } of bindings) {
      const origin = clientModules.has(mod) ? mod : originOf(mod, original);
      if (!origin || !clientModules.has(origin)) continue;

      const escaped = local.replace(/\$/g, "\\$");
      const called = new RegExp(`(?<![\\w$.])${escaped}\\s*\\(`).test(code);
      const propertyRead = new RegExp(`(?<![\\w$.])${escaped}\\s*\\.\\s*[\\w$]`).test(code);
      if (!called && !propertyRead) continue; // rendered as JSX / passed as a prop — legal

      const line = src.slice(0, match.index).split("\n").length;
      findings.push({
        file: path.relative(ROOT, file).replace(/\\/g, "/"),
        line,
        binding: local,
        specifier: match[2],
        origin: path.relative(ROOT, origin).replace(/\\/g, "/"),
        kind: called ? "called" : "property-read",
      });
    }
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ findings, scanned: serverGraph.size }, null, 2));
} else if (findings.length === 0) {
  console.log(
    `✓ client boundary clean — ${serverGraph.size} server-graph modules, ` +
      `${clientModules.size} client modules`
  );
} else {
  console.error(
    `✗ ${findings.length} server-side use of a "use client" export ` +
      `(these throw at request time, not at build time):\n`
  );
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}`);
    console.error(`      ${f.kind} '${f.binding}' imported from '${f.specifier}'`);
    console.error(`      origin: ${f.origin}  ("use client")`);
  }
  console.error(
    `\n  Either move the helper into a module with no "use client" directive,\n` +
      `  or call it from a client component instead.`
  );
}

process.exit(findings.length === 0 ? 0 : 1);
