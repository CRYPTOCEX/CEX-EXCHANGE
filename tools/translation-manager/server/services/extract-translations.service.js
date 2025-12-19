/**
 * Translation Extraction Service
 * Extracts hardcoded text from TSX files and converts them to translatable t() calls
 *
 * Features:
 * - Extracts JSX text content
 * - Extracts string literals in JSX attributes (title, placeholder, alt, aria-label, label, description, tooltip)
 * - Generates snake_case keys matching project conventions
 * - Minimal file modifications (no reformatting)
 * - Skips already translated text
 * - Skips emojis, symbols, and non-translatable content
 * - Preserves original whitespace/indentation
 * - Handles template strings with interpolations
 * - Smart detection of React components vs helper functions
 */

const fs = require('fs/promises');
const path = require('path');
const { parseTextIntoParts } = require('./namespace-utils');

// Lazy load babel dependencies (they're heavy)
let parse, traverse, t;

function loadBabelDependencies() {
    if (!parse) {
        parse = require('@babel/parser').parse;
        traverse = require('@babel/traverse').default;
        t = require('@babel/types');
    }
}

class TranslationExtractor {
    constructor(options = {}) {
        this.frontendDir = options.frontendDir || path.join(__dirname, '../../../../frontend');
        this.messagesDir = path.join(this.frontendDir, 'messages');
        this.locales = options.locales || ['en'];
        this.messages = {};
        this.logs = [];
        this.stats = {
            filesProcessed: 0,
            filesModified: 0,
            keysExtracted: 0,
            filesSkipped: 0,
            textsSkipped: 0
        };

        // Untranslatable patterns loaded from config
        this.untranslatablePatterns = [];

        // Attributes that commonly contain translatable text
        this.translatableAttributes = [
            'title', 'placeholder', 'alt', 'aria-label', 'label',
            'description', 'tooltip', 'helperText', 'errorMessage',
            'successMessage', 'loadingText', 'emptyText'
        ];

        // Common non-translatable patterns
        this.skipPatterns = [
            /^[A-Z][a-z]*$/,                    // Single capitalized word that might be a component name (Input, Settings)
            /^[a-z]+[A-Z]/,                     // camelCase (likely code: useState, myFunc)
            /^[A-Z][a-z]+(?:[A-Z][a-z]*)+$/,    // PascalCase (likely code: MyComponent, UseState) - requires lowercase after each uppercase
            /^[A-Z]{2,}[a-z]+[A-Za-z]*$/,       // Acronym + PascalCase (XMLParser, HTMLElement, QRCode)
            /^\$\{.*\}$/,                       // Template literal expression
            /^[a-z_]+$/,                        // snake_case (likely a key already)
            /^[A-Z_]+$/,                        // SCREAMING_SNAKE_CASE (likely a constant)
            /^data-/,                           // data attributes
            /^on[A-Z]/,                         // event handlers
            /^className$/i,
            /^style$/i,
            /^ref$/i,
            /^key$/i,
            /^id$/i,
            /^name$/i,
            /^type$/i,
            /^value$/i,
            /^href$/i,
            /^src$/i,
        ];
    }

    log(message) {
        this.logs.push(message);
        console.log(message);
    }

    // Recursively find all TSX files in a directory
    async findTsxFilesRecursive(dir) {
        const files = [];
        try {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(dir, item.name);

                // Skip specific excluded files in app root
                const relativePath = path.relative(this.frontendDir, fullPath).replace(/\\/g, '/');
                const excludedFiles = [
                    'app/global-error.tsx',
                    'app/not-found.tsx',
                    'app/page.tsx'
                ];
                if (excludedFiles.includes(relativePath)) {
                    continue;
                }

                if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                    const subFiles = await this.findTsxFilesRecursive(fullPath);
                    files.push(...subFiles);
                } else if (item.isFile() && item.name.endsWith('.tsx')) {
                    files.push(fullPath);
                }
            }
        } catch (e) {
            this.log(`Error reading directory ${dir}: ${e.message}`);
        }
        return files;
    }

    async initialize() {
        loadBabelDependencies();

        // Load untranslatable patterns from config
        await this.loadUntranslatableConfig();

        // Load locales from messages directory
        try {
            const files = await fs.readdir(this.messagesDir);
            let locales = files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''));

            // Ensure 'en' is always the primary locale (first in array)
            // This is critical because we compare values against English
            if (locales.includes('en')) {
                locales = ['en', ...locales.filter(l => l !== 'en')];
            }
            this.locales = locales;
        } catch (e) {
            this.locales = ['en'];
        }

        // Ensure message files exist
        await fs.mkdir(this.messagesDir, { recursive: true });
        for (const locale of this.locales) {
            const filePath = path.join(this.messagesDir, `${locale}.json`);
            try {
                await fs.access(filePath);
            } catch {
                await fs.writeFile(filePath, '{}', 'utf8');
            }
        }

        // Load messages
        for (const locale of this.locales) {
            const filePath = path.join(this.messagesDir, `${locale}.json`);
            const content = await fs.readFile(filePath, 'utf8');
            this.messages[locale] = JSON.parse(content);
        }
    }

    async loadUntranslatableConfig() {
        try {
            const configPath = path.join(__dirname, '../../untranslatable-config.json');
            const content = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(content);

            // Combine patterns and customPatterns, filter to only enabled value patterns
            const allPatterns = [...(config.patterns || []), ...(config.customPatterns || [])];
            this.untranslatablePatterns = allPatterns
                .filter(p => p.enabled !== false && p.testOn === 'value')
                .map(p => {
                    try {
                        return {
                            id: p.id,
                            name: p.name,
                            regex: new RegExp(p.pattern, p.flags || ''),
                            category: p.category
                        };
                    } catch (e) {
                        this.log(`[loadUntranslatableConfig] Invalid pattern: ${p.id} - ${e.message}`);
                        return null;
                    }
                })
                .filter(Boolean);

            this.log(`[loadUntranslatableConfig] Loaded ${this.untranslatablePatterns.length} untranslatable patterns`);
        } catch (e) {
            this.log(`[loadUntranslatableConfig] Could not load config: ${e.message}`);
            this.untranslatablePatterns = [];
        }
    }

    async saveMessages() {
        for (const locale of this.locales) {
            const filePath = path.join(this.messagesDir, `${locale}.json`);
            await fs.writeFile(
                filePath,
                JSON.stringify(this.messages[locale], null, 2),
                'utf8'
            );
        }
    }

    getNamespaceFromFile(filePath) {
        const relativeToFrontend = path.relative(this.frontendDir, filePath).replace(/\\/g, '/');

        // === NEW NAMESPACE RULES (based on optimize-namespaces.js) ===
        // Namespace hierarchy uses underscore format: ext_affiliate, dashboard_admin
        // Maximum depth of 2 segments

        let rel = relativeToFrontend;

        this.log(`[getNamespaceFromFile] Input: ${relativeToFrontend}`);

        // Handle components directory -> components namespace
        if (rel.startsWith('components/')) {
            const parts = rel.split('/').filter(Boolean);
            parts.shift(); // Remove 'components'
            parts.pop(); // Remove filename

            if (parts.length === 0) {
                return 'components';
            }

            // Known component sub-namespaces
            const knownSubs = ['nft', 'p2p', 'staking', 'forex', 'futures', 'binary', 'ai', 'ecommerce', 'blog', 'auth', 'blocks'];
            const firstPart = parts[0].toLowerCase();
            if (knownSubs.includes(firstPart)) {
                return `components_${firstPart}`;
            }

            return 'components';
        }

        // Handle app directory
        if (rel.startsWith('app/')) {
            rel = rel.slice(4);
        }

        // Remove [locale]/ prefix
        rel = rel.replace(/^\[locale\]\//, '');

        // Remove filename - handles both /filename.tsx and just filename.tsx at root
        rel = rel.replace(/\/?(page|layout|client|error|not-found|global-error|loading|columns|analytics)\.tsx?$/, '');
        rel = rel.replace(/\.tsx?$/, '');

        const segments = rel.split('/').filter(Boolean);
        this.log(`[getNamespaceFromFile] Segments: [${segments.join(', ')}]`);

        // Clean up segments - extract route groups and skip dynamic segments
        const cleanSegments = segments.map(s => {
            if (s.startsWith('(') && s.endsWith(')')) {
                return s.slice(1, -1); // (ext) -> ext
            }
            if (s.startsWith('[') && s.endsWith(']')) {
                return null; // Skip dynamic segments
            }
            return s;
        }).filter(Boolean);

        if (cleanSegments.length === 0) {
            return 'common';
        }

        // Build namespace with max depth of 2
        const MAX_DEPTH = 2;
        const nsSegments = cleanSegments.slice(0, MAX_DEPTH);
        const namespace = nsSegments.join('_');

        this.log(`[getNamespaceFromFile] → Returning: ${namespace}`);
        return namespace;
    }

    // Check if text is inside a t() call or similar translation function
    isInsideTranslationCall(nodePath) {
        let current = nodePath.parentPath;
        while (current) {
            if (current.isCallExpression()) {
                const callee = current.node.callee;
                // Check for t(), tCommon(), tExt(), etc. (any translator function)
                if (t.isIdentifier(callee) && /^t[A-Z]?\w*$/.test(callee.name)) {
                    return true;
                }
                // Check for t.raw(), t.rich(), t.markup()
                if (t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object) &&
                    /^t[A-Z]?\w*$/.test(callee.object.name)) {
                    return true;
                }
            }
            current = current.parentPath;
        }
        return false;
    }

    // Check if JSXText is already wrapped by t() or similar
    isJSXTextWrapped(nodePath) {
        const parent = nodePath.parent;
        if (!t.isJSXExpressionContainer(parent)) return false;

        const expr = parent.expression;
        // Check for {t("key")}, {tCommon("key")}, {tExt("key")} pattern
        if (t.isCallExpression(expr) && t.isIdentifier(expr.callee) && /^t[A-Z]?\w*$/.test(expr.callee.name)) {
            return true;
        }
        // Check for {t.raw("key")} etc
        if (t.isCallExpression(expr) &&
            t.isMemberExpression(expr.callee) &&
            t.isIdentifier(expr.callee.object) &&
            /^t[A-Z]?\w*$/.test(expr.callee.object.name)) {
            return true;
        }
        return false;
    }

    // Check if text should be translated
    shouldTranslate(value, context = {}) {
        const trimmed = value.trim();
        if (!trimmed) return false;

        // Skip very short text (less than 2 chars)
        if (trimmed.length < 2) return false;

        // Skip single letters/characters
        if (trimmed.length === 1) return false;

        // Skip common abbreviations and short codes that shouldn't be translated
        // Note: KB, MB, GB, TB are NOT skipped - they may need translation in some locales
        const skipAbbreviations = [
            'N/A', 'n/a', 'N.A.', 'TBD', 'TBA', 'TODO', 'FIXME', 'WIP',
            'OK', 'OK.', 'ID', 'URL', 'URI', 'API', 'UI', 'UX',
            'vs', 'vs.', 'etc', 'etc.', 'e.g.', 'i.e.',
            'AM', 'PM', 'UTC', 'GMT',
            'USD', 'EUR', 'GBP', 'BTC', 'ETH',
            'px', 'em', 'rem', '%',
        ];
        if (skipAbbreviations.includes(trimmed) || skipAbbreviations.includes(trimmed.toUpperCase())) {
            return false;
        }

        // Note: Removed generic 1-3 uppercase pattern - rely on explicit skipAbbreviations list instead
        // This allows translatable size units like KB, MB, GB, TB to be processed

        // Skip text that would result in a very short or meaningless key
        // e.g., "N/A" becomes "N_A", "X" becomes "x"
        const potentialKey = trimmed
            .toLowerCase()
            .replace(/[^\w\s]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        if (potentialKey.length < 2 || /^[a-z]_[a-z]$/i.test(potentialKey)) {
            return false;
        }

        // Skip if it looks like code or a path
        if (/^[\/\\]/.test(trimmed)) return false;
        if (/^https?:\/\//.test(trimmed)) return false;
        if (/^mailto:/i.test(trimmed)) return false;
        if (/^\{.*\}$/.test(trimmed)) return false;
        if (/^[a-z]+\.[a-z]+$/i.test(trimmed)) return false; // file.ext patterns
        if (/^\d+(\.\d+)?%?$/.test(trimmed)) return false; // numbers and percentages

        // Skip text starting with special punctuation (likely partial/broken text)
        // Examples: "), or", "% of target", "+ tax"
        if (/^[),;:+%&|]/.test(trimmed)) return false;

        // Skip text ending with special punctuation that suggests incomplete text
        // Examples: "Tokens (", "something +", "text &", "MB)"
        if (/[+&|()\[\]]$/.test(trimmed)) return false;

        // Skip path-like patterns with ... (ellipsis in paths)
        // Examples: ".../metadata/", "src/.../file"
        if (/\.{2,}.*\//.test(trimmed) || /\/.*\.{2,}/.test(trimmed)) return false;

        // API key patterns: (pk_*), (sk_*), pk_live_*, sk_test_*, etc.
        if (/\b[ps]k_[*\w]*\b/i.test(trimmed)) return false;

        // Wildcard patterns in parentheses: (*), (something_*)
        if (/^\([^)]*\*[^)]*\)$/.test(trimmed)) return false;

        // Currency codes in parentheses: (ETH), (BTC), (USD), (APR). etc.
        // Strip trailing punctuation before checking
        const withoutTrailingPunct = trimmed.replace(/[.,;:!?]+$/, '');
        if (/^\([A-Z]{2,6}\)$/.test(withoutTrailingPunct)) return false;

        // Skip URLs and URL-like patterns anywhere in the text
        // Examples: "ipfs://Qm... or https://gateway...", "Enter https://example.com"
        if (/^(ipfs|https?):\/\//.test(trimmed)) return false;
        if (/(ipfs|https?):\/\//.test(trimmed)) return false;  // URL anywhere in text
        if (/\.(cloud|io|com|net|org)\//.test(trimmed)) return false;  // Domain patterns
        if (/\/ipfs\//.test(trimmed)) return false;  // IPFS paths

        // Skip email addresses - should use literal text, not translations
        if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/.test(trimmed)) return false;

        // Skip pure numbers with currency symbols
        if (/^[$€£¥₹]?\d+([.,]\d+)?%?$/.test(trimmed)) return false;

        // Skip CSS class names or IDs (single word with dashes/underscores only)
        if (/^[.#]?[a-z][a-z0-9-_]*$/i.test(trimmed) && !trimmed.includes(' ')) return false;

        // Skip hex colors
        if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return false;

        // Skip if only contains non-translatable characters
        // Comprehensive pattern for symbols, emojis, punctuation, etc.
        const nonTranslatablePattern = /^[\s\d\p{P}\p{S}\p{So}\p{Emoji}\p{Emoji_Presentation}\u2600-\u26FF\u2700-\u27BF●•·○◦◆◇■□▪▫★☆♦♣♠♥✓✗✔✘→←↑↓↔⇒⇐⇑⇓⇔📷🖼️🎨🔥💡⚡🚀✨💎🎯📊📈📉\-+=%$€£¥#@&*|/\\<>()[\]{}'"`,.:;!?\n\r\t—–•…''""«»‹›]+$/u;
        if (nonTranslatablePattern.test(trimmed)) {
            return false;
        }

        // Must have at least 2 actual letters to be translatable
        const letters = trimmed.match(/[a-zA-Z]/g);
        if (!letters || letters.length < 2) return false;

        // Skip if it's just whitespace with punctuation
        if (/^[\s()[\]{}<>.,;:!?'"]+$/.test(trimmed)) return false;

        // Skip common code patterns
        for (const pattern of this.skipPatterns) {
            if (pattern.test(trimmed)) return false;
        }

        // Skip very long strings that look like lorem ipsum or test data
        if (trimmed.length > 500) return false;

        // Check against loaded untranslatable patterns from config
        // These patterns match exact values that shouldn't be translated
        for (const pattern of this.untranslatablePatterns) {
            if (pattern.regex.test(trimmed)) {
                return false;
            }
        }

        return true;
    }

    // Split text into sentences for translation
    // Returns array of {text, hasTrailingSpace} objects
    // NOTE: This returns the ORIGINAL text (not cleaned) - cleaning happens during replacement
    splitIntoSentences(text) {
        // Helper to trim trailing punctuation/whitespace
        const trimTrailingPunctuation = (str) => {
            return str.trim().replace(/[,;:\s]+$/, '');
        };

        // Don't split if text is short enough
        if (text.length <= 80) {
            const processed = trimTrailingPunctuation(text);
            return [{ text: processed, hasTrailingSpace: false }];
        }

        // Split by sentence-ending punctuation followed by space
        // Pattern: period/exclamation/question mark followed by space and capital letter
        const sentencePattern = /([.!?])\s+(?=[A-Z])/g;

        const sentences = [];
        let lastIndex = 0;
        let match;

        while ((match = sentencePattern.exec(text)) !== null) {
            const sentence = trimTrailingPunctuation(text.slice(lastIndex, match.index + 1));
            if (sentence && this.shouldTranslate(sentence)) {
                sentences.push({ text: sentence, hasTrailingSpace: true });
            }
            lastIndex = match.index + match[0].length;
        }

        // Add the remaining text
        const remaining = trimTrailingPunctuation(text.slice(lastIndex));
        if (remaining && this.shouldTranslate(remaining)) {
            sentences.push({ text: remaining, hasTrailingSpace: false });
        }

        // If we couldn't split effectively, return the original
        if (sentences.length === 0) {
            const processed = trimTrailingPunctuation(text);
            return [{ text: processed, hasTrailingSpace: false }];
        }

        return sentences;
    }

    // Check if inside sr-only (screen reader only) element
    isInsideSrOnly(nodePath) {
        let current = nodePath;
        while (current && !current.isProgram()) {
            if (current.isJSXElement()) {
                const opening = current.node.openingElement;
                for (const attr of opening.attributes || []) {
                    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: 'className' })) {
                        let classValue = '';
                        if (t.isStringLiteral(attr.value)) {
                            classValue = attr.value.value;
                        } else if (t.isJSXExpressionContainer(attr.value) &&
                                   t.isStringLiteral(attr.value.expression)) {
                            classValue = attr.value.expression.value;
                        }
                        if (classValue.includes('sr-only') || classValue.includes('visually-hidden')) {
                            return true;
                        }
                    }
                }
            }
            current = current.parentPath;
        }
        return false;
    }

    // Find the enclosing React component function (with block body)
    findEnclosingComponent(nodePath) {
        let current = nodePath;
        while (current && !current.isProgram()) {
            if (current.isFunctionDeclaration() || current.isArrowFunctionExpression() || current.isFunctionExpression()) {
                const node = current.node;

                // Must have block statement body (not implicit return)
                if (!t.isBlockStatement(node.body)) {
                    // Found implicit return - this will cause issues
                    return { func: current, hasImplicitReturn: true };
                }

                // Check if this looks like a React component (PascalCase name)
                if (node.id && /^[A-Z]/.test(node.id.name)) {
                    return { func: current, hasImplicitReturn: false };
                }

                // For arrow/function expressions, check parent
                if (current.isArrowFunctionExpression() || current.isFunctionExpression()) {
                    const parent = current.parentPath;
                    if (parent && parent.isVariableDeclarator() &&
                        t.isIdentifier(parent.node.id) &&
                        /^[A-Z]/.test(parent.node.id.name)) {
                        return { func: current, hasImplicitReturn: false };
                    }
                }

                // If it's an export default function, consider it a component
                if (current.parentPath && current.parentPath.isExportDefaultDeclaration()) {
                    return { func: current, hasImplicitReturn: false };
                }

                // Otherwise keep searching up
            }
            current = current.parentPath;
        }
        return null;
    }

    // Find last import declaration for inserting new imports
    findLastImportNode(ast) {
        let lastImport = null;
        let lastDirective = null;

        // Check directives array first (where Babel puts "use client", etc.)
        if (ast.program.directives && ast.program.directives.length > 0) {
            lastDirective = ast.program.directives[ast.program.directives.length - 1];
        }

        for (const node of ast.program.body) {
            if (t.isImportDeclaration(node)) {
                lastImport = node;
            } else if (t.isExpressionStatement(node) &&
                       t.isStringLiteral(node.expression) &&
                       ['use client', 'use server', 'use strict'].includes(node.expression.value)) {
                lastDirective = node;
            } else if (lastImport) {
                break;
            }
        }

        return lastImport || lastDirective;
    }

    // Check if file is a server component (no "use client" directive)
    isServerComponent(ast) {
        // Check directives array (where Babel puts "use client", "use strict", etc.)
        if (ast.program.directives && ast.program.directives.length > 0) {
            for (const directive of ast.program.directives) {
                if (directive.value && directive.value.value === 'use client') {
                    return false;
                }
            }
        }
        // Also check body for older-style directives (ExpressionStatement with StringLiteral)
        for (const node of ast.program.body) {
            if (t.isExpressionStatement(node) &&
                t.isStringLiteral(node.expression) &&
                node.expression.value === 'use client') {
                return false;
            }
            // Once we hit a non-directive, stop checking
            if (!t.isExpressionStatement(node) || !t.isStringLiteral(node.expression)) {
                break;
            }
        }
        return true;
    }

    // Check if file already has useTranslations import
    hasUseTranslationsImport(ast) {
        for (const node of ast.program.body) {
            if (t.isImportDeclaration(node) && node.source.value === 'next-intl') {
                for (const spec of node.specifiers) {
                    if (t.isImportSpecifier(spec) &&
                        t.isIdentifier(spec.imported, { name: 'useTranslations' })) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Check if file already has getTranslations import (for server components)
    hasGetTranslationsImport(ast) {
        for (const node of ast.program.body) {
            if (t.isImportDeclaration(node) && node.source.value === 'next-intl/server') {
                for (const spec of node.specifiers) {
                    if (t.isImportSpecifier(spec) &&
                        t.isIdentifier(spec.imported, { name: 'getTranslations' })) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Check if a function body already has `const t = useTranslations(...)` or `const t = await getTranslations(...)`
    functionHasT(funcNode) {
        if (!funcNode.body || !funcNode.body.body) return false;

        for (const stmt of funcNode.body.body) {
            if (t.isVariableDeclaration(stmt)) {
                for (const decl of stmt.declarations) {
                    if (t.isIdentifier(decl.id, { name: 't' })) {
                        // Check for useTranslations
                        if (t.isCallExpression(decl.init) &&
                            t.isIdentifier(decl.init.callee, { name: 'useTranslations' })) {
                            return true;
                        }
                        // Check for await getTranslations
                        if (t.isAwaitExpression(decl.init) &&
                            t.isCallExpression(decl.init.argument) &&
                            t.isIdentifier(decl.init.argument.callee, { name: 'getTranslations' })) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // Generate a snake_case key from text
    // IMPORTANT: Keys must NOT contain periods as they're interpreted as namespace separators
    // Keys should start with a letter (not underscore or number) for proper naming conventions
    generateTranslationKey(text) {
        let key = text
            .toLowerCase()
            .trim()
            // Remove leading special characters/symbols/emojis that shouldn't start a key
            .replace(/^[^\w\s]+/g, '')
            .replace(/['"""''`]/g, '')           // Remove quotes
            .replace(/\.\.\./g, '_ellipsis_')    // Handle ellipsis specially
            .replace(/\./g, '_')                 // Replace periods with underscores (CRITICAL)
            .replace(/[^\w\s-]/g, ' ')           // Replace non-word chars with space
            .replace(/\s+/g, '_')                // Replace spaces with underscores
            .replace(/-+/g, '_')                 // Replace dashes with underscores
            .replace(/_+/g, '_')                 // Collapse multiple underscores
            .replace(/^_|_$/g, '');              // Trim leading/trailing underscores

        // If key starts with a number, prefix with 'n_' (better than just underscore)
        // This creates proper keys like 'n_24h_volume' instead of '_24h_volume'
        if (/^\d/.test(key)) {
            key = 'n_' + key;
        }

        // Truncate long keys while keeping them readable
        if (key.length > 50) {
            const words = key.split('_').filter(Boolean);
            if (words.length > 6) {
                // Take first 6 words for long keys
                key = words.slice(0, 6).join('_');
            } else {
                key = key.substring(0, 50).replace(/_$/, '');
            }
        }

        // Final cleanup - ensure no periods remain (safety check)
        key = key.replace(/\./g, '_');

        // Ensure key starts with a letter (remove leading underscores/numbers)
        // This ensures keys like 'n_24h' are valid (start with 'n')
        key = key.replace(/^[^a-z]+/g, '');

        // If after cleanup key is empty or starts with number, prefix with 'n_'
        if (!key || /^\d/.test(key)) {
            key = 'n_' + (key || 'text');
        }

        return key || 'text';
    }

    // Normalize a value for comparison - handles case, whitespace, and punctuation
    normalizeValue(value) {
        if (typeof value !== 'string') return '';
        return value
            .trim()
            .toLowerCase()
            .replace(/[\s\u00A0]+/g, ' ')  // Normalize all whitespace (including non-breaking space)
            .replace(/['']/g, "'")          // Normalize quotes
            .replace(/[""]/g, '"')
            .replace(/\s+/g, ' ');          // Collapse multiple spaces
    }

    // Get parent namespaces from a namespace
    // e.g., "ext_admin_affiliate" -> ["ext_admin", "ext", "common"]
    getParentNamespaces(namespace) {
        const parents = [];
        const parts = namespace.split('_');
        // Build parent namespaces from most specific to least specific
        for (let i = parts.length - 1; i > 0; i--) {
            parents.push(parts.slice(0, i).join('_'));
        }
        // Always check common as the most generic namespace
        parents.push('common');
        return parents;
    }

    // Find existing key-value pair across all related namespaces
    // Returns { namespace, key } if found, null otherwise
    findExistingKey(targetNamespace, value) {
        const primaryLocale = this.locales[0];
        const normalizedValue = this.normalizeValue(value);
        const messages = this.messages[primaryLocale];

        // Check namespaces in order: target namespace first, then parents
        const namespacesToCheck = [targetNamespace, ...this.getParentNamespaces(targetNamespace)];

        for (const ns of namespacesToCheck) {
            const nsData = messages[ns];
            if (!nsData || typeof nsData !== 'object') continue;

            for (const [existingKey, existingVal] of Object.entries(nsData)) {
                if (typeof existingVal === 'string' && this.normalizeValue(existingVal) === normalizedValue) {
                    return { namespace: ns, key: existingKey };
                }
            }
        }
        return null;
    }

    // Get translator variable name for a namespace
    // Primary namespace uses 't', others use tNamespace format
    getTranslatorVarName(ns, primaryNamespace) {
        if (ns === primaryNamespace) {
            return 't';
        }
        // Convert namespace to camelCase variable: common -> tCommon, ext_admin -> tExtAdmin
        const parts = ns.split('_');
        const camelCase = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
        return `t${camelCase}`;
    }

    // Get unique key for namespace, reusing existing keys with same value across related namespaces
    // Returns { namespace, key, translatorVar } to track where the key belongs
    // Logic:
    // 1. Check if value exists in target namespace OR parent namespaces (common, ext, etc.)
    // 2. If found -> reuse that key from its namespace
    // 3. If not found -> create new key in target namespace
    getUniqueKey(namespace, baseKey, value, primaryNamespace = null) {
        const primaryLocale = this.locales[0];

        // STEP 1: Check if this value already exists in any related namespace
        const existing = this.findExistingKey(namespace, value);
        if (existing) {
            const translatorVar = primaryNamespace
                ? this.getTranslatorVarName(existing.namespace, primaryNamespace)
                : 't';
            this.log(`[getUniqueKey] Reusing "${existing.key}" from ${existing.namespace} for "${value.substring(0, 30)}..."`);
            return { namespace: existing.namespace, key: existing.key, translatorVar };
        }

        // Ensure namespace exists
        if (!this.messages[primaryLocale][namespace]) {
            this.messages[primaryLocale][namespace] = {};
        }

        const namespaceObj = this.messages[primaryLocale][namespace];
        const translatorVar = primaryNamespace
            ? this.getTranslatorVarName(namespace, primaryNamespace)
            : 't';

        // STEP 2: Value doesn't exist - we need to create a new key
        // Check if baseKey is available
        if (!namespaceObj[baseKey]) {
            this.log(`[getUniqueKey] New key "${baseKey}" in ${namespace} for "${value.substring(0, 30)}..."`);
            return { namespace, key: baseKey, translatorVar };
        }

        // STEP 3: baseKey is taken by a different value, find next available suffix
        for (let i = 1; i <= 100; i++) {
            const suffixedKey = `${baseKey}_${i}`;
            if (!namespaceObj[suffixedKey]) {
                this.log(`[getUniqueKey] Suffixed key "${suffixedKey}" (baseKey "${baseKey}" taken)`);
                return { namespace, key: suffixedKey, translatorVar };
            }
        }

        return { namespace, key: `${baseKey}_${Date.now()}`, translatorVar };
    }

    // Add translation to all locale files
    addTranslation(namespace, key, value) {
        let added = false;
        for (const locale of this.locales) {
            if (!this.messages[locale][namespace]) {
                this.messages[locale][namespace] = {};
            }
            if (!this.messages[locale][namespace][key]) {
                this.messages[locale][namespace][key] = value;
                added = true;
            }
        }
        return added;
    }

    async processFile(filePath) {
        let code = await fs.readFile(filePath, 'utf8');
        let ast;

        try {
            ast = parse(code, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });
        } catch (error) {
            this.log(`Failed to parse ${filePath}: ${error.message}`);
            return { newKeysCount: 0, wasModified: false };
        }

        // First, check if file already has useTranslations with a namespace
        // Use that namespace instead of generating one
        const existingNamespaceMatch = code.match(/const\s+t\s*=\s*useTranslations\(["']([^"']+)["']\)/);
        const namespace = existingNamespaceMatch
            ? existingNamespaceMatch[1]
            : this.getNamespaceFromFile(filePath);

        // Check for empty useTranslations() that needs to be fixed
        const emptyUseTranslationsMatch = code.match(/const\s+t\s*=\s*useTranslations\(\s*\)/);
        const hasEmptyUseTranslations = emptyUseTranslationsMatch && !existingNamespaceMatch;

        const relativePath = path.relative(this.frontendDir, filePath);
        this.log(`[processFile] File: ${relativePath}`);
        this.log(`[processFile] Detected namespace: "${namespace}" (existingMatch: ${existingNamespaceMatch ? existingNamespaceMatch[1] : 'none'})`);

        const textNodesToReplace = [];
        let newKeysCount = 0;
        let hasImplicitReturns = false;
        const skippedReasons = [];

        // Traverse to find translatable text
        traverse(ast, {
            // Handle JSX text content like: <div>Hello World</div>
            JSXText: (nodePath) => {
                const value = nodePath.node.value;
                const trimmed = value.trim();

                if (!this.shouldTranslate(trimmed)) {
                    if (trimmed.length >= 2 && /[a-zA-Z]{2,}/.test(trimmed)) {
                        this.stats.textsSkipped++;
                    }
                    return;
                }
                if (this.isJSXTextWrapped(nodePath)) return;
                if (this.isInsideSrOnly(nodePath)) return;

                // Check for implicit return arrow functions
                const componentInfo = this.findEnclosingComponent(nodePath);
                if (componentInfo && componentInfo.hasImplicitReturn) {
                    hasImplicitReturns = true;
                    return;
                }

                textNodesToReplace.push({
                    type: 'jsx-text',
                    path: nodePath,
                    node: nodePath.node,
                    value: trimmed,
                    start: nodePath.node.start,
                    end: nodePath.node.end,
                    originalValue: value,
                    componentFunc: componentInfo?.func
                });
            },

            // Handle string literals in JSX attributes like: <img alt="Hello" />
            JSXAttribute: (nodePath) => {
                const attrName = nodePath.node.name?.name;
                if (!attrName || !this.translatableAttributes.includes(attrName)) return;

                const valueNode = nodePath.node.value;
                if (!t.isStringLiteral(valueNode)) return;

                const value = valueNode.value;
                if (!this.shouldTranslate(value)) {
                    if (value.length >= 2 && /[a-zA-Z]{2,}/.test(value)) {
                        this.stats.textsSkipped++;
                    }
                    return;
                }
                if (this.isInsideTranslationCall(nodePath)) return;
                if (this.isInsideSrOnly(nodePath)) return;

                // Check for implicit return arrow functions
                const componentInfo = this.findEnclosingComponent(nodePath);
                if (componentInfo && componentInfo.hasImplicitReturn) {
                    hasImplicitReturns = true;
                    return;
                }

                textNodesToReplace.push({
                    type: 'jsx-attribute',
                    path: nodePath,
                    node: valueNode,
                    value: value,
                    start: valueNode.start,
                    end: valueNode.end,
                    attrName,
                    componentFunc: componentInfo?.func
                });
            }
        });

        // Skip entire file if it has implicit returns with translatable text
        if (hasImplicitReturns) {
            this.log(`Skipping ${path.basename(filePath)}: contains implicit return arrow functions`);
            this.stats.filesSkipped++;
            return { newKeysCount: 0, wasModified: false, skipped: true };
        }

        if (textNodesToReplace.length === 0) {
            return { newKeysCount: 0, wasModified: false };
        }

        // ========================================================
        // FIRST PASS: Collect all translations and determine namespaces
        // ========================================================
        const usedNamespaces = new Map(); // namespace -> Set of keys
        const translationInfos = []; // Store info for second pass

        for (const item of textNodesToReplace) {
            const sentences = this.splitIntoSentences(item.value);

            for (const sentence of sentences) {
                const baseKey = this.generateTranslationKey(sentence.text);
                // Get key info - this tells us which namespace the key belongs to
                const keyInfo = this.getUniqueKey(namespace, baseKey, sentence.text, namespace);

                // Track namespace usage
                if (!usedNamespaces.has(keyInfo.namespace)) {
                    usedNamespaces.set(keyInfo.namespace, new Set());
                }
                usedNamespaces.get(keyInfo.namespace).add(keyInfo.key);

                translationInfos.push({
                    item,
                    sentence,
                    keyInfo
                });
            }
        }

        // Determine primary namespace (file's own namespace or most used)
        let primaryNamespace = namespace;
        if (!usedNamespaces.has(namespace)) {
            let maxKeys = 0;
            for (const [ns, keys] of usedNamespaces) {
                if (keys.size > maxKeys) {
                    maxKeys = keys.size;
                    primaryNamespace = ns;
                }
            }
        }

        // ========================================================
        // SECOND PASS: Build replacements with correct translator vars
        // ========================================================
        const modifications = [];
        const componentsNeedingT = new Map(); // funcPath -> Set of namespaces

        // Group translations by item for building replacements
        const itemTranslations = new Map();
        for (const info of translationInfos) {
            if (!itemTranslations.has(info.item)) {
                itemTranslations.set(info.item, []);
            }
            // Recalculate translator var with primary namespace
            const translatorVar = this.getTranslatorVarName(info.keyInfo.namespace, primaryNamespace);
            itemTranslations.get(info.item).push({
                ...info,
                translatorVar
            });
        }

        for (const [item, translations] of itemTranslations) {
            let replacement;
            const isJsxText = item.type === 'jsx-text';

            // Use parseTextIntoParts to properly handle multi-part text like "(7 days)"
            // This ensures: "(7 days)" -> "(7 {t("days")})" in JSX
            //              "(7 days)" -> "(" + "7 " + t("days") + ")" in attributes
            const parseContext = isJsxText ? 'jsx' : 'attribute';
            const { parts, hasMultipleParts } = parseTextIntoParts(item.value.trim(), parseContext);

            if (isJsxText) {
                const leadingMatch = item.originalValue.match(/^(\s*)/);
                const trailingMatch = item.originalValue.match(/(\s*)$/);
                const leadingSpace = leadingMatch ? leadingMatch[1] : '';
                const trailingSpace = trailingMatch ? trailingMatch[1] : '';

                if (hasMultipleParts) {
                    // Multi-part text: "(7 days)" -> "(7 {t("days")})"
                    const replacementParts = [];
                    for (const part of parts) {
                        if (part.type === 'literal') {
                            replacementParts.push(part.value);
                        } else {
                            // It's a key part - add translation and build t() call
                            const trans = translations[0]; // Use first translation info for namespace
                            if (this.addTranslation(trans.keyInfo.namespace, part.key, part.value)) {
                                newKeysCount++;
                            }
                            replacementParts.push(`{${trans.translatorVar}("${part.key}")}`);
                        }
                    }
                    replacement = `${leadingSpace}${replacementParts.join('')}${trailingSpace}`;
                } else {
                    // Simple text - just wrap in t()
                    const trans = translations[0];
                    // For simple text, use the cleaned value from the key part
                    const keyPart = parts.find(p => p.type === 'key');
                    const cleanValue = keyPart ? keyPart.value : item.value.trim();
                    if (this.addTranslation(trans.keyInfo.namespace, trans.keyInfo.key, cleanValue)) {
                        newKeysCount++;
                    }
                    replacement = `${leadingSpace}{${trans.translatorVar}("${trans.keyInfo.key}")}${trailingSpace}`;
                }
            } else if (item.type === 'jsx-attribute') {
                if (hasMultipleParts) {
                    // Multi-part attribute: "(7 days)" -> {"(" + "7 " + t("days") + ")"}
                    const replacementParts = [];
                    for (const part of parts) {
                        if (part.type === 'literal') {
                            replacementParts.push(`"${part.value}"`);
                        } else {
                            const trans = translations[0];
                            if (this.addTranslation(trans.keyInfo.namespace, part.key, part.value)) {
                                newKeysCount++;
                            }
                            replacementParts.push(`${trans.translatorVar}("${part.key}")`);
                        }
                    }
                    replacement = `{${replacementParts.join(' + ')}}`;
                } else {
                    // Simple attribute
                    const trans = translations[0];
                    const keyPart = parts.find(p => p.type === 'key');
                    const cleanValue = keyPart ? keyPart.value : item.value.trim();
                    if (this.addTranslation(trans.keyInfo.namespace, trans.keyInfo.key, cleanValue)) {
                        newKeysCount++;
                    }
                    replacement = `{${trans.translatorVar}("${trans.keyInfo.key}")}`;
                }
            }

            modifications.push({
                start: item.start,
                end: item.end,
                replacement
            });

            // Track which namespaces each component needs
            if (item.componentFunc) {
                if (!componentsNeedingT.has(item.componentFunc)) {
                    componentsNeedingT.set(item.componentFunc, new Set());
                }
                for (const trans of translations) {
                    componentsNeedingT.get(item.componentFunc).add(trans.keyInfo.namespace);
                }
            }
        }

        // Check if this is a server component
        const isServer = this.isServerComponent(ast);
        this.log(`[processFile] Is server component: ${isServer}`);

        // Check if we need to add imports
        const hasImport = isServer
            ? this.hasGetTranslationsImport(ast)
            : this.hasUseTranslationsImport(ast);

        // Add import if needed
        if (!hasImport) {
            const lastImport = this.findLastImportNode(ast);
            const insertPos = lastImport ? lastImport.end : 0;
            // Add proper spacing: newline before import, and newline after if at start of file
            const importText = isServer
                ? 'import { getTranslations } from "next-intl/server";'
                : 'import { useTranslations } from "next-intl";';
            const importStatement = lastImport
                ? '\n' + importText          // After directive/import: just newline before
                : importText + '\n';         // At start of file: newline after
            modifications.push({
                start: insertPos,
                end: insertPos,
                replacement: importStatement
            });
        }

        // Fix empty useTranslations() by adding the namespace
        if (hasEmptyUseTranslations) {
            const emptyMatch = code.match(/const\s+t\s*=\s*useTranslations\(\s*\)/);
            if (emptyMatch) {
                const matchIndex = code.indexOf(emptyMatch[0]);
                modifications.push({
                    start: matchIndex,
                    end: matchIndex + emptyMatch[0].length,
                    replacement: `const t = useTranslations("${primaryNamespace}")`
                });
                this.log(`[processFile] Fixing empty useTranslations() -> useTranslations("${primaryNamespace}")`);
            }
        }

        // Add translation declarations to components that need them
        const addedTToFunctions = new Set();
        for (const [funcPath, neededNamespaces] of componentsNeedingT) {
            const funcId = funcPath.node.start;
            if (addedTToFunctions.has(funcId)) continue;

            // Skip if we already have useTranslations or getTranslations
            if (this.functionHasT(funcPath.node)) continue;

            const bodyNode = funcPath.node.body;
            if (t.isBlockStatement(bodyNode)) {
                // Build declarations for all needed namespaces
                const declarations = [];
                // Sort namespaces: primary first, then alphabetically
                const sortedNamespaces = Array.from(neededNamespaces).sort((a, b) => {
                    if (a === primaryNamespace) return -1;
                    if (b === primaryNamespace) return 1;
                    return a.localeCompare(b);
                });

                for (const ns of sortedNamespaces) {
                    const varName = this.getTranslatorVarName(ns, primaryNamespace);
                    // Use await getTranslations for server components, useTranslations for client
                    const declaration = isServer
                        ? `const ${varName} = await getTranslations("${ns}");`
                        : `const ${varName} = useTranslations("${ns}");`;
                    declarations.push(declaration);
                }

                const insertPos = bodyNode.start + 1;
                modifications.push({
                    start: insertPos,
                    end: insertPos,
                    replacement: `\n  ${declarations.join('\n  ')}`
                });
                addedTToFunctions.add(funcId);
            }
        }

        // Sort modifications by position (descending) to apply from end to start
        modifications.sort((a, b) => b.start - a.start);

        // Apply modifications
        let newCode = code;
        for (const mod of modifications) {
            const before = newCode.slice(0, mod.start);
            const after = newCode.slice(mod.end);
            newCode = before + mod.replacement + after;
        }

        // Write modified file
        if (newCode !== code) {
            await fs.writeFile(filePath, newCode, 'utf8');
            return { newKeysCount, wasModified: true };
        }

        return { newKeysCount: 0, wasModified: false };
    }

    async extract(options = {}) {
        const { directory, limit } = options;

        await this.initialize();

        let tsxFiles = [];

        if (directory) {
            const dirPath = directory.replace(/\\/g, '/');
            this.log(`Filtering to directory: ${dirPath}`);

            const targetDir = path.join(this.frontendDir, dirPath);
            this.log(`Target directory: ${targetDir}`);

            tsxFiles = await this.findTsxFilesRecursive(targetDir);
        } else {
            const appDir = path.join(this.frontendDir, 'app');
            const componentsDir = path.join(this.frontendDir, 'components');

            const appFiles = await this.findTsxFilesRecursive(appDir);
            const componentFiles = await this.findTsxFilesRecursive(componentsDir);
            tsxFiles = [...appFiles, ...componentFiles];
        }

        this.log(`Found ${tsxFiles.length} TSX files`);

        // Apply limit
        if (limit && limit < tsxFiles.length) {
            this.log(`Limiting to ${limit} files`);
            tsxFiles = tsxFiles.slice(0, limit);
        }

        this.stats.filesProcessed = tsxFiles.length;
        this.log(`Processing ${tsxFiles.length} files...`);

        const modifiedFiles = [];

        for (const filePath of tsxFiles) {
            try {
                const result = await this.processFile(filePath);
                this.stats.keysExtracted += result.newKeysCount;
                if (result.wasModified) {
                    modifiedFiles.push(filePath);
                    this.log(`Modified: ${path.relative(this.frontendDir, filePath)} (+${result.newKeysCount} keys)`);
                }
            } catch (error) {
                this.log(`Error processing ${filePath}: ${error.message}`);
            }
        }

        await this.saveMessages();

        this.stats.filesModified = modifiedFiles.length;
        this.log(`\n--- Summary ---`);
        this.log(`Files processed: ${this.stats.filesProcessed}`);
        this.log(`Files modified: ${this.stats.filesModified}`);
        this.log(`Files skipped (implicit returns): ${this.stats.filesSkipped}`);
        this.log(`New translation keys: ${this.stats.keysExtracted}`);
        if (this.stats.textsSkipped > 0) {
            this.log(`Texts skipped (filtered): ${this.stats.textsSkipped}`);
        }

        return {
            success: true,
            stats: this.stats,
            logs: this.logs,
            modifiedFiles
        };
    }
}

module.exports = { TranslationExtractor };
