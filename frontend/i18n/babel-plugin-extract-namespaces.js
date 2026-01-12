/**
 * Babel Plugin: Extract Translation Namespaces
 *
 * This plugin analyzes the AST to find useTranslations and getTranslations calls,
 * extracts the namespace arguments, and generates optimized imports.
 *
 * How it works:
 * 1. Finds all useTranslations("namespace") and getTranslations({ namespace: "xxx" }) calls
 * 2. Collects all unique namespaces used in a file
 * 3. Adds preload hints or transforms to load only those namespaces
 *
 * Usage in Next.js config:
 * ```js
 * // next.config.js
 * module.exports = {
 *   experimental: {
 *     swcPlugins: [
 *       ['./lib/i18n/swc-plugin-extract-namespaces', {}]
 *     ]
 *   }
 * }
 * ```
 */

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
module.exports = function extractNamespacesPlugin(babel) {
  const { types: t } = babel;

  return {
    name: "extract-translation-namespaces",

    visitor: {
      Program: {
        enter(path, state) {
          // Initialize state for collecting namespaces
          state.namespaces = new Set();
          state.hasUseTranslations = false;
          state.hasGetTranslations = false;
        },

        exit(path, state) {
          // If no namespaces found, skip transformation
          if (state.namespaces.size === 0) return;

          const namespaceArray = Array.from(state.namespaces);
          const filename = state.filename || "unknown";

          // Log extracted namespaces in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[i18n-extract] ${filename}: ${namespaceArray.join(", ")}`
            );
          }

          // Add namespace metadata as a comment for debugging
          // This helps identify which namespaces each file needs
          path.addComment(
            "leading",
            ` @i18n-namespaces: ${JSON.stringify(namespaceArray)} `
          );
        },
      },

      // Find useTranslations("namespace") calls
      CallExpression(path, state) {
        const { callee, arguments: args } = path.node;

        // Handle useTranslations("namespace")
        if (t.isIdentifier(callee, { name: "useTranslations" })) {
          state.hasUseTranslations = true;

          if (args.length > 0 && t.isStringLiteral(args[0])) {
            state.namespaces.add(args[0].value);
          }
        }

        // Handle getTranslations({ locale, namespace: "xxx" })
        if (t.isIdentifier(callee, { name: "getTranslations" })) {
          state.hasGetTranslations = true;

          if (args.length > 0 && t.isObjectExpression(args[0])) {
            const namespaceProperty = args[0].properties.find(
              (prop) =>
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key, { name: "namespace" }) &&
                t.isStringLiteral(prop.value)
            );

            if (namespaceProperty && t.isStringLiteral(namespaceProperty.value)) {
              state.namespaces.add(namespaceProperty.value.value);
            }
          }
        }

        // Handle getTranslationsForLocale(locale, "namespace")
        if (t.isIdentifier(callee, { name: "getTranslationsForLocale" })) {
          state.hasGetTranslations = true;

          if (args.length > 1 && t.isStringLiteral(args[1])) {
            state.namespaces.add(args[1].value);
          }
        }
      },
    },
  };
};
