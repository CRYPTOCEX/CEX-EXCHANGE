/**
 * Update useTranslations() calls in source files - Version 2
 *
 * This script handles files that need MULTIPLE namespaces by:
 * 1. Analyzing which keys each file uses
 * 2. Mapping those keys to their namespaces
 * 3. Generating multiple useTranslations calls when needed
 * 4. Updating t() calls to use the correct translator function
 *
 * For files using multiple namespaces:
 * - Primary namespace (most keys) uses: const t = useTranslations("namespace")
 * - Secondary namespaces use: const tCommon = useTranslations("common")
 *                             const tExt = useTranslations("ext")
 *
 * Then t() calls are updated to tCommon() or tExt() based on which namespace
 * contains that key.
 *
 * Usage: node scripts/update-usetranslations-v2.js [--dry-run] [--verbose]
 */

require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const glob = require("fast-glob");

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");

// Configuration
const FRONTEND_DIR = path.join(process.cwd(), "frontend");
const MESSAGES_DIR = path.join(FRONTEND_DIR, "messages");

// Load namespace structure and build key-to-namespace map
async function loadNamespaceStructure() {
  const filePath = path.join(MESSAGES_DIR, "en.json");
  const content = await fs.readFile(filePath, "utf8");
  const messages = JSON.parse(content);

  const keyToNamespace = new Map();
  const namespaces = new Set(Object.keys(messages));

  for (const [namespace, keys] of Object.entries(messages)) {
    if (typeof keys === "object" && keys !== null) {
      for (const [key, value] of Object.entries(keys)) {
        if (typeof value === "string") {
          keyToNamespace.set(key, namespace);
        }
      }
    }
  }

  return { keyToNamespace, namespaces, messages };
}

// Generate translator variable name from namespace
function getTranslatorVarName(namespace) {
  // Convert namespace to camelCase variable name
  // common -> tCommon
  // ext_affiliate -> tExtAffiliate
  // dashboard_admin -> tDashboardAdmin
  const parts = namespace.split(/[-_]/);
  const camelCase = parts.map((p, i) =>
    i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)
  ).join("");

  return "t" + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Process a single file
async function processFile(filePath, keyToNamespace, availableNamespaces) {
  let content = await fs.readFile(filePath, "utf8");
  const originalContent = content;

  // Check if file uses translations
  if (!content.includes("useTranslations")) {
    return { updated: false, reason: "no-translations" };
  }

  // Find all t() calls and their keys
  const tCallPattern = /\bt\s*\(\s*["']([^"']+)["']/g;
  let match;
  const keysUsed = new Set();
  while ((match = tCallPattern.exec(content)) !== null) {
    keysUsed.add(match[1]);
  }

  if (keysUsed.size === 0) {
    return { updated: false, reason: "no-t-calls" };
  }

  // Map keys to namespaces
  const namespaceKeys = new Map(); // namespace -> [keys]
  const missingKeys = [];

  for (const key of keysUsed) {
    const ns = keyToNamespace.get(key);
    if (ns) {
      if (!namespaceKeys.has(ns)) {
        namespaceKeys.set(ns, []);
      }
      namespaceKeys.get(ns).push(key);
    } else {
      missingKeys.push(key);
    }
  }

  if (namespaceKeys.size === 0) {
    return { updated: false, reason: "no-valid-keys", missingKeys };
  }

  // Sort namespaces by key count (most keys = primary)
  const sortedNamespaces = Array.from(namespaceKeys.entries())
    .sort((a, b) => b[1].length - a[1].length);

  const primaryNamespace = sortedNamespaces[0][0];
  const secondaryNamespaces = sortedNamespaces.slice(1);

  // Build translator variable names
  const translatorVars = new Map();
  translatorVars.set(primaryNamespace, "t");
  for (const [ns] of secondaryNamespaces) {
    translatorVars.set(ns, getTranslatorVarName(ns));
  }

  // Find current useTranslations declaration
  const existingDeclPattern = /const\s+t\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*;?/;
  const existingMatch = existingDeclPattern.exec(content);

  if (!existingMatch) {
    return { updated: false, reason: "no-decl-found" };
  }

  const currentNamespace = existingMatch[1];

  // Check if file needs multiple namespaces
  if (namespaceKeys.size === 1) {
    // Single namespace needed
    if (currentNamespace === primaryNamespace) {
      return { updated: false, reason: "already-correct" };
    }

    // Just update the namespace in existing declaration
    content = content.replace(
      existingDeclPattern,
      `const t = useTranslations("${primaryNamespace}");`
    );
  } else {
    // Multiple namespaces needed
    // Build the new useTranslations declarations
    const declarations = [];
    declarations.push(`const t = useTranslations("${primaryNamespace}");`);
    for (const [ns] of secondaryNamespaces) {
      const varName = translatorVars.get(ns);
      declarations.push(`const ${varName} = useTranslations("${ns}");`);
    }

    // Replace the existing declaration with all new declarations
    content = content.replace(
      existingDeclPattern,
      declarations.join("\n  ")
    );

    // Now update t() calls that need different translators
    for (const [ns, keys] of secondaryNamespaces) {
      const varName = translatorVars.get(ns);
      for (const key of keys) {
        // Need to replace t("key") with tNamespace("key")
        // Use word boundary to avoid matching other function calls
        const keyPatternDouble = new RegExp(
          `\\bt\\s*\\(\\s*"${escapeRegExp(key)}"`,
          "g"
        );
        const keyPatternSingle = new RegExp(
          `\\bt\\s*\\(\\s*'${escapeRegExp(key)}'`,
          "g"
        );

        content = content.replace(keyPatternDouble, `${varName}("${key}"`);
        content = content.replace(keyPatternSingle, `${varName}('${key}'`);
      }
    }
  }

  // Check if content actually changed
  if (content === originalContent) {
    return { updated: false, reason: "no-change" };
  }

  if (!DRY_RUN) {
    await fs.writeFile(filePath, content, "utf8");
  }

  return {
    updated: true,
    needsMultiple: namespaceKeys.size > 1,
    namespaces: Array.from(namespaceKeys.keys()),
    keyCount: keysUsed.size,
    previousNamespace: currentNamespace,
    primaryNamespace,
    secondaryCount: secondaryNamespaces.length,
  };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Update useTranslations() - Multiple Namespace Support");
  console.log("═══════════════════════════════════════════════════════════════");

  if (DRY_RUN) {
    console.log("\n  🔍 DRY RUN MODE - No files will be modified\n");
  }

  try {
    // Load namespace structure
    console.log("\n📦 Loading namespace structure...\n");
    const { keyToNamespace, namespaces, messages } = await loadNamespaceStructure();
    console.log(`  Loaded ${keyToNamespace.size} keys across ${namespaces.size} namespaces`);

    // Find all source files
    console.log("\n🔍 Scanning source files...\n");
    const files = await glob([
      "frontend/app/[locale]/**/*.tsx",
      "frontend/app/[locale]/**/*.ts",
      "frontend/components/**/*.tsx",
      "frontend/components/**/*.ts",
    ], {
      ignore: [
        "**/node_modules/**",
        "frontend/app/global-error.tsx",
        "frontend/app/not-found.tsx",
        "frontend/app/page.tsx",
      ],
      cwd: process.cwd(),
    });

    console.log(`  Found ${files.length} files to process\n`);

    // Process files
    console.log("✏️  Processing files...\n");

    let updatedSingle = 0;
    let updatedMultiple = 0;
    let skipped = 0;
    let errors = 0;
    const errorFiles = [];

    for (const file of files) {
      try {
        const result = await processFile(file, keyToNamespace, namespaces);

        if (result.updated) {
          if (result.needsMultiple) {
            updatedMultiple++;
            if (VERBOSE) {
              console.log(`  ✓ [MULTI] ${file}`);
              console.log(`    ${result.previousNamespace} -> ${result.primaryNamespace} + ${result.secondaryCount} secondary`);
            }
          } else {
            updatedSingle++;
            if (VERBOSE) {
              console.log(`  ✓ [SINGLE] ${file}`);
              console.log(`    ${result.previousNamespace} -> ${result.primaryNamespace}`);
            }
          }
        } else {
          skipped++;
          if (VERBOSE && result.reason === "no-valid-keys" && result.missingKeys?.length > 0) {
            console.log(`  ⚠ ${file}: missing keys: ${result.missingKeys.join(", ")}`);
          }
        }
      } catch (err) {
        errors++;
        errorFiles.push({ file, error: err.message });
        if (VERBOSE) {
          console.log(`  ✗ ${file}: ${err.message}`);
        }
      }
    }

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  SUMMARY");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`  Updated (single namespace): ${updatedSingle}`);
    console.log(`  Updated (multiple namespaces): ${updatedMultiple}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);

    if (errors > 0 && VERBOSE) {
      console.log("\n  Error details:");
      for (const { file, error } of errorFiles.slice(0, 10)) {
        console.log(`    ${file}: ${error}`);
      }
    }

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  ✅ Complete!");
    console.log("═══════════════════════════════════════════════════════════════\n");

    if (DRY_RUN) {
      console.log("  Run without --dry-run to apply changes\n");
    }

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
