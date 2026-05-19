#!/usr/bin/env node

/**
 * Migration Script: next-intl to Custom i18n System
 *
 * This script helps migrate from next-intl to the custom translation system.
 * It transforms imports and provides guidance for manual updates.
 *
 * Usage:
 *   node lib/i18n/scripts/migrate-from-next-intl.js [--dry-run] [--path <path>]
 *
 * Options:
 *   --dry-run    Show what would be changed without making modifications
 *   --path       Specify a directory or file to migrate (default: app, components)
 */

const fs = require("fs");
const path = require("path");

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const pathIndex = args.indexOf("--path");
const customPath = pathIndex !== -1 ? args[pathIndex + 1] : null;

// Track statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  importsReplaced: 0,
  errors: [],
  warnings: [],
};

/**
 * Import replacement rules
 */
const importReplacements = [
  // useTranslations from next-intl
  {
    from: /import\s*{\s*useTranslations\s*}\s*from\s*["']next-intl["']/g,
    to: 'import { useTranslations } from "@/lib/i18n"',
    description: "useTranslations hook",
  },
  // getTranslations from next-intl/server
  {
    from: /import\s*{\s*getTranslations\s*}\s*from\s*["']next-intl\/server["']/g,
    to: 'import { getTranslations } from "@/lib/i18n/server"',
    description: "getTranslations server function",
  },
  // Link, useRouter, usePathname, redirect from @/i18n/routing
  {
    from: /import\s*{([^}]*)}\s*from\s*["']@\/i18n\/routing["']/g,
    to: 'import {$1} from "@/lib/i18n/routing"',
    description: "routing utilities",
  },
  // useLocale from next-intl
  {
    from: /import\s*{\s*useLocale\s*}\s*from\s*["']next-intl["']/g,
    to: 'import { useLocale } from "@/lib/i18n/routing"',
    description: "useLocale hook",
  },
  // Combined imports from next-intl
  {
    from: /import\s*{\s*useTranslations,\s*useLocale\s*}\s*from\s*["']next-intl["']/g,
    to: 'import { useTranslations } from "@/lib/i18n";\nimport { useLocale } from "@/lib/i18n/routing"',
    description: "combined useTranslations and useLocale",
  },
  // NextIntlClientProvider
  {
    from: /import\s*{\s*NextIntlClientProvider\s*}\s*from\s*["']next-intl["']/g,
    to: 'import { TranslationProvider } from "@/lib/i18n"',
    description: "NextIntlClientProvider to TranslationProvider",
  },
  // hasLocale from next-intl
  {
    from: /import\s*{\s*hasLocale\s*}\s*from\s*["']next-intl["']/g,
    to: 'import { isValidLocale } from "@/lib/i18n/server-routing"',
    description: "hasLocale validator",
  },
  // getRequestConfig from next-intl/server
  {
    from: /import\s*{\s*getRequestConfig\s*}\s*from\s*["']next-intl\/server["']/g,
    to: "// MANUAL: getRequestConfig is no longer needed with custom i18n",
    description: "getRequestConfig (needs manual removal)",
  },
  // defineRouting from next-intl/routing
  {
    from: /import\s*{\s*defineRouting\s*}\s*from\s*["']next-intl\/routing["']/g,
    to: "// MANUAL: defineRouting is no longer needed - use config from @/lib/i18n/config",
    description: "defineRouting (needs manual removal)",
  },
  // createNavigation from next-intl/navigation
  {
    from: /import\s*{\s*createNavigation\s*}\s*from\s*["']next-intl\/navigation["']/g,
    to: "// MANUAL: createNavigation is no longer needed - use routing from @/lib/i18n/routing",
    description: "createNavigation (needs manual removal)",
  },
  // createMiddleware from next-intl/middleware
  {
    from: /import\s+createMiddleware\s+from\s*["']next-intl\/middleware["']/g,
    to: 'import { createI18nMiddleware } from "@/lib/i18n/middleware"',
    description: "createMiddleware",
  },
];

/**
 * Code pattern replacements
 */
const codeReplacements = [
  // NextIntlClientProvider to TranslationProvider
  {
    from: /<NextIntlClientProvider([^>]*)>/g,
    to: "<TranslationProvider$1>",
    description: "NextIntlClientProvider JSX opening tag",
  },
  {
    from: /<\/NextIntlClientProvider>/g,
    to: "</TranslationProvider>",
    description: "NextIntlClientProvider JSX closing tag",
  },
  // routing.locales to config.locales (when applicable)
  {
    from: /routing\.locales/g,
    to: "config.locales",
    description: "routing.locales access",
    manual: true,
  },
  // routing.defaultLocale to config.defaultLocale
  {
    from: /routing\.defaultLocale/g,
    to: "config.defaultLocale",
    description: "routing.defaultLocale access",
    manual: true,
  },
];

/**
 * Get all TypeScript/JavaScript files in a directory
 */
function getFilesRecursively(dir, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (item === "node_modules" || item === ".next" || item === "lib") {
        continue;
      }
      files.push(...getFilesRecursively(fullPath, extensions));
    } else if (extensions.some((ext) => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;

  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    stats.errors.push(`Failed to read ${filePath}: ${error.message}`);
    return;
  }

  let modified = false;
  let newContent = content;

  // Apply import replacements
  for (const rule of importReplacements) {
    if (rule.from.test(newContent)) {
      newContent = newContent.replace(rule.from, rule.to);
      modified = true;
      stats.importsReplaced++;
      console.log(`  ✓ ${rule.description}`);
    }
    // Reset regex lastIndex
    rule.from.lastIndex = 0;
  }

  // Apply code replacements
  for (const rule of codeReplacements) {
    if (rule.from.test(newContent)) {
      if (rule.manual) {
        stats.warnings.push(`${filePath}: ${rule.description} - needs manual review`);
      } else {
        newContent = newContent.replace(rule.from, rule.to);
        modified = true;
        console.log(`  ✓ ${rule.description}`);
      }
    }
    // Reset regex lastIndex
    rule.from.lastIndex = 0;
  }

  if (modified) {
    stats.filesModified++;

    if (dryRun) {
      console.log(`\n[DRY RUN] Would modify: ${filePath}`);
    } else {
      try {
        fs.writeFileSync(filePath, newContent, "utf-8");
        console.log(`\n✓ Modified: ${filePath}`);
      } catch (error) {
        stats.errors.push(`Failed to write ${filePath}: ${error.message}`);
      }
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log("=".repeat(60));
  console.log("next-intl to Custom i18n Migration Script");
  console.log("=".repeat(60));
  console.log();

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No files will be modified\n");
  }

  // Determine paths to scan
  const basePath = path.resolve(process.cwd());
  const paths = customPath
    ? [path.resolve(basePath, customPath)]
    : [
        path.join(basePath, "app"),
        path.join(basePath, "components"),
        path.join(basePath, "hooks"),
        path.join(basePath, "provider"),
        path.join(basePath, "i18n"),
        path.join(basePath, "middlewares"),
      ];

  console.log("Scanning directories:", paths.join(", "));
  console.log();

  // Get all files
  const allFiles = [];
  for (const p of paths) {
    allFiles.push(...getFilesRecursively(p));
  }

  console.log(`Found ${allFiles.length} files to scan\n`);

  // Process each file
  for (const file of allFiles) {
    processFile(file);
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Files scanned:  ${stats.filesScanned}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Imports replaced: ${stats.importsReplaced}`);

  if (stats.warnings.length > 0) {
    console.log("\n⚠️  WARNINGS (manual review needed):");
    for (const warning of stats.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  if (stats.errors.length > 0) {
    console.log("\n❌ ERRORS:");
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log("\n📝 MANUAL STEPS REQUIRED:");
  console.log("  1. Update next.config.js to remove withNextIntl wrapper");
  console.log("  2. Update middlewares/i18n.ts to use createI18nMiddleware");
  console.log("  3. Update app/[locale]/layout.tsx to use TranslationProvider");
  console.log("  4. Remove i18n/request.ts (no longer needed)");
  console.log("  5. Run: pnpm remove next-intl");
  console.log("  6. Test the application thoroughly");
  console.log();
}

main();
