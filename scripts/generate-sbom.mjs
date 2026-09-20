#!/usr/bin/env node
/**
 * Software Bill of Materials, in CycloneDX 1.5.
 *
 *   node scripts/generate-sbom.mjs            # write sbom/*.json
 *   node scripts/generate-sbom.mjs --check    # verify they are current (gate step)
 *   node scripts/generate-sbom.mjs --stdout   # print the core SBOM, write nothing
 *
 * ---------------------------------------------------------------------------
 * WHY
 * ---------------------------------------------------------------------------
 * Annex I Part II(1) of the Cyber Resilience Act requires the manufacturer to
 * "identify and document the components contained in products with digital
 * elements, including by drawing up a software bill of materials in a commonly
 * used machine-readable format covering at the very least the top-level
 * dependencies of the products". That obligation starts 11 December 2027 and the
 * SBOM has to be kept for the whole support period of each product.
 *
 * Our customers will ask sooner than the regulator does. They run financial
 * services; their own DORA and NIS2 auditors will start asking them for their
 * suppliers' SBOMs, and being the vendor who can hand one over is worth more
 * than the hour this took to write.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS HAND-ROLLED
 * ---------------------------------------------------------------------------
 * `@cyclonedx/cyclonedx-npm` would do this, and adding it would mean a new
 * build-time dependency in a tree that is already carrying 41 held major
 * upgrades — plus a tool whose output changes between its own versions, which
 * makes `--check` flap for reasons that have nothing to do with our software.
 *
 * This reads `package.json` and nothing else. No network, no lockfile parsing,
 * no install required. It is deterministic, so `--check` is a real gate rather
 * than a coin toss.
 *
 * TOP-LEVEL ONLY, and that is a deliberate reading of the regulation rather
 * than laziness: "at the very least the top-level dependencies" is the floor,
 * a full transitive graph across four ecosystems is thousands of components
 * that nobody reads, and the moment we publish one we own keeping it accurate.
 * Revisit if a customer's auditor asks for transitive — the structure here
 * supports it, the policy is what would change.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "sbom");

const CHECK = process.argv.includes("--check");
const STDOUT = process.argv.includes("--stdout");

/**
 * What we ship, and where each one's manifest lives.
 *
 * `name` must match the product name used in the Declaration of Conformity and
 * in `store/lib/docs/products.ts`. Three different identifiers for one product
 * is already a known trap in this codebase; a fourth in the compliance record
 * would be worse, because that one is quoted to a regulator.
 */
const TARGETS = [
  { key: "core", name: "Bicrypto", manifest: "package.json" },
  { key: "backend", name: "Bicrypto Backend", manifest: "backend/package.json" },
  { key: "frontend", name: "Bicrypto Frontend", manifest: "frontend/package.json" },
  { key: "mobile", name: "Bicrypto Mobile", manifest: "mobile/pubspec.yaml", kind: "pub" },
];

// ---------------------------------------------------------------- readers

function readJson(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Top-level dependencies from a package.json.
 *
 * devDependencies are EXCLUDED. They are not components of the product placed
 * on the market — they are what we used to build it. Including them would
 * misstate what an operator is actually running, which is the one thing this
 * document is for.
 */
function npmComponents(pkg) {
  const out = [];
  for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
    out.push({
      type: "library",
      name,
      version: String(range).replace(/^[\^~>=<\s]+/, "") || "unknown",
      purl: `pkg:npm/${encodeURIComponent(name).replace("%40", "@")}@${String(range).replace(/^[\^~>=<\s]+/, "")}`,
      scope: "required",
      properties: [{ name: "declaredRange", value: String(range) }],
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Flutter dependencies out of pubspec.yaml.
 *
 * A four-line parser rather than a YAML dependency: we need one flat block of
 * `name: constraint` pairs under `dependencies:`, and pulling in a YAML library
 * to read it would defeat the point of a script with no dependencies. Nested
 * entries (`sdk: flutter`, git refs) are recorded by name with the version
 * marked unknown rather than skipped — a component we cannot pin is still a
 * component, and silently dropping it is how an SBOM becomes a lie.
 */
function pubComponents(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inDeps = false;

  for (const line of lines) {
    if (/^dependencies:\s*$/.test(line)) {
      inDeps = true;
      continue;
    }
    // Any other top-level key ends the block.
    if (inDeps && /^[a-zA-Z_]/.test(line)) break;
    if (!inDeps) continue;

    const m = /^\s{2}([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!m) continue;

    const name = m[1];
    const raw = m[2].trim();
    // `sdk: flutter` and git/path refs have no version on this line.
    const version = /^["']?[\^~>=<]?[\d.]/.test(raw)
      ? raw.replace(/^["'~^>=<\s]+|["']$/g, "")
      : "unknown";

    out.push({
      type: "library",
      name,
      version,
      purl: `pkg:pub/${name}@${version}`,
      scope: "required",
      ...(raw ? { properties: [{ name: "declaredRange", value: raw }] } : {}),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- document

/**
 * A CycloneDX document.
 *
 * NOTE the absent `timestamp`. CycloneDX puts one in `metadata` and it is the
 * obvious thing to write — but a timestamp makes every regeneration a diff, so
 * `--check` would fail on any run that is not the same second as the last
 * commit, and the gate step would be useless. The commit date is the timestamp;
 * git already keeps it, accurately, for free.
 */
function document(target, version, components) {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    // Deterministic from the content, so re-running without a change is a no-op.
    serialNumber: `urn:uuid:${stableUuid(`${target.key}:${version}`)}`,
    version: 1,
    metadata: {
      component: {
        type: "application",
        name: target.name,
        version,
        purl: `pkg:generic/${target.key}@${version}`,
        supplier: { name: "MashDiv" },
      },
      supplier: { name: "MashDiv" },
      properties: [
        {
          name: "cdx:scope",
          value:
            "Top-level dependencies only, per CRA Annex I Part II(1). " +
            "Build-time devDependencies are excluded — they are not components " +
            "of the product placed on the market.",
        },
      ],
    },
    components,
  };
}

/** UUIDv5-shaped, derived from the key so the serial is stable across runs. */
function stableUuid(seed) {
  const h = crypto.createHash("sha1").update(seed).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
    h.slice(20, 32),
  ].join("-");
}

// ---------------------------------------------------------------- drift

/**
 * What actually changed, in words.
 *
 * The failure used to read "a dependency changed without the SBOM" whatever the
 * cause, and that sentence is wrong more often than it is right. A release bumps
 * `version` in three manifests and no dependency moves at all — but the message
 * sends you into package.json and the lockfile hunting a change nobody made.
 * Naming the real delta turns that hunt into one read.
 *
 * The line-endings case is here for the same reason. `core.autocrlf` rewrote the
 * worktree copies on every checkout, so the bytes differed while the document was
 * the same object. `.gitattributes` now pins `sbom/*.json` to LF, which should end
 * it — this stays as the diagnosis for a clone made before that landed, where the
 * fix is still `pnpm sbom` but there is nothing to commit afterwards.
 */
function describeDrift(onDisk, expected) {
  let before;
  try {
    before = JSON.parse(onDisk);
  } catch {
    return ["the file on disk is not readable JSON — regenerate it"];
  }
  const after = JSON.parse(expected);

  if (JSON.stringify(before) === JSON.stringify(after)) {
    return ["same content, different line endings — regenerate, then commit nothing"];
  }

  const notes = [];

  const wasVersion = before.metadata?.component?.version;
  const nowVersion = after.metadata?.component?.version;
  if (wasVersion !== nowVersion) notes.push(`product version ${wasVersion} -> ${nowVersion}`);

  const was = new Map((before.components ?? []).map((c) => [c.name, c.version]));
  const now = new Map((after.components ?? []).map((c) => [c.name, c.version]));
  for (const [name, version] of now) {
    if (!was.has(name)) notes.push(`added ${name}@${version}`);
    else if (was.get(name) !== version) notes.push(`${name} ${was.get(name)} -> ${version}`);
  }
  for (const name of was.keys()) if (!now.has(name)) notes.push(`removed ${name}`);

  // A wholesale dependency sweep should not bury the shell in output.
  if (notes.length > 8) return [...notes.slice(0, 8), `...and ${notes.length - 8} more`];
  return notes.length ? notes : ["the document differs"];
}

// ---------------------------------------------------------------- main

function build() {
  const rootPkg = readJson("package.json");
  const docs = [];
  const skipped = [];

  for (const target of TARGETS) {
    const file = path.join(ROOT, target.manifest);
    if (!fs.existsSync(file)) {
      console.error(`  skip ${target.key}: ${target.manifest} not found`);
      skipped.push(target);
      continue;
    }

    let components;
    let version;

    if (target.kind === "pub") {
      const text = fs.readFileSync(file, "utf8");
      components = pubComponents(text);
      version = /^version:\s*(.+)$/m.exec(text)?.[1].trim() ?? rootPkg.version;
    } else {
      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      components = npmComponents(pkg);
      version = pkg.version ?? rootPkg.version;
    }

    docs.push({
      target,
      version,
      json: JSON.stringify(document(target, version, components), null, 2) + "\n",
      count: components.length,
    });
  }

  return { docs, skipped };
}

function main() {
  const { docs, skipped } = build();

  if (STDOUT) {
    const core = docs.find((d) => d.target.key === "core") ?? docs[0];
    process.stdout.write(core.json);
    return;
  }

  if (CHECK) {
    const stale = [];
    for (const d of docs) {
      const out = path.join(OUT_DIR, `${d.target.key}.cdx.json`);
      if (!fs.existsSync(out)) {
        stale.push({ key: d.target.key, notes: ["the file is missing"] });
        continue;
      }
      const onDisk = fs.readFileSync(out, "utf8");
      if (onDisk !== d.json) {
        stale.push({ key: d.target.key, notes: describeDrift(onDisk, d.json) });
      }
    }

    if (stale.length) {
      console.error("\n  SBOM out of date — sbom/ no longer matches the manifests.\n");
      for (const s of stale) {
        console.error(`    sbom/${s.key}.cdx.json`);
        for (const n of s.notes) console.error(`      ${n}`);
      }
      console.error("\n  Run: pnpm sbom\n");
      process.exit(1);
    }

    /*
     * SKIPPED IS NOT PASSED.
     *
     * `--check` can only compare the targets it was able to BUILD. A target
     * whose manifest is absent is skipped, and its committed document is then
     * never looked at — `.gitignore` excludes `/mobile`, so on most clones
     * `sbom/mobile.cdx.json` was verified by nothing while this line still
     * said "SBOM current". It could drift indefinitely and the only tell was
     * the document count.
     *
     * A skip is reported, with the reason, and the count says how many of how
     * many. It does not fail: a clone without `mobile/` is legitimate, and the
     * operator simply must not be told the file was checked.
     */
    const unverified = skipped.filter((t) =>
      fs.existsSync(path.join(OUT_DIR, `${t.key}.cdx.json`)),
    );

    if (unverified.length) {
      console.log(
        `  SBOM current — ${docs.length} of ${docs.length + unverified.length} documents verified.`,
      );
      for (const t of unverified) {
        console.log(
          `    SKIPPED sbom/${t.key}.cdx.json — ${t.manifest} is absent here, so this` +
            ` document was NOT compared and may have drifted.`,
        );
      }
      return;
    }

    console.log(`  SBOM current — ${docs.length} documents.`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const d of docs) {
    fs.writeFileSync(path.join(OUT_DIR, `${d.target.key}.cdx.json`), d.json);
    console.log(
      `  ${String(d.count).padStart(4)} components  sbom/${d.target.key}.cdx.json  (${d.target.name} ${d.version})`,
    );
  }
}

main();
