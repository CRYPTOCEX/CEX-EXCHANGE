/**
 * Webpack Plugin: Key-Level i18n Optimization
 *
 * This plugin extracts the exact translation keys used by each page
 * and generates optimized translation chunks containing only those keys.
 *
 * How it works:
 * 1. Analyzes each page.tsx/layout.tsx to find all useTranslations/getTranslations calls
 * 2. Recursively follows imports to find keys in child components
 * 3. Generates a manifest mapping routes to their required keys
 * 4. Creates per-route translation chunks with only needed keys
 */

const fs = require("fs");
const path = require("path");
const { extractPageKeys, extractFromFile } = require("./key-extractor");

class I18nKeyOptimizationPlugin {
  constructor(options = {}) {
    this.options = {
      messagesDir: options.messagesDir || "messages",
      outputDir: options.outputDir || ".next/i18n",
      debug: options.debug || false,
      defaultLocale: options.defaultLocale || "en",
      // Keys that should always be included (common/menu)
      alwaysIncludeNamespaces: options.alwaysIncludeNamespaces || ["common", "menu"],
      ...options,
    };

    this.routeKeys = new Map();        // route -> { namespace: keys[] }
    this.allLocaleData = new Map();    // locale -> full translation data
    this.processedFiles = new Set();
  }

  apply(compiler) {
    const pluginName = "I18nKeyOptimizationPlugin";
    const projectRoot = compiler.context;

    // Hook into compilation to analyze modules
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.finishModules.tapAsync(pluginName, async (modules, callback) => {
        try {
          await this.processModules(modules, projectRoot);
          callback();
        } catch (error) {
          console.error("[i18n] Error processing modules:", error);
          callback();
        }
      });
    });

    // Generate optimized chunks after compilation
    compiler.hooks.emit.tapAsync(pluginName, async (compilation, callback) => {
      try {
        await this.generateOptimizedChunks(compilation, projectRoot);
        callback();
      } catch (error) {
        console.error("[i18n] Error generating chunks:", error);
        callback();
      }
    });
  }

  /**
   * Process all modules to extract translation keys
   */
  async processModules(modules, projectRoot) {
    for (const module of modules) {
      if (!module.resource) continue;

      // Normalize path
      const normalizedPath = module.resource.replace(/\\/g, "/");

      // Only process app directory files
      if (!normalizedPath.includes("/app/")) continue;

      // Skip node_modules and i18n files
      if (normalizedPath.includes("node_modules") || normalizedPath.includes("/i18n/")) continue;

      // Check if this is a route file (page.tsx, layout.tsx)
      const isPageFile = normalizedPath.endsWith("page.tsx") || normalizedPath.endsWith("page.ts");
      const isLayoutFile = normalizedPath.endsWith("layout.tsx") || normalizedPath.endsWith("layout.ts");

      if (!isPageFile && !isLayoutFile) continue;

      // Skip if already processed
      if (this.processedFiles.has(normalizedPath)) continue;
      this.processedFiles.add(normalizedPath);

      // Extract route path
      const routePath = this.extractRoutePath(normalizedPath);
      if (!routePath) continue;

      // Extract keys from page and its dependencies
      const pageKeys = extractPageKeys(module.resource, projectRoot);

      if (Object.keys(pageKeys).length > 0) {
        // Merge with existing keys for this route (from layout files)
        const existing = this.routeKeys.get(routePath) || {};
        for (const [namespace, keys] of Object.entries(pageKeys)) {
          existing[namespace] = [...new Set([...(existing[namespace] || []), ...keys])];
        }
        this.routeKeys.set(routePath, existing);

        if (this.options.debug) {
          const keyCount = Object.values(pageKeys).reduce((sum, keys) => sum + keys.length, 0);
          console.log(`[i18n] ${routePath}: ${keyCount} keys from ${Object.keys(pageKeys).length} namespaces`);
        }
      }
    }
  }

  /**
   * Generate optimized translation chunks
   */
  async generateOptimizedChunks(compilation, projectRoot) {
    if (this.routeKeys.size === 0) {
      if (this.options.debug) {
        console.log("[i18n] No routes with translations found");
      }
      return;
    }

    // Load all locale files
    await this.loadLocaleFiles(projectRoot);

    // Generate manifest
    const manifest = {
      routes: {},
      generated: new Date().toISOString(),
      stats: {
        totalRoutes: this.routeKeys.size,
        totalKeys: 0,
      },
    };

    // Generate per-route chunks for each locale
    const locales = Array.from(this.allLocaleData.keys());

    for (const [route, namespaceKeys] of this.routeKeys) {
      manifest.routes[route] = {
        namespaces: Object.keys(namespaceKeys),
        keys: namespaceKeys,
      };

      let routeKeyCount = 0;

      // Generate translation chunk for each locale
      for (const locale of locales) {
        const localeData = this.allLocaleData.get(locale);
        const routeTranslations = this.extractKeysFromLocale(namespaceKeys, localeData);

        // Create chunk filename based on route
        const chunkName = this.getChunkName(route, locale);
        const chunkContent = JSON.stringify(routeTranslations);

        // Add to compilation assets
        compilation.emitAsset(
          `i18n/${chunkName}`,
          new compilation.compiler.webpack.sources.RawSource(chunkContent)
        );

        if (locale === this.options.defaultLocale) {
          routeKeyCount = this.countKeys(routeTranslations);
        }
      }

      manifest.stats.totalKeys += routeKeyCount;
    }

    // Emit manifest
    compilation.emitAsset(
      "i18n/manifest.json",
      new compilation.compiler.webpack.sources.RawSource(JSON.stringify(manifest, null, 2))
    );

    if (this.options.debug) {
      console.log(`[i18n] Generated ${this.routeKeys.size} route chunks`);
      console.log(`[i18n] Total keys extracted: ${manifest.stats.totalKeys}`);
    }
  }

  /**
   * Load all locale JSON files
   */
  async loadLocaleFiles(projectRoot) {
    const messagesDir = path.join(projectRoot, this.options.messagesDir);

    try {
      const files = fs.readdirSync(messagesDir);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const locale = file.replace(".json", "");
        const filePath = path.join(messagesDir, file);

        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const data = JSON.parse(content);
          this.allLocaleData.set(locale, data);
        } catch (error) {
          console.warn(`[i18n] Failed to load ${file}:`, error.message);
        }
      }
    } catch (error) {
      console.error("[i18n] Failed to read messages directory:", error.message);
    }
  }

  /**
   * Extract only the needed keys from locale data
   */
  extractKeysFromLocale(namespaceKeys, localeData) {
    const result = {};

    for (const [namespace, keys] of Object.entries(namespaceKeys)) {
      if (!localeData[namespace]) continue;

      result[namespace] = {};

      for (const key of keys) {
        const value = this.getNestedValue(localeData[namespace], key);
        if (value !== undefined) {
          this.setNestedValue(result[namespace], key, value);
        }
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }

    return current;
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split(".");
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
   * Count total keys in translations object
   */
  countKeys(translations) {
    let count = 0;

    function countRecursive(obj) {
      for (const value of Object.values(obj)) {
        if (typeof value === "object" && value !== null) {
          countRecursive(value);
        } else {
          count++;
        }
      }
    }

    countRecursive(translations);
    return count;
  }

  /**
   * Generate chunk filename for a route
   */
  getChunkName(route, locale) {
    // Convert route to filename-safe format
    let name = route === "/" ? "index" : route.replace(/^\//, "").replace(/\//g, "-");
    // Remove dynamic segments markers
    name = name.replace(/\[([^\]]+)\]/g, "$1");
    return `${name}.${locale}.json`;
  }

  /**
   * Extract route path from file path
   */
  extractRoutePath(filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");

    const appIndex = normalizedPath.indexOf("/app/");
    if (appIndex === -1) return null;

    let routePath = normalizedPath.slice(appIndex + 4);

    // Remove [locale] segment
    routePath = routePath.replace(/\[locale\]\/?/, "");

    // Remove page.tsx or layout.tsx
    routePath = routePath.replace(/(page|layout)\.(tsx?|jsx?)$/, "");

    // Clean up trailing slashes
    routePath = "/" + routePath.replace(/\/$/, "").replace(/^\//, "");

    // Handle route groups (directories starting with parentheses)
    routePath = routePath.replace(/\([^)]+\)\//g, "");

    return routePath || "/";
  }
}

module.exports = I18nKeyOptimizationPlugin;
