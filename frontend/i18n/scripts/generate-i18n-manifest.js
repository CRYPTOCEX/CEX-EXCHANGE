#!/usr/bin/env node
/**
 * Generate i18n Manifest
 *
 * This script analyzes all pages in the app directory and generates:
 * 1. A manifest of which translation keys each route needs
 * 2. Per-page translation JSON files (without menu keys)
 * 3. Separate menu translation JSON files (shared across pages)
 *
 * Menu files are generated separately to avoid duplication across pages.
 * Each page references which menu it uses in the manifest.
 *
 * Run with: node frontend/i18n/scripts/generate-i18n-manifest.js
 */

const fs = require("fs");
const path = require("path");
const { extractPageKeys, validateFile, clearIssues, getIssues, formatIssues } = require("../key-extractor");

const projectRoot = path.resolve(__dirname, "../..");
const appDir = path.join(projectRoot, "app", "[locale]");
const messagesDir = path.join(projectRoot, "messages");
const outputDir = path.join(projectRoot, "public", "i18n");

// Paths that don't need header/sidebar/menu (from dashboard.provider.tsx)
const EXCLUDED_PATHS = [
  "/admin/crm/kyc/level/create",
  "/admin/crm/kyc/level/[id]",
  "/admin/crm/kyc/application/[id]",
  "/admin/crm/support/[id]",
  "/admin/finance/deposit/log/[id]",
  "/admin/finance/withdraw/log/[id]",
  "/admin/finance/transfer/[id]",
  "/admin/default-editor",
  "/admin/default-editor/[pageId]/edit",
  "/admin/content/media",
  "/admin/system/notification/template/[id]",
  "/admin/system/settings",
  "/admin/system/license",
  "/admin/system/extension",
  "/admin/system/extension/[id]",
  "/admin/system/update",
  "/admin/builder",
];

// Extension directories that have their own menus
const EXTENSION_DIRS = [
  "affiliate",
  "ai/investment",
  "ai/market-maker",
  "copy-trading",
  "ecommerce",
  "ecosystem",
  "faq",
  "forex",
  "futures",
  "gateway",
  "ico",
  "mailwizard",
  "nft",
  "p2p",
  "staking",
];

// Menu types and their identifiers
const MENU_TYPES = {
  admin: "menu-admin",
  user: "menu-user",
};

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Find all page.tsx files recursively
 */
function findPageFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findPageFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name === "page.tsx" || entry.name === "page.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract route from file path
 */
function fileToRoute(filePath) {
  let route = filePath
    .replace(appDir, "")
    .replace(/\\/g, "/")
    .replace(/\/(page)\.(tsx?|js)$/, "");

  // Handle route groups
  route = route.replace(/\/\([^)]+\)/g, "");

  return route || "/";
}

/**
 * Check if a route matches a pattern (supports [param] wildcards)
 */
function matchPath(pattern, pathname) {
  const regexPattern = "^" + pattern.replace(/\[(\w+)\]/g, "[^/]+") + "(/.*)?$";
  const regex = new RegExp(regexPattern);
  return regex.test(pathname);
}

/**
 * Determine the page type and which menu it needs
 */
function getPageType(route, filePath) {
  // Check if excluded (no menu needed)
  for (const pattern of EXCLUDED_PATHS) {
    if (matchPath(pattern, route)) {
      return { type: "excluded", menuFile: null, menuId: null };
    }
  }

  // Check if it's an extension page
  const relativePath = filePath.replace(appDir, "").replace(/\\/g, "/");

  // Extension admin pages
  for (const extName of EXTENSION_DIRS) {
    const extPattern = new RegExp(`^\\/\\(ext\\)\\/admin\\/${extName.replace(/\//g, "\\/")}(\\/|$)`);
    if (extPattern.test(relativePath)) {
      const menuFile = path.join(appDir, "(ext)", "admin", extName, "menu.ts");
      if (fs.existsSync(menuFile)) {
        const menuId = `ext_admin_${extName.replace(/\//g, "_")}`;
        return { type: "extension-admin", menuFile, extension: extName, menuId };
      }
    }
  }

  // Extension user pages
  if (!relativePath.includes("/admin/")) {
    for (const extName of EXTENSION_DIRS) {
      const extPattern = new RegExp(`^\\/\\(ext\\)\\/${extName.replace(/\//g, "\\/")}(\\/|$)`);
      if (extPattern.test(relativePath)) {
        const menuFile = path.join(appDir, "(ext)", extName, "menu.ts");
        if (fs.existsSync(menuFile)) {
          const menuId = `ext_${extName.replace(/\//g, "_")}`;
          return { type: "extension-user", menuFile, extension: extName, menuId };
        }
      }
    }
  }

  // Admin pages (use global adminMenu)
  if (route.startsWith("/admin")) {
    return {
      type: "admin",
      menuFile: path.join(projectRoot, "config", "menu.ts"),
      menuId: MENU_TYPES.admin,
    };
  }

  // User pages (use global userMenu)
  return {
    type: "user",
    menuFile: path.join(projectRoot, "config", "menu.ts"),
    menuId: MENU_TYPES.user,
  };
}

/**
 * Get the translation namespace for a menu type
 */
function getMenuNamespace(pageInfo) {
  if (pageInfo.type === "extension-admin") {
    return `ext_admin_${pageInfo.extension.replace(/\//g, "_")}`;
  }
  if (pageInfo.type === "extension-user") {
    return `ext_${pageInfo.extension.replace(/\//g, "_")}`;
  }
  return "menu";
}

/**
 * Extract menu keys from a menu file
 */
function extractMenuKeys(menuFile, pageInfo) {
  if (!menuFile || !fs.existsSync(menuFile)) {
    return { namespace: "menu", keys: [] };
  }

  const namespace = getMenuNamespace(pageInfo);
  const isExtension = pageInfo.type === "extension-admin" || pageInfo.type === "extension-user";

  try {
    const content = fs.readFileSync(menuFile, "utf-8");
    const keys = new Set();

    const keyMatches = content.matchAll(/key:\s*["']([^"']+)["']/g);
    for (const match of keyMatches) {
      const menuKey = match[1];
      const translationKey = menuKey.replace(/-/g, ".");
      const prefix = isExtension ? "nav." : "";
      keys.add(`${prefix}${translationKey}.title`);
      keys.add(`${prefix}${translationKey}.description`);
    }

    return { namespace, keys: Array.from(keys) };
  } catch (error) {
    console.warn(`  Warning: Could not extract menu keys from ${menuFile}: ${error.message}`);
    return { namespace, keys: [] };
  }
}

/**
 * Load all locale files
 */
function loadLocales() {
  const locales = new Map();
  const files = fs.readdirSync(messagesDir);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const locale = file.replace(".json", "");
    const filePath = path.join(messagesDir, file);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      locales.set(locale, JSON.parse(content));
    } catch (error) {
      console.warn(`Failed to load ${file}:`, error.message);
    }
  }

  return locales;
}

/**
 * Extract only the needed keys from locale data
 */
function extractKeysFromLocale(namespaceKeys, localeData) {
  const result = {};

  for (const [namespace, keys] of Object.entries(namespaceKeys)) {
    if (!localeData[namespace]) continue;

    result[namespace] = {};

    for (const key of keys) {
      const value = getNestedValue(localeData[namespace], key);
      if (value !== undefined) {
        setNestedValue(result[namespace], key, value);
      }
    }
  }

  return result;
}

function getNestedValue(obj, keyPath) {
  const keys = keyPath.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return current;
}

function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Generate route chunk filename
 */
function getChunkName(route, locale) {
  let name = route === "/" ? "index" : route.replace(/^\//, "").replace(/\//g, "-");
  name = name.replace(/\[([^\]]+)\]/g, "$1");
  return `${name}.${locale}.json`;
}

/**
 * Generate menu chunk filename
 */
function getMenuChunkName(menuId, locale) {
  return `${menuId}.${locale}.json`;
}

/**
 * Count keys in an object recursively
 */
function countKeys(obj) {
  let count = 0;

  function countRecursive(o) {
    for (const value of Object.values(o)) {
      if (typeof value === "object" && value !== null) {
        countRecursive(value);
      } else {
        count++;
      }
    }
  }

  countRecursive(obj);
  return count;
}

/**
 * Find all source files recursively (for validation)
 */
function findAllSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules
      if (entry.name !== "node_modules") {
        findAllSourceFiles(fullPath, files);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main execution
async function main() {
  console.log("🌐 Generating i18n manifest...\n");

  // Clear any previous issues
  clearIssues();

  // Find all pages
  const pageFiles = findPageFiles(appDir);
  console.log(`Found ${pageFiles.length} pages\n`);

  // Validate all source files for i18n issues
  console.log("🔍 Validating i18n usage...\n");
  const allSourceFiles = findAllSourceFiles(appDir);
  let validationIssues = [];

  for (const sourceFile of allSourceFiles) {
    const fileIssues = validateFile(sourceFile);
    validationIssues.push(...fileIssues);
  }

  // Report validation issues
  if (validationIssues.length > 0) {
    console.log(formatIssues(validationIssues));
  } else {
    console.log("✓ No i18n validation issues found.\n");
  }

  // Load all locales
  const locales = loadLocales();
  console.log(`Loaded ${locales.size} locales\n`);

  // Track unique menus to generate
  const menusToGenerate = new Map(); // menuId -> { namespace, keys, menuFile, pageInfo }

  // Process each page
  const manifest = {
    routes: {},
    menus: {}, // menuId -> { namespace, file pattern }
    stats: {
      totalRoutes: 0,
      totalKeys: 0,
      totalMenus: 0,
      keysPerRoute: {},
      pageTypes: {
        admin: 0,
        user: 0,
        "extension-admin": 0,
        "extension-user": 0,
        excluded: 0,
      },
    },
    generated: new Date().toISOString(),
  };

  // First pass: collect all pages and their menu requirements
  for (const pageFile of pageFiles) {
    const route = fileToRoute(pageFile);
    const pageInfo = getPageType(route, pageFile);

    console.log(`Processing: ${route} [${pageInfo.type}]`);
    manifest.stats.pageTypes[pageInfo.type]++;

    try {
      // Extract keys from page and its components (WITHOUT menu keys)
      const keys = extractPageKeys(pageFile, projectRoot);

      // Track which menu this page uses (but don't add keys to page)
      if (pageInfo.type !== "excluded" && pageInfo.menuFile && pageInfo.menuId) {
        // Collect menu info for later generation
        if (!menusToGenerate.has(pageInfo.menuId)) {
          const menuData = extractMenuKeys(pageInfo.menuFile, pageInfo);
          menusToGenerate.set(pageInfo.menuId, {
            namespace: menuData.namespace,
            keys: menuData.keys,
            menuFile: pageInfo.menuFile,
            pageInfo: pageInfo,
          });
        }
      }

      const keyCount = Object.values(keys).reduce((sum, k) => sum + k.length, 0);

      if (keyCount > 0 || pageInfo.menuId) {
        manifest.routes[route] = {
          namespaces: Object.keys(keys),
          keys: keys,
          pageType: pageInfo.type,
          extension: pageInfo.extension || null,
          menuId: pageInfo.menuId || null, // Reference to menu file
        };
        manifest.stats.totalRoutes++;
        manifest.stats.totalKeys += keyCount;
        manifest.stats.keysPerRoute[route] = keyCount;

        console.log(`  → ${keyCount} page keys, menu: ${pageInfo.menuId || "none"}`);

        // Generate per-locale page chunks (WITHOUT menu keys)
        for (const [locale, localeData] of locales) {
          const routeTranslations = extractKeysFromLocale(keys, localeData);

          // Only write if there are actual translations
          if (Object.keys(routeTranslations).length > 0) {
            const chunkName = getChunkName(route, locale);
            const chunkPath = path.join(outputDir, chunkName);
            fs.writeFileSync(chunkPath, JSON.stringify(routeTranslations));
          }
        }
      } else {
        console.log(`  → No translations found`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
  }

  // Second pass: generate menu files
  console.log(`\n📋 Generating ${menusToGenerate.size} menu files...\n`);

  for (const [menuId, menuData] of menusToGenerate) {
    console.log(`  Menu: ${menuId} (${menuData.keys.length} keys)`);

    // Add to manifest
    manifest.menus[menuId] = {
      namespace: menuData.namespace,
      keyCount: menuData.keys.length,
    };
    manifest.stats.totalMenus++;

    // Generate per-locale menu chunks
    for (const [locale, localeData] of locales) {
      const menuKeys = { [menuData.namespace]: menuData.keys };
      const menuTranslations = extractKeysFromLocale(menuKeys, localeData);

      if (Object.keys(menuTranslations).length > 0) {
        const menuChunkName = getMenuChunkName(menuId, locale);
        const menuChunkPath = path.join(outputDir, menuChunkName);
        fs.writeFileSync(menuChunkPath, JSON.stringify(menuTranslations));
      }
    }
  }

  // Write manifest
  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log("\n✅ i18n manifest generated successfully!");
  console.log(`   Routes: ${manifest.stats.totalRoutes}`);
  console.log(`   Menus: ${manifest.stats.totalMenus}`);
  console.log(`   Total page keys: ${manifest.stats.totalKeys}`);
  console.log(`   Page types:`);
  console.log(`     - Admin: ${manifest.stats.pageTypes.admin}`);
  console.log(`     - User: ${manifest.stats.pageTypes.user}`);
  console.log(`     - Extension Admin: ${manifest.stats.pageTypes["extension-admin"]}`);
  console.log(`     - Extension User: ${manifest.stats.pageTypes["extension-user"]}`);
  console.log(`     - Excluded: ${manifest.stats.pageTypes.excluded}`);
  console.log(`   Output: ${outputDir}`);

  // Final validation summary
  if (validationIssues.length > 0) {
    const errors = validationIssues.filter(i => i.severity === "error").length;
    const warnings = validationIssues.filter(i => i.severity === "warning").length;
    console.log(`\n⚠️  i18n Validation: ${errors} error(s), ${warnings} warning(s)`);
    console.log(`   Run 'pnpm build:i18n' to see detailed issues.\n`);

    // Exit with error code if there are errors
    if (errors > 0) {
      process.exit(1);
    }
  }
}

main().catch(console.error);