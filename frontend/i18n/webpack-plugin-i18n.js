/**
 * Webpack Plugin: i18n Namespace Optimization
 *
 * This plugin works with the namespace extraction to optimize translation loading:
 * 1. Analyzes route files to find which namespaces they use
 * 2. Creates a manifest mapping routes to their required namespaces
 * 3. Enables dynamic imports for each namespace JSON file
 *
 * The goal is to ensure each page only loads the translation namespaces it needs,
 * rather than loading all 47 namespaces.
 */

const fs = require("fs");
const path = require("path");

class I18nOptimizationPlugin {
  constructor(options = {}) {
    this.options = {
      messagesDir: options.messagesDir || "messages",
      outputManifest: options.outputManifest || ".next/i18n-manifest.json",
      debug: options.debug || false,
      ...options,
    };
    this.routeNamespaces = new Map();
  }

  apply(compiler) {
    const pluginName = "I18nOptimizationPlugin";

    // Hook into the compilation process
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      // Parse modules to extract namespace usage
      compilation.hooks.finishModules.tapAsync(
        pluginName,
        (modules, callback) => {
          for (const module of modules) {
            if (!module.resource) continue;

            // Only process app directory files
            if (!module.resource.includes("/app/") && !module.resource.includes("\\app\\")) {
              continue;
            }

            // Skip node_modules
            if (module.resource.includes("node_modules")) continue;

            // Check if this is a route file (page.tsx, layout.tsx)
            const isRouteFile =
              module.resource.endsWith("page.tsx") ||
              module.resource.endsWith("page.ts") ||
              module.resource.endsWith("layout.tsx") ||
              module.resource.endsWith("layout.ts");

            if (!isRouteFile) continue;

            // Extract route path from file path
            const routePath = this.extractRoutePath(module.resource);
            if (!routePath) continue;

            // Get namespace info from module source
            if (module._source && module._source._value) {
              const namespaces = this.extractNamespaces(module._source._value);
              if (namespaces.length > 0) {
                const existing = this.routeNamespaces.get(routePath) || [];
                this.routeNamespaces.set(routePath, [
                  ...new Set([...existing, ...namespaces]),
                ]);

                if (this.options.debug) {
                  console.log(`[i18n] ${routePath}: ${namespaces.join(", ")}`);
                }
              }
            }
          }
          callback();
        }
      );
    });

    // Write manifest after compilation
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      const manifest = Object.fromEntries(this.routeNamespaces);

      if (Object.keys(manifest).length > 0) {
        const manifestContent = JSON.stringify(manifest, null, 2);
        const manifestPath = path.join(
          compiler.options.output.path || ".next",
          "i18n-manifest.json"
        );

        // Add to compilation assets
        compilation.emitAsset(
          "i18n-manifest.json",
          new compiler.webpack.sources.RawSource(manifestContent)
        );

        if (this.options.debug) {
          console.log(
            `[i18n] Manifest generated: ${Object.keys(manifest).length} routes`
          );
        }
      }

      callback();
    });
  }

  /**
   * Extract route path from file path
   */
  extractRoutePath(filePath) {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, "/");

    // Find app directory index
    const appIndex = normalizedPath.indexOf("/app/");
    if (appIndex === -1) return null;

    // Get path after /app/
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

  /**
   * Extract namespaces from source code using regex
   */
  extractNamespaces(source) {
    const namespaces = new Set();

    // Match useTranslations("namespace") or useTranslations('namespace')
    const useTranslationsRegex = /useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g;
    let match;
    while ((match = useTranslationsRegex.exec(source)) !== null) {
      namespaces.add(match[1]);
    }

    // Match getTranslations({ namespace: "xxx" })
    const getTranslationsRegex =
      /getTranslations\s*\(\s*\{[^}]*namespace\s*:\s*["']([^"']+)["'][^}]*\}\s*\)/g;
    while ((match = getTranslationsRegex.exec(source)) !== null) {
      namespaces.add(match[1]);
    }

    // Match getTranslationsForLocale(locale, "namespace")
    const getTranslationsForLocaleRegex =
      /getTranslationsForLocale\s*\([^,]+,\s*["']([^"']+)["']\s*\)/g;
    while ((match = getTranslationsForLocaleRegex.exec(source)) !== null) {
      namespaces.add(match[1]);
    }

    return Array.from(namespaces);
  }
}

module.exports = I18nOptimizationPlugin;
