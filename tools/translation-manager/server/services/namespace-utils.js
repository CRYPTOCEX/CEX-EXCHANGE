/**
 * Namespace Utility Functions
 *
 * Shared utilities for working with the multi-namespace translation system.
 * This module provides functions to:
 * - Load namespace structure from en.json
 * - Map keys to their namespaces
 * - Determine which namespaces a file needs based on its translation keys
 * - Generate translator variable names (t, tCommon, tExt, etc.)
 */

const fs = require('fs/promises');
const path = require('path');

// Cache for namespace data
let cachedNamespaceData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Load namespace structure from en.json and build key-to-namespace map
 * @returns {Promise<{keyToNamespace: Map, namespaces: Set, messages: Object}>}
 */
async function loadNamespaceStructure(messagesDir) {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedNamespaceData && (now - cacheTimestamp) < CACHE_TTL) {
        return cachedNamespaceData;
    }

    const filePath = path.join(messagesDir, 'en.json');
    const content = await fs.readFile(filePath, 'utf8');
    const messages = JSON.parse(content);

    const keyToNamespace = new Map();
    const namespaces = new Set(Object.keys(messages));

    for (const [namespace, keys] of Object.entries(messages)) {
        if (typeof keys === 'object' && keys !== null) {
            for (const [key, value] of Object.entries(keys)) {
                // Only map flat string values, skip nested objects like menu
                if (typeof value === 'string') {
                    keyToNamespace.set(key, namespace);
                }
            }
        }
    }

    cachedNamespaceData = { keyToNamespace, namespaces, messages };
    cacheTimestamp = now;

    return cachedNamespaceData;
}

/**
 * Clear the namespace cache (call after modifying translation files)
 */
function clearNamespaceCache() {
    cachedNamespaceData = null;
    cacheTimestamp = 0;
}

/**
 * Get path segments from a file path for namespace determination
 * @param {string} filePath - Full file path
 * @param {string} frontendDir - Path to frontend directory
 * @returns {string[]} Array of path segments
 */
function getPathSegments(filePath, frontendDir) {
    const relative = path.relative(frontendDir, filePath).replace(/\\/g, '/');

    // Handle app directory
    const appMatch = relative.match(/^app\/\[locale\]\/(.+)/);
    if (appMatch) {
        let segments = appMatch[1].split('/').filter(Boolean);

        // Remove file names
        segments = segments.filter(s => !s.endsWith('.tsx') && !s.endsWith('.ts'));

        // Clean up segments
        segments = segments.map(s => {
            if (s.startsWith('(') && s.endsWith(')')) {
                return s.slice(1, -1); // (ext) -> ext
            }
            if (s.startsWith('[') && s.endsWith(']')) {
                return null; // Skip dynamic segments
            }
            return s;
        }).filter(Boolean);

        return segments.length > 0 ? segments : ['common'];
    }

    // Handle components directory
    const compMatch = relative.match(/^components\/(.+)/);
    if (compMatch) {
        const parts = compMatch[1].split('/').filter(Boolean);
        parts.pop(); // Remove file name
        return ['components', ...parts.map(p => p.replace(/[()[\]]/g, ''))];
    }

    return ['common'];
}

/**
 * Build namespace string from path segments
 * @param {string[]} segments
 * @param {number} maxDepth - Maximum namespace depth
 * @returns {string}
 */
function buildNamespaceFromSegments(segments, maxDepth = 2) {
    const limited = segments.slice(0, maxDepth);
    return limited.join('_');
}

/**
 * Generate translator variable name from namespace
 * @param {string} namespace
 * @param {boolean} isPrimary - If true, returns 't'
 * @returns {string}
 */
function getTranslatorVarName(namespace, isPrimary = false) {
    if (isPrimary) return 't';

    // Convert namespace to camelCase variable name
    // common -> tCommon
    // ext_affiliate -> tExtAffiliate
    const parts = namespace.split(/[-_]/);
    const camelCase = parts.map((p, i) =>
        i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)
    ).join('');

    return 't' + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * Determine which namespaces a file needs based on the keys it uses
 * @param {Set<string>} keysUsed - Translation keys used in the file
 * @param {Map<string, string>} keyToNamespace - Map of key to namespace
 * @returns {{primary: string, secondary: Array<{namespace: string, varName: string, keys: string[]}>, keyToVar: Map<string, string>}}
 */
function determineFileNamespaces(keysUsed, keyToNamespace) {
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
        return { primary: 'common', secondary: [], keyToVar: new Map(), missingKeys };
    }

    // Sort namespaces by key count (most keys = primary)
    const sorted = Array.from(namespaceKeys.entries())
        .sort((a, b) => b[1].length - a[1].length);

    const primary = sorted[0][0];
    const secondary = sorted.slice(1).map(([ns, keys]) => ({
        namespace: ns,
        varName: getTranslatorVarName(ns, false),
        keys
    }));

    // Build key to variable map
    const keyToVar = new Map();
    for (const key of sorted[0][1]) {
        keyToVar.set(key, 't');
    }
    for (const { namespace, varName, keys } of secondary) {
        for (const key of keys) {
            keyToVar.set(key, varName);
        }
    }

    return { primary, secondary, keyToVar, missingKeys };
}

/**
 * Generate useTranslations declarations for a file
 * @param {string} primary - Primary namespace
 * @param {Array} secondary - Secondary namespace info
 * @returns {string[]} Array of declaration strings
 */
function generateUseTranslationsDeclarations(primary, secondary) {
    const declarations = [`const t = useTranslations("${primary}");`];

    for (const { namespace, varName } of secondary) {
        declarations.push(`const ${varName} = useTranslations("${namespace}");`);
    }

    return declarations;
}

/**
 * Parse text into translatable parts, separating common prefixes and suffixes
 *
 * For 'attribute' context (definitions like title:, description:):
 *   "(7 days)" -> "(" + "7 " + t("days") + ")"
 *   Parts: [{ type: 'literal', value: '(' }, { type: 'literal', value: '7 ' }, { type: 'key', value: 'days', key: 'days' }, { type: 'literal', value: ')' }]
 *
 * For 'jsx' context (JSX text content):
 *   "(7 days)" -> (7 {t("days")})
 *   Parts: [{ type: 'literal', value: '(7 ' }, { type: 'key', value: 'days', key: 'days' }, { type: 'literal', value: ')' }]
 *   The JSX context merges adjacent literals for cleaner output
 *
 * Other examples:
 * "e.g., Trade Crypto" -> [{ type: 'key', value: 'e.g.', key: 'eg' }, { type: 'literal', value: ', ' }, { type: 'key', value: 'Trade Crypto', key: 'trade_crypto' }]
 * "# Backend logs" -> [{ type: 'literal', value: '# ' }, { type: 'key', value: 'Backend logs', key: 'backend_logs' }]
 * "List item 1" -> [{ type: 'key', value: 'List item', key: 'list_item' }, { type: 'literal', value: ' 1' }]
 *
 * @param {string} text
 * @param {string} context - 'attribute' for string concatenation, 'jsx' for JSX text replacement
 * @returns {{ parts: Array<{type: 'key'|'literal', value: string, key?: string}>, hasMultipleParts: boolean }}
 */
function parseTextIntoParts(text, context = 'attribute') {
    if (!text || typeof text !== 'string') {
        return { parts: [{ type: 'key', value: text, key: '' }], hasMultipleParts: false };
    }

    const trimmed = text.trim();
    const parts = [];

    // Check for parenthetical text: "(something)" or "(number text)" or "(text)"
    const parenMatch = trimmed.match(/^\((.+)\)$/);
    if (parenMatch) {
        const innerText = parenMatch[1].trim();

        // Check if inner text starts with a number like "7 days", "30 days", "0 = Free"
        const numberPrefixMatch = innerText.match(/^(\d+\s*[=]?\s*)(.+)$/);
        if (numberPrefixMatch) {
            const numberPart = numberPrefixMatch[1]; // "7 " or "0 = "
            const textPart = numberPrefixMatch[2].trim(); // "days" or "Free"

            if (context === 'jsx') {
                // For JSX: merge opening paren with number prefix
                parts.push({ type: 'literal', value: '(' + numberPart });
            } else {
                // For attributes: keep separate for string concatenation
                parts.push({ type: 'literal', value: '(' });
                parts.push({ type: 'literal', value: numberPart });
            }

            if (textPart.length > 0) {
                const mainKey = generateTranslationKeySimple(textPart);
                parts.push({ type: 'key', value: textPart, key: mainKey });
            }
        } else {
            // No number prefix, just translatable text inside parens
            parts.push({ type: 'literal', value: '(' });
            const mainKey = generateTranslationKeySimple(innerText);
            parts.push({ type: 'key', value: innerText, key: mainKey });
        }

        parts.push({ type: 'literal', value: ')' });

        return {
            parts,
            hasMultipleParts: parts.length > 1
        };
    }

    // Common prefixes that should be separated (reusable keys)
    const prefixPatterns = [
        { pattern: /^(e\.g\.),?\s*/i, key: 'eg', literal: ', ' },           // e.g., or e.g.
        { pattern: /^(i\.e\.),?\s*/i, key: 'ie', literal: ', ' },           // i.e., or i.e.
        { pattern: /^(etc\.),?\s*/i, key: 'etc', literal: ', ' },           // etc., or etc.
        { pattern: /^(#\d*)\s+/i, key: null, literal: null },               // # or #1, #2 (keep as literal)
        { pattern: /^(\*)\s*/i, key: null, literal: null },                 // * bullet point
        { pattern: /^(-)\s+/i, key: null, literal: null },                  // - bullet point
        { pattern: /^(note:)\s*/i, key: 'note', literal: ': ' },            // Note:
        { pattern: /^(warning:)\s*/i, key: 'warning', literal: ': ' },      // Warning:
        { pattern: /^(tip:)\s*/i, key: 'tip', literal: ': ' },              // Tip:
        { pattern: /^(example:)\s*/i, key: 'example', literal: ': ' },      // Example:
    ];

    let remaining = trimmed;
    let foundPrefix = false;

    // Check for prefix patterns
    for (const { pattern, key, literal } of prefixPatterns) {
        const match = remaining.match(pattern);
        if (match) {
            const prefixValue = match[1];
            const fullMatch = match[0];

            if (key) {
                // It's a translatable prefix like "e.g."
                parts.push({ type: 'key', value: prefixValue, key });
                if (literal) {
                    parts.push({ type: 'literal', value: literal });
                }
            } else {
                // It's a literal prefix like "#" or "*"
                parts.push({ type: 'literal', value: fullMatch });
            }

            remaining = remaining.slice(fullMatch.length);
            foundPrefix = true;
            break;
        }
    }

    // Check for trailing number (already implemented logic)
    const trailingNumMatch = remaining.match(/^(.+?)\s+(\d+)$/);
    if (trailingNumMatch) {
        const baseText = trailingNumMatch[1].trim();
        const number = trailingNumMatch[2];

        // Only strip if base text is meaningful (not a technical term)
        const technicalPatterns = [
            /^(erc|bep|trc|v|version|v\d+)/i,
            /^\d+[a-z]/i,
            /^[a-z]+\d+$/i,
        ];

        if (baseText.length >= 2 && !technicalPatterns.some(p => p.test(baseText))) {
            // Add main text as translatable key
            const mainKey = generateTranslationKeySimple(baseText);
            parts.push({ type: 'key', value: baseText, key: mainKey });
            // Add trailing number as literal
            parts.push({ type: 'literal', value: ' ' + number });
        } else {
            // Keep as single key
            const mainKey = generateTranslationKeySimple(remaining);
            parts.push({ type: 'key', value: remaining, key: mainKey });
        }
    } else if (remaining.length > 0) {
        // No trailing number, add remaining as single key
        const mainKey = generateTranslationKeySimple(remaining);
        parts.push({ type: 'key', value: remaining, key: mainKey });
    }

    return {
        parts,
        hasMultipleParts: parts.length > 1
    };
}

/**
 * Simple key generation without recursion (used by parseTextIntoParts)
 */
function generateTranslationKeySimple(text) {
    if (!text) return 'text';

    let key = text
        .toLowerCase()
        .trim()
        .replace(/^[^\w\s]+/g, '')
        .replace(/['"""''`]/g, '')
        .replace(/\.\.\./g, '_ellipsis_')
        .replace(/\./g, '_')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    if (/^\d/.test(key)) {
        key = 'n_' + key;
    }

    if (key.length > 50) {
        const words = key.split('_').filter(Boolean);
        if (words.length > 6) {
            key = words.slice(0, 6).join('_');
        } else {
            key = key.substring(0, 50).replace(/_$/, '');
        }
    }

    key = key.replace(/\./g, '_');
    key = key.replace(/^[^a-z_]+/g, '');

    if (!key || /^\d/.test(key)) {
        key = 'n_' + (key || 'text');
    }

    return key || 'text';
}

/**
 * Strip trailing numbers from text to create deduplicated translation keys
 * "List item 1" -> "List item"
 * "Step 2" -> "Step"
 * "Option 10" -> "Option"
 * But preserve meaningful numbers like "24h volume", "2FA", "365 days"
 * @param {string} text
 * @returns {{baseText: string, hasTrailingNumber: boolean, number: string|null}}
 */
function stripTrailingNumber(text) {
    if (!text || typeof text !== 'string') {
        return { baseText: text, hasTrailingNumber: false, number: null };
    }

    const trimmed = text.trim();

    // Pattern: text followed by space(s) and a number at the end
    // "List item 1" -> "List item" + "1"
    // "Step 2" -> "Step" + "2"
    const trailingNumMatch = trimmed.match(/^(.+?)\s+(\d+)$/);

    if (trailingNumMatch) {
        const baseText = trailingNumMatch[1].trim();
        const number = trailingNumMatch[2];

        // Don't strip if the base text is very short (likely a meaningful pattern)
        // e.g., "24h" should stay as "24h", not become "24" with trailing "h"
        if (baseText.length < 2) {
            return { baseText: trimmed, hasTrailingNumber: false, number: null };
        }

        // Don't strip if it looks like a technical term with numbers
        // e.g., "ERC 20", "BEP 721", "2FA", "24h volume"
        const technicalPatterns = [
            /^(erc|bep|trc|v|version|v\d+)/i,  // Token standards
            /^\d+[a-z]/i,                       // Numbers followed by letters (24h, 2FA)
            /^[a-z]+\d+$/i,                     // Letters followed by numbers only
        ];
        if (technicalPatterns.some(p => p.test(baseText))) {
            return { baseText: trimmed, hasTrailingNumber: false, number: null };
        }

        return { baseText, hasTrailingNumber: true, number };
    }

    return { baseText: trimmed, hasTrailingNumber: false, number: null };
}

/**
 * Generate a snake_case translation key from text
 * Now with optimization to strip trailing numbers for deduplication
 * @param {string} text
 * @param {Object} options
 * @param {boolean} options.stripNumbers - Whether to strip trailing numbers (default: true)
 * @returns {string}
 */
function generateTranslationKey(text, options = {}) {
    const { stripNumbers = true } = options;

    // First, optionally strip trailing numbers for deduplication
    let processedText = text;
    if (stripNumbers) {
        const { baseText } = stripTrailingNumber(text);
        processedText = baseText;
    }

    let key = processedText
        .toLowerCase()
        .trim()
        // Remove leading special characters/symbols/emojis that shouldn't start a key
        .replace(/^[^\w\s]+/g, '')
        .replace(/['"""''`]/g, '')           // Remove quotes
        .replace(/\.\.\./g, '_ellipsis_')    // Handle ellipsis specially (CRITICAL for "...")
        .replace(/\./g, '_')                 // Replace periods with underscores (CRITICAL)
        .replace(/[^\w\s-]/g, ' ')           // Replace non-word chars with space
        .replace(/\s+/g, '_')                // Replace spaces with underscores
        .replace(/-+/g, '_')                 // Replace dashes with underscores
        .replace(/_+/g, '_')                 // Collapse multiple underscores
        .replace(/^_|_$/g, '');              // Trim leading/trailing underscores

    // If key starts with a number, prefix with 'n_' (better than just underscore for valid identifiers)
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

    // Ensure key doesn't start with special chars after all processing
    key = key.replace(/^[^a-z_]+/g, '');

    // Final safety check - if key is empty or still starts with number, prefix with n_
    if (!key || /^\d/.test(key)) {
        key = 'n_' + (key || 'text');
    }

    return key || 'text';
}

/**
 * Correct a bad key (e.g., keys starting with underscore followed by number)
 * @param {string} key
 * @returns {string}
 */
function correctBadKey(key) {
    // If key starts with underscore followed by number, replace with 'n_'
    if (/^_\d/.test(key)) {
        return 'n' + key; // _24h_volume -> n_24h_volume
    }

    // If key starts with just a number (shouldn't happen but just in case)
    if (/^\d/.test(key)) {
        return 'n_' + key;
    }

    // For other cases, use the standard generateTranslationKey
    return generateTranslationKey(key);
}

/**
 * Generate a human-readable value from a snake_case key
 * IMPORTANT: Does NOT include periods in the output
 * Periods should be added as plain text {". "} in the code, not in translations
 * @param {string} key
 * @returns {string}
 */
function keyToReadableValue(key) {
    return key
        .replace(/_ellipsis_/g, '...')       // Restore ellipsis (special case)
        .replace(/[-_]/g, ' ')               // Replace separators with spaces
        .replace(/\b\w/g, (match, offset, string) => {
            // Only capitalize if it's the first letter or follows a space (not an apostrophe)
            if (offset === 0 || string[offset - 1] === ' ') {
                return match.toUpperCase();
            }
            return match;
        })
        .replace(/\.\s*/g, '')               // Remove periods - they should be in code, not translations
        .trim();
}

/**
 * Check if a text value should be skipped (not extracted as translation)
 * These are values like emails, URLs, pure numbers, currency codes that should be literal text
 * @param {string} value
 * @returns {boolean}
 */
function shouldSkipForExtraction(value) {
    if (!value || typeof value !== 'string') return true;
    const trimmed = value.trim();
    if (trimmed.length < 2) return true;

    // Skip text starting with special punctuation (likely partial/broken text)
    // Examples: "), or", "% of target", "+ tax"
    if (/^[),;:+%&|]/.test(trimmed)) return true;

    // Skip text ending with special punctuation that suggests incomplete text
    // Examples: "Tokens (", "something +", "text &", "MB)"
    if (/[+&|()\[\]]$/.test(trimmed)) return true;

    // Skip path-like patterns with ... (ellipsis in paths)
    // Examples: ".../metadata/", "src/.../file"
    if (/\.{2,}.*\//.test(trimmed) || /\/.*\.{2,}/.test(trimmed)) return true;

    // API key patterns: (pk_*), (sk_*), pk_live_*, sk_test_*, etc.
    if (/\b[ps]k_[*\w]*\b/i.test(trimmed)) return true;

    // Wildcard patterns in parentheses: (*), (something_*)
    if (/^\([^)]*\*[^)]*\)$/.test(trimmed)) return true;

    // Currency codes in parentheses: (ETH), (BTC), (USD), (APR). etc.
    // Matches: (XXX) or (XXX). where XXX is 2-6 uppercase letters
    // Strip trailing punctuation before checking
    const withoutTrailingPunct = trimmed.replace(/[.,;:!?]+$/, '');
    if (/^\([A-Z]{2,6}\)$/.test(withoutTrailingPunct)) return true;

    // Email addresses - should use literal text, not translations
    if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/.test(trimmed)) return true;

    // URLs (full or partial, including gateway URLs ending with /)
    if (/^https?:\/\//i.test(trimmed)) return true;

    // Partial URLs or URL-like patterns (paths with slashes and domain patterns)
    // Examples: "ipfs://", "/ipfs/...", "gateway.pinata.cloud/ipfs/", "ipfs.io/ipfs/..."
    if (/^(ipfs|https?):\/\//.test(trimmed)) return true;
    if (/\.(cloud|io|com|net|org)\//.test(trimmed)) return true;
    if (/\/ipfs\//.test(trimmed)) return true;
    // Strings containing URL protocols anywhere (e.g., "ipfs://Qm... or https://gateway...")
    if (/(ipfs|https?):\/\//.test(trimmed)) return true;

    // Pure numbers and percentages
    if (/^\d+(\.\d+)?%?$/.test(trimmed)) return true;

    // Numbers with currency symbols
    if (/^[$€£¥₹]?\d+([.,]\d+)?%?$/.test(trimmed)) return true;

    // File paths (absolute or relative, Windows or Unix style)
    // Absolute paths starting with / or \
    if (/^[\/\\]/.test(trimmed)) return true;
    // Windows absolute paths like C:\path\to\file
    if (/^[A-Z]:\\/.test(trimmed)) return true;
    // Paths with backslashes (Windows style) like frontend\app\[locale]
    if (/\\[a-zA-Z_\[\]\(\)\-\.]+\\/.test(trimmed)) return true;
    // Paths that contain bracketed segments like [locale], (ext), etc. with slashes
    if (/[\[(\]][a-zA-Z_\-]+[\])]/.test(trimmed) && /[\/\\]/.test(trimmed)) return true;
    // Unix-style paths with multiple segments like frontend/app/ or src/components/
    if (/^[a-zA-Z_][\w\-]*\/[\w\-\/\[\]\(\)\.]+/.test(trimmed)) return true;

    // Template literals
    if (/^\{.*\}$/.test(trimmed)) return true;

    // File extensions (e.g., .jpg, file.ext)
    if (/^[a-z]+\.[a-z]+$/i.test(trimmed)) return true;

    // Cryptocurrency and fiat currency codes (uppercase 2-5 letter codes)
    // Common crypto: BTC, ETH, USDT, USDC, BNB, SOL, MATIC, XRP, ADA, DOT, AVAX, etc.
    // Common fiat: USD, EUR, GBP, JPY, CNY, KRW, INR, AUD, CAD, CHF, etc.
    const currencyCodes = [
        // Major cryptocurrencies
        'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'MATIC', 'XRP', 'ADA', 'DOT',
        'AVAX', 'DOGE', 'SHIB', 'LTC', 'LINK', 'UNI', 'ATOM', 'XLM', 'ALGO', 'VET',
        'FIL', 'AAVE', 'EOS', 'XTZ', 'THETA', 'XMR', 'NEO', 'MKR', 'COMP', 'SNX',
        'SUSHI', 'YFI', 'CRV', 'BAL', 'REN', 'KSM', 'WAVES', 'DASH', 'ZEC', 'QTUM',
        'ONT', 'ZIL', 'BAT', 'ENJ', 'MANA', 'SAND', 'AXS', 'GALA', 'APE', 'GMT',
        'OP', 'ARB', 'SUI', 'SEI', 'TIA', 'INJ', 'PYTH', 'JUP', 'W', 'STRK',
        'WBTC', 'WETH', 'STETH', 'RETH', 'CBETH', 'DAI', 'FRAX', 'LUSD', 'TUSD', 'BUSD',
        'TRX', 'TON', 'NEAR', 'APT', 'ICP', 'FTM', 'HBAR', 'EGLD', 'FLOW', 'KLAY',
        // Major fiat currencies
        'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'INR', 'AUD', 'CAD', 'CHF',
        'HKD', 'SGD', 'NZD', 'SEK', 'NOK', 'DKK', 'MXN', 'BRL', 'RUB', 'ZAR',
        'TRY', 'PLN', 'THB', 'IDR', 'MYR', 'PHP', 'VND', 'AED', 'SAR', 'TWD',
        // Common trading pairs suffixes
        'PERP', 'SPOT', 'SWAP'
    ];
    if (currencyCodes.includes(trimmed.toUpperCase())) return true;

    // Generic pattern for currency-like codes: 2-6 uppercase letters
    // This catches new currencies not in the list above
    if (/^[A-Z]{2,6}$/.test(trimmed)) return true;

    // Blockchain network names (should not be translated)
    const blockchainNetworks = [
        'Ethereum', 'Bitcoin', 'Solana', 'Polygon', 'Arbitrum', 'Optimism',
        'Avalanche', 'BNB Chain', 'Base', 'zkSync', 'Linea', 'Scroll',
        'Fantom', 'Cronos', 'Gnosis', 'Celo', 'Moonbeam', 'Harmony',
        'Klaytn', 'Aurora', 'Metis', 'Boba', 'Moonriver', 'Evmos',
        'Mainnet', 'Testnet', 'Devnet', 'Goerli', 'Sepolia', 'Mumbai'
    ];
    if (blockchainNetworks.some(net => trimmed.toLowerCase() === net.toLowerCase())) return true;

    // Token standards and technical terms
    const technicalTerms = [
        'ERC-20', 'ERC-721', 'ERC-1155', 'ERC20', 'ERC721', 'ERC1155',
        'BEP-20', 'BEP-721', 'BEP20', 'BEP721', 'SPL', 'TRC-20', 'TRC20',
        'NFT', 'DeFi', 'DEX', 'CEX', 'AMM', 'LP', 'TVL', 'APY', 'APR',
        'HODL', 'FOMO', 'FUD', 'ATH', 'ATL', 'ROI', 'P2P', 'OTC',
        'KYC', 'AML', 'DAO', 'ICO', 'IDO', 'IEO', 'STO', 'IPO'
    ];
    if (technicalTerms.some(term => trimmed.toUpperCase() === term.toUpperCase())) return true;

    // Ethereum/Blockchain address placeholders (0x..., 0x0000...)
    if (/^0x[.0-9a-fA-F]*$/.test(trimmed)) return true;

    // Hash/ID placeholders (e.g., "abc...", "Qm...")
    if (/^[a-zA-Z0-9]{2,6}\.{2,}$/.test(trimmed)) return true;

    // Size dimensions (e.g., "500x500", "1920x1080")
    if (/^\d+x\d+$/.test(trimmed)) return true;

    // Format specifications (e.g., "PNG/JPG", "MP4/WEBM")
    if (/^[A-Z]{2,5}\/[A-Z]{2,5}$/i.test(trimmed)) return true;

    return false;
}

/**
 * Check if a key is valid for translation (proper snake_case format)
 * @param {string} key
 * @returns {boolean}
 */
function isValidTranslationKey(key) {
    // Key must be valid identifier parts separated by dots
    // e.g., "ext.my_key" is valid, "ext.My Key..." is not
    if (!key) return false;

    // Split into namespace and key parts
    const parts = key.split('.');
    if (parts.length < 1) return false;

    // Each part must be a valid identifier (snake_case)
    for (const part of parts) {
        if (!part) return false;
        // Valid part: starts with letter or underscore, contains only alphanumeric and underscores
        // Also allow n_ prefix for numeric keys
        if (!/^[a-zA-Z_n][a-zA-Z0-9_]*$/.test(part)) {
            return false;
        }
    }

    return true;
}

/**
 * Strip comments from code content while preserving string literals
 * This prevents false positives from t() calls inside comments
 * @param {string} content - The source code content
 * @returns {string} Content with comments replaced by whitespace (preserves line numbers)
 */
function stripComments(content) {
    let result = '';
    let i = 0;
    const len = content.length;

    while (i < len) {
        // Check for string literals (preserve them)
        if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
            const quote = content[i];
            result += content[i++];

            while (i < len) {
                if (content[i] === '\\' && i + 1 < len) {
                    // Escape sequence - copy both chars
                    result += content[i++];
                    if (i < len) result += content[i++];
                } else if (content[i] === quote) {
                    result += content[i++];
                    break;
                } else if (quote === '`' && content[i] === '$' && content[i + 1] === '{') {
                    // Template literal interpolation - handle nested braces
                    result += content[i++];
                    result += content[i++];
                    let braceDepth = 1;
                    while (i < len && braceDepth > 0) {
                        if (content[i] === '{') braceDepth++;
                        else if (content[i] === '}') braceDepth--;
                        result += content[i++];
                    }
                } else {
                    result += content[i++];
                }
            }
        }
        // Check for single-line comment
        else if (content[i] === '/' && content[i + 1] === '/') {
            // Replace comment with spaces until end of line (preserves positions)
            while (i < len && content[i] !== '\n') {
                result += ' ';
                i++;
            }
        }
        // Check for multi-line comment
        else if (content[i] === '/' && content[i + 1] === '*') {
            result += '  '; // Replace /* with spaces
            i += 2;
            while (i < len) {
                if (content[i] === '*' && content[i + 1] === '/') {
                    result += '  '; // Replace */ with spaces
                    i += 2;
                    break;
                }
                // Preserve newlines for line number accuracy
                result += content[i] === '\n' ? '\n' : ' ';
                i++;
            }
        }
        // Regular character
        else {
            result += content[i++];
        }
    }

    return result;
}

/**
 * Normalize a value for comparison
 * @param {string} value
 * @returns {string}
 */
function normalizeValue(value) {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .toLowerCase()
        .replace(/[\s\u00A0]+/g, ' ')
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        .replace(/\s+/g, ' ');
}

/**
 * Check if a key already exists with the same value
 * @param {Object} namespaceObj - The namespace object from messages
 * @param {string} baseKey - The key to check
 * @param {string} value - The value to compare
 * @returns {string|null} Existing key if found, null otherwise
 */
function findExistingKey(namespaceObj, value) {
    const normalizedValue = normalizeValue(value);

    for (const [existingKey, existingVal] of Object.entries(namespaceObj)) {
        if (typeof existingVal === 'string') {
            if (normalizeValue(existingVal) === normalizedValue) {
                return existingKey;
            }
        }
    }

    return null;
}

/**
 * Get a unique key for a namespace
 * @param {Object} namespaceObj - The namespace object
 * @param {string} baseKey - Base key name
 * @param {string} value - The value
 * @returns {string}
 */
function getUniqueKey(namespaceObj, baseKey, value) {
    // First check if value already exists
    const existingKey = findExistingKey(namespaceObj, value);
    if (existingKey) {
        return existingKey;
    }

    // Check if baseKey is available
    if (!namespaceObj[baseKey]) {
        return baseKey;
    }

    // Find next available suffix
    for (let i = 1; i <= 100; i++) {
        const suffixedKey = `${baseKey}_${i}`;
        if (!namespaceObj[suffixedKey]) {
            return suffixedKey;
        }
    }

    return `${baseKey}_${Date.now()}`;
}

module.exports = {
    loadNamespaceStructure,
    clearNamespaceCache,
    getPathSegments,
    buildNamespaceFromSegments,
    getTranslatorVarName,
    determineFileNamespaces,
    generateUseTranslationsDeclarations,
    generateTranslationKey,
    parseTextIntoParts,
    stripTrailingNumber,
    correctBadKey,
    keyToReadableValue,
    shouldSkipForExtraction,
    isValidTranslationKey,
    stripComments,
    normalizeValue,
    findExistingKey,
    getUniqueKey
};
