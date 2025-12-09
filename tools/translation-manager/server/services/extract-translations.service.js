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

        // Attributes that commonly contain translatable text
        this.translatableAttributes = [
            'title', 'placeholder', 'alt', 'aria-label', 'label',
            'description', 'tooltip', 'helperText', 'errorMessage',
            'successMessage', 'loadingText', 'emptyText'
        ];

        // Common non-translatable patterns
        this.skipPatterns = [
            /^[A-Z][a-z]*$/,                    // Single capitalized word that might be a component name
            /^[a-z]+[A-Z]/,                     // camelCase (likely code)
            /^[A-Z][a-z]*[A-Z]/,                // PascalCase (likely code)
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

        // === SIMPLE NAMESPACE RULES ===
        // Match existing project conventions - short namespaces like 'ext', 'nft', 'admin'

        // 1. app/[locale]/(ext)/... → 'ext'
        // 2. app/[locale]/(admin)/nft/... → 'admin.nft' or just 'admin'
        // 3. components/nft/... → 'nft'
        // 4. components/... → 'common'
        // 5. Other app routes → use the route group name

        let rel = relativeToFrontend;

        this.log(`[getNamespaceFromFile] Input: ${relativeToFrontend}`);

        // Remove app/ prefix
        if (rel.startsWith('app/')) {
            rel = rel.slice(4);
        }

        // Remove [locale]/ prefix
        rel = rel.replace(/^\[locale\]\//, '');

        // Remove filename suffixes
        rel = rel.replace(/\/(page|layout|client)\.tsx$/, '');
        rel = rel.replace(/\.tsx$/, '');

        const segments = rel.split('/').filter(Boolean);
        this.log(`[getNamespaceFromFile] Segments: [${segments.join(', ')}]`);

        // Handle components directory
        if (relativeToFrontend.startsWith('components/')) {
            // For components/nft/... → 'nft'
            // For components/charts/... → 'common' (or could use 'charts')
            // For components/pages/... → 'common'
            const componentFolder = segments[1]; // After 'components'

            // Known component namespaces that should be kept
            const knownComponentNamespaces = ['nft', 'p2p', 'ico', 'staking', 'forex', 'futures', 'binary', 'ai', 'mlm', 'ecommerce', 'blog'];
            if (componentFolder && knownComponentNamespaces.includes(componentFolder.toLowerCase())) {
                return componentFolder.toLowerCase();
            }

            return 'common';
        }

        // Handle app directory routes
        if (segments.length > 0) {
            const firstSeg = segments[0];

            // Route groups like (ext), (admin), (user)
            if (firstSeg.startsWith('(') && firstSeg.endsWith(')')) {
                const routeGroup = firstSeg.slice(1, -1); // Remove parentheses
                this.log(`[getNamespaceFromFile] Route group detected: ${routeGroup}`);

                // Check if there's a sub-route that's significant
                // e.g., (admin)/nft → 'admin.nft'
                if (segments.length > 1) {
                    const subRoute = segments[1];
                    this.log(`[getNamespaceFromFile] Sub-route: ${subRoute}`);
                    // Skip dynamic segments like [id]
                    if (!subRoute.startsWith('[') && !subRoute.endsWith(']')) {
                        // Known sub-namespaces
                        const knownSubNamespaces = ['nft', 'p2p', 'ico', 'staking', 'forex', 'futures', 'binary', 'ai', 'mlm', 'ecommerce', 'blog', 'wallet', 'exchange', 'deposit', 'withdraw'];
                        if (knownSubNamespaces.includes(subRoute.toLowerCase())) {
                            // For admin pages with sub-routes, use dot notation: admin.nft
                            if (routeGroup === 'admin') {
                                this.log(`[getNamespaceFromFile] → Returning: admin.${subRoute.toLowerCase()}`);
                                return `admin.${subRoute.toLowerCase()}`;
                            }
                            // For ext or user, just use the route group
                            this.log(`[getNamespaceFromFile] → Returning route group: ${routeGroup}`);
                            return routeGroup;
                        } else {
                            this.log(`[getNamespaceFromFile] Sub-route "${subRoute}" not in knownSubNamespaces`);
                        }
                    }
                }

                this.log(`[getNamespaceFromFile] → Returning route group: ${routeGroup}`);
                return routeGroup;
            }

            // Non-grouped routes - use first segment
            return firstSeg.toLowerCase();
        }

        return 'common';
    }

    // Check if text is inside a t() call or similar translation function
    isInsideTranslationCall(nodePath) {
        let current = nodePath.parentPath;
        while (current) {
            if (current.isCallExpression()) {
                const callee = current.node.callee;
                // Check for t(), t.raw(), t.rich(), t.markup()
                if (t.isIdentifier(callee, { name: 't' })) {
                    return true;
                }
                if (t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.object, { name: 't' })) {
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
        // Check for {t("key")} pattern
        if (t.isCallExpression(expr) && t.isIdentifier(expr.callee, { name: 't' })) {
            return true;
        }
        // Check for {t.raw("key")} etc
        if (t.isCallExpression(expr) &&
            t.isMemberExpression(expr.callee) &&
            t.isIdentifier(expr.callee.object, { name: 't' })) {
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
        const skipAbbreviations = [
            'N/A', 'n/a', 'N.A.', 'TBD', 'TBA', 'TODO', 'FIXME', 'WIP',
            'OK', 'OK.', 'ID', 'URL', 'URI', 'API', 'UI', 'UX',
            'vs', 'vs.', 'etc', 'etc.', 'e.g.', 'i.e.',
            'AM', 'PM', 'UTC', 'GMT',
            'USD', 'EUR', 'GBP', 'BTC', 'ETH',
            'KB', 'MB', 'GB', 'TB',
            'px', 'em', 'rem', '%',
        ];
        if (skipAbbreviations.includes(trimmed) || skipAbbreviations.includes(trimmed.toUpperCase())) {
            return false;
        }

        // Skip text that's just 1-3 uppercase letters (likely abbreviations/codes)
        if (/^[A-Z]{1,3}$/.test(trimmed)) return false;

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

        return true;
    }

    // Split text into sentences for translation
    // Returns array of {text, hasTrailingSpace} objects
    splitIntoSentences(text) {
        // Helper to trim trailing punctuation/whitespace that shouldn't be in translation values
        // Removes: comma, semicolon, colon, whitespace from the end
        const trimTrailingPunctuation = (str) => {
            return str.trim().replace(/[,;:\s]+$/, '');
        };

        // Don't split if text is short enough
        if (text.length <= 80) {
            return [{ text: trimTrailingPunctuation(text), hasTrailingSpace: false }];
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
            return [{ text: trimTrailingPunctuation(text), hasTrailingSpace: false }];
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

    // Check if a function body already has `const t = useTranslations(...)`
    functionHasT(funcNode) {
        if (!funcNode.body || !funcNode.body.body) return false;

        for (const stmt of funcNode.body.body) {
            if (t.isVariableDeclaration(stmt)) {
                for (const decl of stmt.declarations) {
                    if (t.isIdentifier(decl.id, { name: 't' }) &&
                        t.isCallExpression(decl.init) &&
                        t.isIdentifier(decl.init.callee, { name: 'useTranslations' })) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Generate a snake_case key from text
    // IMPORTANT: Keys must NOT contain periods as they're interpreted as namespace separators
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

        // If key starts with a number, prefix with underscore
        if (/^\d/.test(key)) {
            key = '_' + key;
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

        // Ensure key doesn't start with special chars after all processing
        key = key.replace(/^[^a-z_]+/g, '');

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

    // Get unique key for namespace, reusing existing keys with same value
    // Logic:
    // 1. If value already exists in namespace -> return that existing key
    // 2. If value doesn't exist -> return baseKey (or baseKey_N if baseKey is taken)
    getUniqueKey(namespace, baseKey, value) {
        const primaryLocale = this.locales[0];

        // Ensure namespace exists
        if (!this.messages[primaryLocale][namespace]) {
            this.messages[primaryLocale][namespace] = {};
        }

        const namespaceObj = this.messages[primaryLocale][namespace];
        const normalizedValue = this.normalizeValue(value);
        const keyCount = Object.keys(namespaceObj).length;

        // STEP 1: Check if this value already exists in the namespace
        // Scan ALL entries to find exact value match (case-insensitive)
        for (const [existingKey, existingVal] of Object.entries(namespaceObj)) {
            if (typeof existingVal === 'string') {
                const normalizedExisting = this.normalizeValue(existingVal);
                if (normalizedExisting === normalizedValue) {
                    this.log(`[getUniqueKey] Reusing "${existingKey}" for "${value}" in ${namespace} (${keyCount} keys)`);
                    return existingKey;
                }
            }
        }

        // STEP 2: Value doesn't exist - we need to create a new key
        // Check if baseKey is available
        if (!namespaceObj[baseKey]) {
            this.log(`[getUniqueKey] New key "${baseKey}" for "${value}" in ${namespace} (${keyCount} keys)`);
            return baseKey;
        }

        // STEP 3: baseKey is taken by a different value, find next available suffix
        for (let i = 1; i <= 100; i++) {
            const suffixedKey = `${baseKey}_${i}`;
            if (!namespaceObj[suffixedKey]) {
                this.log(`[getUniqueKey] Suffixed key "${suffixedKey}" for "${value}" (baseKey "${baseKey}" taken by "${namespaceObj[baseKey]}")`);
                return suffixedKey;
            }
        }

        return `${baseKey}_${Date.now()}`;
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

        // Prepare modifications
        const modifications = [];
        const componentsNeedingT = new Set();

        for (const item of textNodesToReplace) {
            // Split multi-sentence text into separate translations
            const sentences = this.splitIntoSentences(item.value);

            let replacement;
            if (item.type === 'jsx-text') {
                // For JSX text, preserve leading/trailing whitespace AND punctuation from original
                const leadingMatch = item.originalValue.match(/^(\s*)/);
                const trailingMatch = item.originalValue.match(/(\s*)$/);
                const leadingSpace = leadingMatch ? leadingMatch[1] : '';
                const trailingSpace = trailingMatch ? trailingMatch[1] : '';

                // Capture trailing punctuation that was stripped (comma, semicolon, colon)
                const trimmedValue = item.value.trim();
                const trailingPunctMatch = trimmedValue.match(/([,;:]+)$/);
                const trailingPunct = trailingPunctMatch ? trailingPunctMatch[1] : '';

                // Build replacement with multiple t() calls if needed
                const tCalls = [];
                for (const sentence of sentences) {
                    const baseKey = this.generateTranslationKey(sentence.text);
                    const finalKey = this.getUniqueKey(namespace, baseKey, sentence.text);

                    // Add translation
                    if (this.addTranslation(namespace, finalKey, sentence.text)) {
                        newKeysCount++;
                    }

                    tCalls.push(`{t("${finalKey}")}`);
                }

                // Join with space between sentences, add back trailing punctuation
                replacement = `${leadingSpace}${tCalls.join(' ')}${trailingPunct}${trailingSpace}`;
            } else if (item.type === 'jsx-attribute') {
                // For attributes, if multiple sentences, join them with template literal
                if (sentences.length > 1) {
                    const parts = [];
                    for (const sentence of sentences) {
                        const baseKey = this.generateTranslationKey(sentence.text);
                        const finalKey = this.getUniqueKey(namespace, baseKey, sentence.text);

                        if (this.addTranslation(namespace, finalKey, sentence.text)) {
                            newKeysCount++;
                        }

                        parts.push(`\${t("${finalKey}")}`);
                    }
                    // Use template literal for multiple sentences in attribute
                    replacement = '{`' + parts.join(' ') + '`}';
                } else {
                    const baseKey = this.generateTranslationKey(sentences[0].text);
                    const finalKey = this.getUniqueKey(namespace, baseKey, sentences[0].text);

                    if (this.addTranslation(namespace, finalKey, sentences[0].text)) {
                        newKeysCount++;
                    }

                    replacement = `{t("${finalKey}")}`;
                }
            }

            modifications.push({
                start: item.start,
                end: item.end,
                replacement
            });

            // Track which component functions need `const t = useTranslations(...)`
            if (item.componentFunc) {
                componentsNeedingT.add(item.componentFunc);
            }
        }

        // Check if we need to add imports and t declaration
        const hasImport = this.hasUseTranslationsImport(ast);

        // Add import if needed
        if (!hasImport) {
            const lastImport = this.findLastImportNode(ast);
            const insertPos = lastImport ? lastImport.end : 0;
            modifications.push({
                start: insertPos,
                end: insertPos,
                replacement: '\nimport { useTranslations } from "next-intl";'
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
                    replacement: `const t = useTranslations("${namespace}")`
                });
                this.log(`[processFile] Fixing empty useTranslations() -> useTranslations("${namespace}")`);
            }
        }

        // Add t declaration to components that need it (only once per component)
        const addedTToFunctions = new Set();
        for (const funcPath of componentsNeedingT) {
            // Use function start position as unique identifier
            const funcId = funcPath.node.start;
            if (addedTToFunctions.has(funcId)) continue;

            // Skip if we already have useTranslations (with or without namespace - we fix empty ones above)
            if (this.functionHasT(funcPath.node)) continue;

            const bodyNode = funcPath.node.body;
            if (t.isBlockStatement(bodyNode)) {
                const insertPos = bodyNode.start + 1; // After the opening {
                modifications.push({
                    start: insertPos,
                    end: insertPos,
                    replacement: `\n  const t = useTranslations("${namespace}");`
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
