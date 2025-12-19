const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

/**
 * Patterns that indicate a value should potentially be split or is problematic
 * Each pattern has: regex, description, severity (high/medium/low)
 *
 * IMPORTANT: These patterns are tuned to minimize false positives.
 * Common UI text patterns like "Save & Publish", "(Optional)", "e.g. something" are allowed.
 */
const BAD_PATTERNS = [
    // === HIGH SEVERITY - Should definitely be fixed ===

    // Number-prefixed keys - values starting with numbers should be split
    // e.g., "100 per page" → 100 + t('per_page'), "2FA status" → "2FA " + t('status')
    { regex: /^\d+[A-Z]*\s+/, desc: 'number_prefix (split number from text)', severity: 'high', type: 'number_prefix' },

    // Email addresses - should NOT be translated, use literal text
    { regex: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/, desc: 'email address (use literal)', severity: 'high' },

    // URLs - should NOT be translated
    { regex: /^https?:\/\/[^\s]+$/, desc: 'URL (use literal)', severity: 'high' },

    // Pure numbers/percentages - should be dynamic variables, not hardcoded
    { regex: /^\d+%?$/, desc: 'pure number (use variable)', severity: 'high' },
    { regex: /^[$€£¥₹]?\d+([.,]\d+)?%?$/, desc: 'hardcoded amount (use variable)', severity: 'high' },

    // Parentheses with LONG content (>30 chars) - short parentheses like (Optional), (seconds), (KB) are OK
    { regex: /\([^)]{30,}\)/, desc: 'long parentheses content', severity: 'high' },

    // Value entirely wrapped in parentheses (with optional trailing punctuation)
    // e.g., "(the user executing the order)." should be "the user executing the order"
    { regex: /^\([^)]+\)[.!?]?$/, desc: 'value wrapped in parentheses', severity: 'high', type: 'wrapped_parens', autofix: true },

    // Square brackets - usually code/regex, not UI text
    { regex: /\[[^\]]+\]/, desc: 'square brackets []', severity: 'high' },

    // Semicolon - multiple statements (rare in UI)
    { regex: /;/, desc: 'semicolon', severity: 'high' },

    // Pipe character - often separators
    { regex: /\|/, desc: 'pipe |', severity: 'high' },

    // Backslash (except in paths)
    { regex: /\\(?![nrt])/, desc: 'backslash', severity: 'high' },

    // Newlines - definitely should be split
    { regex: /\n/, desc: 'contains newline', severity: 'high' },

    // Tab characters
    { regex: /\t/, desc: 'contains tab', severity: 'high' },

    // Bullet points at start
    { regex: /^[\s]*[•●○◦‣⁃]\s/, desc: 'bullet point', severity: 'high' },
    { regex: /\n[\s]*[•●○◦‣⁃]\s/, desc: 'inline bullet', severity: 'high' },

    // Numbered lists at start
    { regex: /^\d+[\.\)]\s/, desc: 'numbered list', severity: 'high' },
    { regex: /\n\d+[\.\)]\s/, desc: 'inline numbered list', severity: 'high' },

    // HTML tags (actual tags, not entities)
    { regex: /<[a-zA-Z][^>]*>/, desc: 'contains HTML tag', severity: 'high' },

    // NOTE: Multiple sentences (2 sentences) are ALLOWED - common in UI messages like
    // "No authors found. Be the first to contribute!" or "We're working on new content. Check back soon!"
    // Only flag 3+ sentences as those likely need splitting
    // This is handled in findBadPatterns() with custom logic, not here

    // === MEDIUM SEVERITY - Should probably be fixed ===

    // Curly braces (not ICU format like {count}) - problematic unless it's a variable
    { regex: /\{[^}]*[^a-zA-Z0-9_}][^}]*\}/, desc: 'curly braces with special chars', severity: 'medium' },

    // Equals sign at start or in config-like patterns (API_KEY=, name=value)
    { regex: /^[A-Z_]+=|=\s*$/, desc: 'config-like equals', severity: 'medium' },

    // Double dash
    { regex: /--/, desc: 'double dash --', severity: 'medium' },

    // Multiple spaces (3+ consecutive) - formatting issues
    { regex: /\s{3,}/, desc: 'multiple spaces', severity: 'medium' },

    // Email in text (not pure email) - might need splitting
    { regex: /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}/, desc: 'contains email', severity: 'medium' },

    // URL in text (not pure URL)
    { regex: /https?:\/\/[^\s]+/, desc: 'contains URL', severity: 'medium' },
];

/**
 * Whitelist patterns - these are OK and should not be flagged
 */
const WHITELIST_PATTERNS = [
    // ICU message format variables like {count}, {name}
    /^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/,
    // Simple time formats like 12:30, 12:30:00
    /^\d{1,2}:\d{2}(:\d{2})?$/,
    // Simple date formats
    /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/,
    // Version numbers like v1.0, 2.0.1
    /^v?\d+\.\d+(\.\d+)?$/,
    // Simple ratios like 16:9, 4:3
    /^\d+:\d+$/,
    // Short values (less than 5 chars) - too short to be problematic
    /^.{1,4}$/,
];

/**
 * Context-aware exclusions - patterns that are OK in specific contexts
 */
const CONTEXT_EXCLUSIONS = [
    // "e.g." followed by examples is OK
    /e\.g\.\s/i,
    // "i.e." is OK
    /i\.e\.\s/i,
    // Trading pairs like BTC/USDT are OK
    /^[A-Z]{2,5}\/[A-Z]{2,5}$/,
    // File extensions like .pdf, .jpg
    /\.[a-z]{2,4}$/i,
];

/**
 * Check if entire value matches a whitelist pattern
 */
function isWhitelisted(value) {
    const trimmed = value.trim();
    return WHITELIST_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if value matches any context exclusion pattern
 */
function hasContextExclusion(value) {
    return CONTEXT_EXCLUSIONS.some(pattern => pattern.test(value));
}

/**
 * Parse a number-prefixed value and suggest how to split it
 * e.g., "100 per page" → { numberPart: "100", textPart: "per page", suggestedKey: "per_page" }
 * e.g., "2FA status" → { numberPart: "2FA", textPart: "status", suggestedKey: "status" }
 * e.g., "3D rotation" → { numberPart: "3D", textPart: "rotation", suggestedKey: "rotation" }
 * e.g., "200+ countries" → { numberPart: "200+", textPart: "countries", suggestedKey: "countries" }
 */
function parseNumberPrefixedValue(value) {
    if (!value || typeof value !== 'string') return null;

    // Match patterns like: "100 per page", "2FA status", "3D rotation", "200+ countries"
    // Pattern: digits optionally followed by uppercase letters or +, then whitespace, then text
    const match = value.match(/^(\d+[A-Z]*\+?)\s+(.+)$/i);
    if (!match) return null;

    const numberPart = match[1];
    const textPart = match[2];

    // Generate a suggested key from the text part
    const suggestedKey = textPart
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .trim()
        .replace(/\s+/g, '_'); // Replace spaces with underscores

    return {
        numberPart,
        textPart,
        suggestedKey,
        // Code replacement suggestion
        codeReplacement: `\`${numberPart} \${t('${suggestedKey}')}\``
    };
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Normalize a value for comparison (lowercase, trim, collapse whitespace)
 */
function normalizeValue(value) {
    if (!value) return '';
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, ''); // Remove punctuation for comparison
}

/**
 * Check if a value contains problematic patterns that suggest it should be split
 * Returns array of { issue: string, severity: string }
 */
function findBadPatterns(value) {
    if (!value || typeof value !== 'string') return [];

    // Skip if whitelisted (short values, simple formats, etc.)
    if (isWhitelisted(value)) return [];

    // Skip if it matches context exclusions (e.g., trading pairs, examples)
    if (hasContextExclusion(value)) return [];

    const issues = [];
    const foundDescs = new Set(); // Avoid duplicate descriptions

    for (const pattern of BAD_PATTERNS) {
        if (pattern.regex.test(value) && !foundDescs.has(pattern.desc)) {
            const issueObj = {
                issue: pattern.desc,
                severity: pattern.severity
            };

            // For number_prefix patterns, add parsed info for auto-fix
            if (pattern.type === 'number_prefix') {
                const parsed = parseNumberPrefixedValue(value);
                if (parsed) {
                    issueObj.numberPrefixInfo = parsed;
                }
            }

            issues.push(issueObj);
            foundDescs.add(pattern.desc);
        }
    }

    // Check for very long values (>300 chars likely need splitting)
    if (value.length > 300) {
        issues.push({
            issue: `very long (${value.length} chars)`,
            severity: 'medium'
        });
    }

    // Custom sentence detection - only flag 3+ sentences as needing split
    // 2 sentences are common in UI: "No items found. Add one to get started!"
    const sentencePattern = /(?<![eE]\.g|[iI]\.e|vs|etc|Mr|Mrs|Dr|St|No|Fig)\.\s+[A-Z]/g;
    const sentenceMatches = value.match(sentencePattern);
    const sentenceCount = sentenceMatches ? sentenceMatches.length + 1 : 1;

    if (sentenceCount >= 3) {
        issues.push({
            issue: `${sentenceCount} sentences (consider splitting)`,
            severity: 'medium'
        });
    }

    // Sort by severity (high first)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
}

/**
 * Fast hash for grouping potentially similar strings
 * Groups strings by length range and first few characters
 */
function getSimilarityBucket(str) {
    if (!str) return 'empty';
    const lengthBucket = Math.floor(str.length / 10) * 10; // 0-9, 10-19, 20-29, etc.
    const prefix = str.substring(0, 3).toLowerCase();
    return `${lengthBucket}_${prefix}`;
}

/**
 * Optimized Levenshtein with early termination
 * Returns -1 if distance exceeds maxDistance (for performance)
 */
function levenshteinWithLimit(str1, str2, maxDistance) {
    const len1 = str1.length;
    const len2 = str2.length;

    // Quick length check - if length difference exceeds max, skip
    if (Math.abs(len1 - len2) > maxDistance) return -1;

    // Use single array instead of matrix for memory efficiency
    let prevRow = new Array(len2 + 1);
    let currRow = new Array(len2 + 1);

    for (let j = 0; j <= len2; j++) {
        prevRow[j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        currRow[0] = i;
        let minInRow = currRow[0];

        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,
                currRow[j - 1] + 1,
                prevRow[j - 1] + cost
            );
            minInRow = Math.min(minInRow, currRow[j]);
        }

        // Early termination if minimum in row exceeds threshold
        if (minInRow > maxDistance) return -1;

        // Swap rows
        [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[len2] <= maxDistance ? prevRow[len2] : -1;
}

/**
 * Fast similarity check with early termination
 */
function isSimilarFast(str1, str2, threshold = 0.85) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return true;

    // Calculate maximum allowed edit distance for this threshold
    const maxDistance = Math.floor(longer.length * (1 - threshold));

    const distance = levenshteinWithLimit(longer.toLowerCase(), shorter.toLowerCase(), maxDistance);
    return distance !== -1;
}

function createOptimizeKeysRoutes(api, getTsxFiles) {

    /**
     * Helper function to sync English keys to all other locales
     * Call this after any operation that modifies locale files
     * Returns sync stats
     */
    async function syncLocalesToEnglish() {
        const enLocale = api.locales.get('en');
        if (!enLocale) {
            console.warn('[SYNC] English locale not found, skipping sync');
            return { keysSynced: 0, localesUpdated: 0 };
        }

        let keysSynced = 0;
        let localesUpdated = 0;

        for (const [localeCode, locale] of api.locales.entries()) {
            if (localeCode === 'en') continue;

            let localeModified = false;
            let keysAddedToThisLocale = 0;

            for (const [key, enValue] of Object.entries(enLocale.keys)) {
                if (!locale.keys[key]) {
                    locale.keys[key] = enValue;
                    keysSynced++;
                    keysAddedToThisLocale++;
                    localeModified = true;
                }
            }

            if (localeModified) {
                await api.saveLocale(localeCode);
                localesUpdated++;
                console.log(`[AUTO-SYNC] Added ${keysAddedToThisLocale} keys to ${localeCode}`);
            }
        }

        if (keysSynced > 0) {
            console.log(`[AUTO-SYNC] Total: ${keysSynced} keys synced to ${localesUpdated} locales`);
        }

        return { keysSynced, localesUpdated };
    }

    // Analyze all keys for problems
    router.get('/analyze', async (req, res) => {
        try {
            const startTime = Date.now();
            const skipDuplicates = req.query.skipDuplicates === 'true';

            await api.loadLocales();

            const enLocale = api.locales.get('en');
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }

            const entries = Object.entries(enLocale.keys);
            const totalKeys = entries.length;

            const badValues = [];
            const valueToKeys = new Map();
            const namespaces = new Set();
            let keyIndex = 0;

            console.log(`[ANALYZE] Starting analysis of ${totalKeys} keys...`);

            // Phase 1: Analyze all keys for bad patterns (fast)
            for (const [fullKey, value] of entries) {
                const dotIndex = fullKey.indexOf('.');
                const namespace = dotIndex > -1 ? fullKey.substring(0, dotIndex) : fullKey;
                const key = dotIndex > -1 ? fullKey.substring(dotIndex + 1) : '';
                namespaces.add(namespace);

                // Skip menu namespace - has its own processing logic
                if (namespace === 'menu') continue;

                // Skip ext_* namespaces nav keys - menu translations that must stay in their form
                if (namespace.startsWith('ext_') && key.startsWith('nav.')) continue;

                if (!value || typeof value !== 'string') continue;

                // Check for bad patterns
                const issues = findBadPatterns(value);
                if (issues.length > 0) {
                    const severities = issues.map(i => i.severity);
                    const highestSeverity = severities.includes('high') ? 'high' :
                                           severities.includes('medium') ? 'medium' : 'low';

                    // Check if any issue has numberPrefixInfo
                    const numberPrefixIssue = issues.find(i => i.numberPrefixInfo);

                    const badValueEntry = {
                        id: `bad_${keyIndex++}`,
                        namespace,
                        key,
                        fullKey,
                        value,
                        issues: issues.map(i => i.issue),
                        severities: issues.map(i => i.severity),
                        highestSeverity
                    };

                    // Add number prefix info if available for auto-fix
                    if (numberPrefixIssue) {
                        badValueEntry.numberPrefixInfo = numberPrefixIssue.numberPrefixInfo;
                    }

                    badValues.push(badValueEntry);
                }

                // Group by normalized value for duplicate detection (skip if requested)
                if (!skipDuplicates) {
                    const normalizedValue = normalizeValue(value);
                    if (normalizedValue.length > 5) {
                        if (!valueToKeys.has(normalizedValue)) {
                            valueToKeys.set(normalizedValue, []);
                        }
                        valueToKeys.get(normalizedValue).push({ namespace, key, fullKey, value });
                    }
                }
            }

            console.log(`[ANALYZE] Phase 1 complete: ${badValues.length} bad values found in ${Date.now() - startTime}ms`);

            let duplicateGroups = [];

            if (!skipDuplicates) {
                // Phase 2: Find exact duplicates (fast)
                // BUT filter out context-specific duplicates that shouldn't be merged
                const processedValues = new Set();
                let groupIndex = 0;

                // Generic values that are context-dependent and should NOT be merged across different namespaces
                const contextDependentValues = new Set([
                    'name', 'description', 'status', 'actions', 'type', 'date', 'amount',
                    'title', 'created', 'updated', 'delete', 'edit', 'view', 'save', 'cancel',
                    'id', 'email', 'phone', 'address', 'image', 'url', 'link', 'price',
                    'quantity', 'total', 'active', 'inactive', 'enabled', 'disabled',
                    'yes', 'no', 'true', 'false', 'on', 'off', 'open', 'close', 'closed',
                    'created at', 'updated at', 'created_at', 'updated_at', 'slug'
                ]);

                // Function to get the "domain" from a namespace (e.g., admin_blog_tag -> blog, ext_forex -> forex)
                function getNamespaceDomain(namespace) {
                    // Extract meaningful parts: admin_blog_tag -> blog_tag, ext_forex_account -> forex_account
                    const parts = namespace.split('_');
                    // Skip common prefixes like admin, ext, common, components
                    const skipPrefixes = ['admin', 'ext', 'common', 'components', 'dashboard', 'pages'];
                    const meaningful = parts.filter(p => !skipPrefixes.includes(p));
                    return meaningful.join('_') || namespace;
                }

                // Function to check if keys from different domains should be merged
                function shouldMergeKeys(keys, normalizedValue) {
                    // If the value is context-dependent, only merge within similar domains
                    if (contextDependentValues.has(normalizedValue.toLowerCase())) {
                        const domains = new Set(keys.map(k => getNamespaceDomain(k.namespace)));
                        // If there are multiple different domains, don't auto-merge
                        if (domains.size > 1) {
                            // Check if domains are related (e.g., both contain 'blog')
                            const domainList = [...domains];
                            const commonDomain = domainList.every(d =>
                                domainList[0].includes(d.split('_')[0]) ||
                                d.includes(domainList[0].split('_')[0])
                            );
                            if (!commonDomain) {
                                return false;
                            }
                        }
                    }
                    return true;
                }

                for (const [normalizedValue, keys] of valueToKeys.entries()) {
                    if (keys.length > 1 && !processedValues.has(normalizedValue)) {
                        processedValues.add(normalizedValue);

                        // Filter: Don't merge context-dependent values across unrelated namespaces
                        if (!shouldMergeKeys(keys, normalizedValue)) {
                            continue;
                        }

                        const commonKey = keys.find(k => k.namespace === 'common');
                        const suggestedKey = commonKey || keys[0];

                        duplicateGroups.push({
                            id: `dup_${groupIndex++}`,
                            value: keys[0].value,
                            keys: keys,
                            similarity: 1.0,
                            suggestedNamespace: 'common',
                            suggestedKey: suggestedKey.key,
                            type: 'exact'
                        });
                    }
                }

                console.log(`[ANALYZE] Phase 2 complete: ${duplicateGroups.length} exact duplicates in ${Date.now() - startTime}ms`);

                // Phase 3: DISABLED - Only using 100% exact matches now
                // Near-duplicate matching (85% similarity) was causing issues like
                // merging "category" with "categories" (single vs plural)
                console.log(`[ANALYZE] Phase 3 skipped: Only exact matches enabled (100% similarity required)`);
            }

            const totalTime = Date.now() - startTime;
            console.log(`[ANALYZE] Analysis complete in ${totalTime}ms`);

            res.json({
                success: true,
                stats: {
                    totalKeys,
                    badValues: badValues.length,
                    duplicateGroups: duplicateGroups.length,
                    analysisTimeMs: totalTime
                },
                namespaces: [...namespaces].sort(),
                badValues,
                duplicateGroups
            });

        } catch (error) {
            console.error('Analyze keys error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * Process a single batch with Claude agent
     * Returns a promise that resolves with actionable fixes
     */
    function processBatchWithAgent(batch, batchIndex) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');

            const prompt = `TASK: Fix these problematic translation values. For each key, decide the best action.

ISSUES TO FIX:
${batch.map((k, i) => `
[${i}] Key: "${k.fullKey}"
Value: "${k.value}"
Issues: ${k.issues.join(', ')}
`).join('\n')}

For EACH key, respond with ONE of these actions:

1. "clean" - Just clean up the value (remove extra whitespace, normalize)
   Use when: value has formatting issues but doesn't need splitting

2. "split" - Split into multiple new keys
   Use when: value contains multiple distinct pieces of info that should be separate

3. "remove" - Delete this key (it's not a real translation)
   Use when: value is an email, URL, pure number, or non-translatable content

4. "keep" - Keep as-is, no changes needed
   Use when: the flagged issue is actually acceptable

RESPOND with JSON object:
{
  "fixes": [
    {
      "originalKey": "namespace.key_name",
      "action": "clean|split|remove|keep",
      "cleanedValue": "cleaned value here", // for action=clean
      "newKeys": [ // for action=split
        { "key": "namespace.new_key_1", "value": "First part" },
        { "key": "namespace.new_key_2", "value": "Second part" }
      ],
      "codeReplacement": "t('namespace.new_key_1') + ' ' + t('namespace.new_key_2')", // for action=split
      "reason": "brief explanation"
    }
  ]
}

JSON response:`;

            const claudeProcess = spawn('claude', [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                windowsHide: true,
                env: {
                    ...process.env,
                    CLAUDE_CODE_MAX_OUTPUT_TOKENS: '16000'
                }
            });

            let output = '';
            let error = '';

            const timeoutId = setTimeout(() => {
                claudeProcess.kill();
                reject(new Error(`Agent ${batchIndex + 1} timed out`));
            }, 120000); // 2 minutes per agent

            claudeProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            claudeProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            claudeProcess.on('close', (code) => {
                clearTimeout(timeoutId);

                if (code !== 0) {
                    console.error(`Agent ${batchIndex + 1} error:`, error);
                    reject(new Error(`Agent ${batchIndex + 1} failed: ${error}`));
                    return;
                }

                try {
                    // Parse Claude's response
                    let processedOutput = output.trim();

                    // Remove markdown code blocks
                    processedOutput = processedOutput.replace(/^```json\s*/i, '');
                    processedOutput = processedOutput.replace(/^```\s*/i, '');
                    processedOutput = processedOutput.replace(/\s*```\s*$/i, '');
                    processedOutput = processedOutput.replace(/```json\s*\n/gi, '');
                    processedOutput = processedOutput.replace(/\n\s*```/gi, '');

                    // Find JSON object
                    if (processedOutput.includes('{') && !processedOutput.trim().startsWith('{')) {
                        processedOutput = processedOutput.substring(processedOutput.indexOf('{'));
                    }
                    if (processedOutput.includes('}')) {
                        processedOutput = processedOutput.substring(0, processedOutput.lastIndexOf('}') + 1);
                    }

                    const result = JSON.parse(processedOutput);
                    const fixes = result.fixes || [];

                    // Normalize fixes - ensure each has required fields
                    const normalizedFixes = fixes.map(fix => ({
                        originalKey: fix.originalKey,
                        action: fix.action || 'keep',
                        cleanedValue: fix.cleanedValue || null,
                        newKeys: Array.isArray(fix.newKeys) ? fix.newKeys : [],
                        codeReplacement: fix.codeReplacement || null,
                        reason: fix.reason || ''
                    }));

                    resolve({
                        batchIndex,
                        fixes: normalizedFixes,
                        keysProcessed: batch.length
                    });

                } catch (parseError) {
                    console.error(`Agent ${batchIndex + 1} parse error:`, parseError);
                    console.error('Raw output:', output.substring(0, 500));
                    // Return partial success - batch failed but don't break entire process
                    resolve({
                        batchIndex,
                        fixes: [],
                        keysProcessed: 0,
                        error: parseError.message
                    });
                }
            });

            claudeProcess.stdin.write(prompt);
            claudeProcess.stdin.end();
        });
    }

    /**
     * Auto-fix a key with a known pattern (no AI needed)
     * Returns a fix object or null if no auto-fix applies
     */
    function tryAutoFix(key) {
        const { fullKey, value, issues } = key;

        // Check for "value wrapped in parentheses" pattern
        // e.g., "(the user executing the order)." -> "the user executing the order"
        if (issues && issues.includes('value wrapped in parentheses')) {
            const match = value.match(/^\(([^)]+)\)[.!?]?$/);
            if (match) {
                const cleanedValue = match[1];
                // Determine the wrapper to use in code based on trailing punctuation
                const trailingPunct = value.match(/[.!?]$/) ? value.slice(-1) : '';
                return {
                    originalKey: fullKey,
                    action: 'clean_with_code_wrap',
                    cleanedValue: cleanedValue,
                    codeWrapper: { prefix: '(', suffix: ')' + trailingPunct },
                    reason: 'Value was entirely wrapped in parentheses - cleaned value and code should wrap t() call'
                };
            }
        }

        return null;
    }

    // Fix bad values using Claude - parallel agents
    router.post('/fix-bad-values', async (req, res) => {
        try {
            const { keys, maxAgents = 5, batchSize = 10, applyFixes = true } = req.body;

            if (!keys || !Array.isArray(keys) || keys.length === 0) {
                return res.status(400).json({ error: 'Keys array is required' });
            }

            // First, try auto-fixes for keys with known patterns
            const autoFixes = [];
            const keysNeedingAI = [];

            for (const key of keys) {
                const autoFix = tryAutoFix(key);
                if (autoFix) {
                    autoFixes.push(autoFix);
                } else {
                    keysNeedingAI.push(key);
                }
            }

            console.log(`[FIX-BAD-VALUES] Auto-fixed ${autoFixes.length} keys, ${keysNeedingAI.length} need AI`);

            // Split remaining keys into batches for AI processing
            const batches = [];
            for (let i = 0; i < keysNeedingAI.length; i += batchSize) {
                batches.push(keysNeedingAI.slice(i, i + batchSize));
            }

            console.log(`[FIX-BAD-VALUES] Processing ${keysNeedingAI.length} keys in ${batches.length} batches with up to ${maxAgents} parallel agents`);

            // Process batches in parallel, but limit concurrent agents
            const allFixes = [...autoFixes];
            let totalProcessed = autoFixes.length;
            let totalErrors = 0;

            // Process in waves of maxAgents
            for (let wave = 0; wave < batches.length; wave += maxAgents) {
                const waveBatches = batches.slice(wave, wave + maxAgents);
                const wavePromises = waveBatches.map((batch, idx) =>
                    processBatchWithAgent(batch, wave + idx)
                );

                console.log(`[FIX-BAD-VALUES] Starting wave ${Math.floor(wave / maxAgents) + 1}: ${waveBatches.length} agents`);

                // Wait for all agents in this wave to complete
                const waveResults = await Promise.allSettled(wavePromises);

                for (const result of waveResults) {
                    if (result.status === 'fulfilled') {
                        const { fixes, keysProcessed, error } = result.value;
                        if (error) {
                            totalErrors++;
                        }
                        if (fixes && fixes.length > 0) {
                            allFixes.push(...fixes);
                        }
                        totalProcessed += keysProcessed || 0;
                    } else {
                        console.error('Agent failed:', result.reason);
                        totalErrors++;
                    }
                }
            }

            console.log(`[FIX-BAD-VALUES] AI analysis complete. Got ${allFixes.length} fixes.`);

            // Stats for tracking what we did
            let keysRemoved = 0;
            let keysCleaned = 0;
            let keysSplit = 0;
            let keysKept = 0;
            let newKeysCreated = 0;
            const modifiedJsonFiles = new Set();
            const modifiedTsxFiles = new Set();
            const appliedChanges = [];

            if (applyFixes && allFixes.length > 0) {
                // Load locales for modification
                await api.loadLocales();

                // Get TSX/TS files for code updates
                const tsxFiles = await getTsxFiles();
                const tsFiles = await getTsxFiles('**/*.ts');
                const allCodeFiles = [...new Set([...tsxFiles, ...tsFiles])];

                // Process each fix
                for (const fix of allFixes) {
                    const { originalKey, action, cleanedValue, newKeys, codeReplacement, reason } = fix;

                    if (!originalKey) continue;

                    const dotIndex = originalKey.indexOf('.');
                    const namespace = dotIndex > -1 ? originalKey.substring(0, dotIndex) : originalKey;
                    const keyName = dotIndex > -1 ? originalKey.substring(dotIndex + 1) : '';

                    try {
                        switch (action) {
                            case 'remove': {
                                // Remove key from all locale files
                                for (const [localeCode, locale] of api.locales.entries()) {
                                    if (locale.keys[originalKey]) {
                                        delete locale.keys[originalKey];
                                        modifiedJsonFiles.add(localeCode);
                                    }
                                }
                                keysRemoved++;
                                appliedChanges.push({
                                    type: 'remove',
                                    key: originalKey,
                                    reason
                                });
                                break;
                            }

                            case 'clean': {
                                // Update value in all locale files (only English for now, others keep their translations)
                                if (cleanedValue) {
                                    const enLocale = api.locales.get('en');
                                    if (enLocale && enLocale.keys[originalKey]) {
                                        enLocale.keys[originalKey] = cleanedValue;
                                        modifiedJsonFiles.add('en');
                                        keysCleaned++;
                                        appliedChanges.push({
                                            type: 'clean',
                                            key: originalKey,
                                            oldValue: keys.find(k => k.fullKey === originalKey)?.value,
                                            newValue: cleanedValue,
                                            reason
                                        });
                                    }
                                }
                                break;
                            }

                            case 'split': {
                                if (newKeys && newKeys.length > 0) {
                                    // Add new keys to all locales
                                    for (const [localeCode, locale] of api.locales.entries()) {
                                        const oldValue = locale.keys[originalKey];

                                        // Add new keys
                                        for (const newKey of newKeys) {
                                            if (!locale.keys[newKey.key]) {
                                                // For English, use the provided value
                                                // For other locales, mark as needing translation
                                                if (localeCode === 'en') {
                                                    locale.keys[newKey.key] = newKey.value;
                                                } else {
                                                    // Try to preserve existing translation logic or mark for translation
                                                    locale.keys[newKey.key] = newKey.value; // Will need translation
                                                }
                                                newKeysCreated++;
                                            }
                                        }

                                        // Remove the original key
                                        if (locale.keys[originalKey]) {
                                            delete locale.keys[originalKey];
                                        }

                                        modifiedJsonFiles.add(localeCode);
                                    }

                                    // Update TSX files if codeReplacement is provided
                                    if (codeReplacement && keyName) {
                                        // Convert namespace to function name: ext_admin -> tExtAdmin
                                        function toFunctionName(ns) {
                                            return 't' + ns.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                                        }
                                        const patternFunctionName = toFunctionName(namespace);

                                        // Check if file uses this namespace (client or server components)
                                        const clientNamespacePattern = new RegExp(`useTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);
                                        const serverNamespacePattern = new RegExp(`getTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);

                                        // Pattern to find t('keyName') - search by keyName NOT fullKey
                                        const escapedKeyName = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const keyPattern = new RegExp(
                                            `t\\w*\\s*\\(\\s*['"\`]${escapedKeyName}['"\`]\\s*\\)`,
                                            'g'
                                        );

                                        for (const codeFile of allCodeFiles) {
                                            try {
                                                let content = await fs.readFile(codeFile, 'utf-8');

                                                // Check if file uses this namespace (client or server)
                                                const usesNamespace = clientNamespacePattern.test(content) ||
                                                    serverNamespacePattern.test(content) ||
                                                    content.includes(patternFunctionName);

                                                if (!usesNamespace) continue;

                                                if (keyPattern.test(content)) {
                                                    keyPattern.lastIndex = 0; // Reset regex

                                                    // Replace the t() call with the new code
                                                    content = content.replace(keyPattern, codeReplacement);
                                                    await fs.writeFile(codeFile, content, 'utf-8');
                                                    modifiedTsxFiles.add(codeFile);
                                                    console.log(`[FIX-BAD-VALUES] Updated t('${keyName}') → ${codeReplacement} in ${codeFile.replace(/.*[\/\\]frontend[\/\\]/, '')}`);
                                                }
                                            } catch (err) {
                                                console.error(`Error updating code file ${codeFile}:`, err.message);
                                            }
                                        }
                                    }

                                    keysSplit++;
                                    appliedChanges.push({
                                        type: 'split',
                                        key: originalKey,
                                        newKeys: newKeys.map(k => k.key),
                                        codeReplacement,
                                        reason
                                    });
                                }
                                break;
                            }

                            case 'clean_with_code_wrap': {
                                // Auto-fix: Clean the value and update code to wrap t() call
                                // e.g., "(the user executing the order)." -> "the user executing the order"
                                // Code: t('key') -> (t('key')).
                                if (fix.cleanedValue && fix.codeWrapper) {
                                    const { prefix, suffix } = fix.codeWrapper;

                                    // Update value in ALL locale files (set to cleaned English value for re-translation)
                                    for (const [localeCode, locale] of api.locales.entries()) {
                                        if (locale.keys[originalKey]) {
                                            locale.keys[originalKey] = fix.cleanedValue;
                                            modifiedJsonFiles.add(localeCode);
                                        }
                                    }

                                    // Update TSX files to wrap t() call with the codeWrapper
                                    const dotIndex2 = originalKey.indexOf('.');
                                    const namespace2 = dotIndex2 > -1 ? originalKey.substring(0, dotIndex2) : originalKey;
                                    const keyName2 = dotIndex2 > -1 ? originalKey.substring(dotIndex2 + 1) : '';

                                    if (keyName2) {
                                        // Convert namespace to function name: ext_admin -> tExtAdmin
                                        function toFunctionName2(ns) {
                                            return 't' + ns.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                                        }
                                        const patternFunctionName2 = toFunctionName2(namespace2);

                                        // Check if file uses this namespace (client or server components)
                                        const clientNamespacePattern2 = new RegExp(`useTranslations\\s*\\(\\s*['"\`]${namespace2}['"\`]\\s*\\)`);
                                        const serverNamespacePattern2 = new RegExp(`getTranslations\\s*\\(\\s*['"\`]${namespace2}['"\`]\\s*\\)`);

                                        // Pattern to find t('keyName') or {t('keyName')}
                                        const escapedKeyName2 = keyName2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                                        for (const codeFile of allCodeFiles) {
                                            try {
                                                let content = await fs.readFile(codeFile, 'utf-8');

                                                // Check if file uses this namespace (client or server)
                                                const usesNamespace2 = clientNamespacePattern2.test(content) ||
                                                    serverNamespacePattern2.test(content) ||
                                                    content.includes(patternFunctionName2);

                                                if (!usesNamespace2) continue;

                                                // Pattern 1: {t('keyName')} -> {prefix}{t('keyName')}{suffix}
                                                // e.g., {t('the_user')} -> {(t('the_user')).}
                                                const jsxPattern = new RegExp(
                                                    `\\{(t\\w*\\s*\\(\\s*['"\`]${escapedKeyName2}['"\`]\\s*\\))\\}`,
                                                    'g'
                                                );

                                                // Pattern 2: standalone t('keyName') in template literals or expressions
                                                const standalonePattern = new RegExp(
                                                    `(t\\w*\\s*\\(\\s*['"\`]${escapedKeyName2}['"\`]\\s*\\))`,
                                                    'g'
                                                );

                                                let fileModified = false;

                                                // First try JSX pattern {t('key')} -> {(t('key')).}
                                                if (jsxPattern.test(content)) {
                                                    jsxPattern.lastIndex = 0;
                                                    content = content.replace(jsxPattern, `{${prefix}$1${suffix}}`);
                                                    fileModified = true;
                                                }

                                                if (fileModified) {
                                                    await fs.writeFile(codeFile, content, 'utf-8');
                                                    modifiedTsxFiles.add(codeFile);
                                                    console.log(`[FIX-BAD-VALUES] Wrapped t('${keyName2}') with ${prefix}...${suffix} in ${codeFile.replace(/.*[\/\\]frontend[\/\\]/, '')}`);
                                                }
                                            } catch (err) {
                                                console.error(`Error updating code file ${codeFile}:`, err.message);
                                            }
                                        }
                                    }

                                    keysCleaned++;
                                    appliedChanges.push({
                                        type: 'clean_with_code_wrap',
                                        key: originalKey,
                                        oldValue: keys.find(k => k.fullKey === originalKey)?.value,
                                        newValue: fix.cleanedValue,
                                        codeWrapper: fix.codeWrapper,
                                        reason: fix.reason
                                    });
                                }
                                break;
                            }

                            case 'keep':
                            default:
                                keysKept++;
                                break;
                        }
                    } catch (fixError) {
                        console.error(`Error applying fix for ${originalKey}:`, fixError.message);
                        totalErrors++;
                    }
                }

                // Save all modified locale files using the API's saveLocale method
                for (const localeCode of modifiedJsonFiles) {
                    try {
                        await api.saveLocale(localeCode);
                        console.log(`[FIX-BAD-VALUES] Saved locale: ${localeCode}`);
                    } catch (err) {
                        console.error(`Error saving locale ${localeCode}:`, err.message);
                    }
                }

                console.log(`[FIX-BAD-VALUES] Applied fixes: ${keysRemoved} removed, ${keysCleaned} cleaned, ${keysSplit} split, ${keysKept} kept`);
            }

            // Auto-sync to all locales after fixes
            const syncStats = await syncLocalesToEnglish();

            res.json({
                success: true,
                stats: {
                    totalKeys: keys.length,
                    processed: totalProcessed,
                    batches: batches.length,
                    errors: totalErrors,
                    keysRemoved,
                    keysCleaned,
                    keysSplit,
                    keysKept,
                    newKeysCreated,
                    jsonFilesModified: modifiedJsonFiles.size,
                    tsxFilesModified: modifiedTsxFiles.size,
                    keysSynced: syncStats.keysSynced,
                    localesSynced: syncStats.localesUpdated
                },
                fixes: allFixes,
                appliedChanges,
                modifiedFiles: {
                    json: [...modifiedJsonFiles],
                    tsx: [...modifiedTsxFiles]
                },
                message: `Fixed ${keysRemoved + keysCleaned + keysSplit} keys: ${keysRemoved} removed, ${keysCleaned} cleaned, ${keysSplit} split (${newKeysCreated} new keys created). Modified ${modifiedJsonFiles.size} JSON files and ${modifiedTsxFiles.size} TSX files.${syncStats.keysSynced > 0 ? ` Auto-synced ${syncStats.keysSynced} keys to ${syncStats.localesUpdated} locales.` : ''}`
            });

        } catch (error) {
            console.error('Fix bad values error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Merge duplicate keys
    router.post('/merge-duplicates', async (req, res) => {
        try {
            const { groups } = req.body;

            if (!groups || !Array.isArray(groups) || groups.length === 0) {
                return res.status(400).json({ error: 'Groups array is required' });
            }

            await api.loadLocales();

            const changes = [];
            let keysMerged = 0;
            const modifiedLocales = new Set();
            const keyReplacements = []; // Track old key -> new key replacements for TSX updates
            const trackedReplacements = new Set(); // To avoid duplicates

            // Process all groups - modify in memory first
            for (const group of groups) {
                const targetKey = `${group.suggestedNamespace}.${group.suggestedKey}`;
                const targetValue = group.value;

                // Safety check: Skip menu-related keys that should never be merged
                const isMenuKey = (key) => {
                    const dotIndex = key.indexOf('.');
                    const namespace = dotIndex > -1 ? key.substring(0, dotIndex) : key;
                    const keyPart = dotIndex > -1 ? key.substring(dotIndex + 1) : '';
                    return namespace === 'menu' || (namespace.startsWith('ext_') && keyPart.startsWith('nav.'));
                };

                // Filter out menu keys from the group
                const filteredKeys = group.keys.filter(k => !isMenuKey(k.fullKey));
                if (filteredKeys.length < 2) continue; // Need at least 2 keys to merge

                // Track ALL keys that should be replaced with the target (for TSX updates)
                // Do this BEFORE processing locales so we capture all potential replacements
                for (const keyInfo of filteredKeys) {
                    if (keyInfo.fullKey !== targetKey && !trackedReplacements.has(keyInfo.fullKey)) {
                        keyReplacements.push({
                            oldKey: keyInfo.fullKey,
                            newKey: targetKey
                        });
                        trackedReplacements.add(keyInfo.fullKey);
                    }
                }

                // For each locale, ensure the target key exists with the correct value
                for (const [localeCode, locale] of api.locales.entries()) {
                    // Add the target key if it doesn't exist
                    if (!locale.keys[targetKey]) {
                        // Use the English value for en, else copy from first key that exists
                        let valueToUse = targetValue;
                        if (localeCode !== 'en') {
                            // Find an existing translation in this locale
                            for (const keyInfo of filteredKeys) {
                                if (locale.keys[keyInfo.fullKey]) {
                                    valueToUse = locale.keys[keyInfo.fullKey];
                                    break;
                                }
                            }
                        }
                        locale.keys[targetKey] = valueToUse;
                        changes.push(`Added ${targetKey} to ${localeCode}`);
                        modifiedLocales.add(localeCode);
                    }

                    // Remove duplicate keys (keeping the target)
                    for (const keyInfo of filteredKeys) {
                        if (keyInfo.fullKey !== targetKey && locale.keys[keyInfo.fullKey]) {
                            delete locale.keys[keyInfo.fullKey];
                            changes.push(`Removed duplicate ${keyInfo.fullKey} from ${localeCode}`);
                            keysMerged++;
                            modifiedLocales.add(localeCode);
                        }
                    }
                }
            }

            // Save all modified locales ONCE at the end
            console.log(`[MERGE] Saving ${modifiedLocales.size} modified locales...`);
            for (const localeCode of modifiedLocales) {
                await api.saveLocale(localeCode);
            }
            console.log(`[MERGE] Done saving locales`);

            // Update TSX files to use the new target keys
            const modifiedTsxFiles = new Set();
            console.log(`[MERGE] Key replacements to process: ${keyReplacements.length}`);
            if (keyReplacements.length > 0) {
                console.log(`[MERGE] Sample replacements:`, keyReplacements.slice(0, 5));
            }

            if (keyReplacements.length > 0) {
                console.log(`[MERGE] Updating TSX files for ${keyReplacements.length} key replacements...`);
                const tsxFiles = getTsxFiles();
                console.log(`[MERGE] Found ${tsxFiles.length} TSX files to scan`);

                // TSX files use useTranslations('namespace') and then t('key') without namespace prefix
                // We can only auto-replace when:
                // 1. Same namespace but key part changes (e.g., common.last_updated_1 → common.last_updated)
                // 2. Different namespace requires changing useTranslations call (complex, skip for now)

                for (const tsxFile of tsxFiles) {
                    try {
                        let content = await fs.readFile(tsxFile, 'utf-8');
                        let fileModified = false;

                        for (const { oldKey, newKey } of keyReplacements) {
                            const [oldNamespace, ...oldKeyParts] = oldKey.split('.');
                            const [newNamespace, ...newKeyParts] = newKey.split('.');
                            const oldKeyPart = oldKeyParts.join('.');
                            const newKeyPart = newKeyParts.join('.');

                            // Only replace if key part actually changes
                            if (oldKeyPart === newKeyPart) {
                                // Different namespace, same key - would need to change useTranslations call
                                // This is complex, skip for now
                                continue;
                            }

                            // Check if this file uses the old namespace (client or server component)
                            const clientNamespacePattern = new RegExp(`useTranslations\\s*\\(\\s*['"\`]${oldNamespace}['"\`]\\s*\\)`);
                            const serverNamespacePattern = new RegExp(`getTranslations\\s*\\(\\s*['"\`]${oldNamespace}['"\`]\\s*\\)`);
                            if (!clientNamespacePattern.test(content) && !serverNamespacePattern.test(content)) {
                                continue; // File doesn't use this namespace
                            }

                            // Match t('oldKeyPart') or t("oldKeyPart") or t(`oldKeyPart`)
                            // Also match tX('oldKeyPart') for aliased translations
                            const keyPattern = new RegExp(
                                `(t\\w*\\s*\\(\\s*)['"\`]${oldKeyPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`,
                                'g'
                            );

                            if (keyPattern.test(content)) {
                                keyPattern.lastIndex = 0; // Reset regex
                                content = content.replace(keyPattern, `$1'${newKeyPart}'`);
                                fileModified = true;
                                console.log(`[MERGE] Replaced t('${oldKeyPart}') → t('${newKeyPart}') in ${tsxFile.replace(/.*[\/\\]frontend[\/\\]/, '')}`);
                                changes.push(`Updated t('${oldKeyPart}') → t('${newKeyPart}') in ${tsxFile.replace(/.*[\/\\]frontend[\/\\]/, '')}`);
                            }
                        }

                        if (fileModified) {
                            await fs.writeFile(tsxFile, content, 'utf-8');
                            modifiedTsxFiles.add(tsxFile);
                        }
                    } catch (err) {
                        console.error(`Error updating TSX file ${tsxFile}:`, err.message);
                    }
                }
                console.log(`[MERGE] Updated ${modifiedTsxFiles.size} TSX files`);
            } else {
                console.log(`[MERGE] No key replacements to process - all merged keys were the same as target keys`);
            }

            // Auto-sync to all locales after merge
            const syncStats = await syncLocalesToEnglish();

            res.json({
                success: true,
                stats: {
                    groupsMerged: groups.length,
                    keysMerged,
                    filesUpdated: modifiedLocales.size,
                    tsxFilesModified: modifiedTsxFiles.size,
                    keysSynced: syncStats.keysSynced,
                    localesSynced: syncStats.localesUpdated
                },
                changes,
                modifiedFiles: {
                    locales: [...modifiedLocales],
                    tsx: [...modifiedTsxFiles].map(f => f.replace(/.*[\/\\]frontend[\/\\]/, ''))
                },
                message: `Merged ${groups.length} duplicate groups, removed ${keysMerged} duplicate keys. Updated ${modifiedTsxFiles.size} TSX files.${syncStats.keysSynced > 0 ? ` Auto-synced ${syncStats.keysSynced} keys to ${syncStats.localesUpdated} locales.` : ''}`
            });

        } catch (error) {
            console.error('Merge duplicates error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Sync changes to all locales (copy English values to other locales for new keys)
    // Kept for manual use if needed, but auto-sync happens after fix operations
    router.post('/sync-locales', async (req, res) => {
        try {
            await api.loadLocales();

            const enLocale = api.locales.get('en');
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }

            let keysSynced = 0;
            let localesUpdated = 0;
            const syncedKeys = [];

            // For each non-English locale, ensure all English keys exist
            for (const [localeCode, locale] of api.locales.entries()) {
                if (localeCode === 'en') continue;

                let localeModified = false;
                let keysAddedToThisLocale = 0;

                for (const [key, enValue] of Object.entries(enLocale.keys)) {
                    if (!locale.keys[key]) {
                        // Add English value as placeholder
                        locale.keys[key] = enValue;
                        keysSynced++;
                        keysAddedToThisLocale++;
                        localeModified = true;
                        if (localeCode === 'es' || syncedKeys.length < 20) { // Sample some synced keys
                            syncedKeys.push({ key, locale: localeCode });
                        }
                    }
                }

                if (localeModified) {
                    await api.saveLocale(localeCode);
                    localesUpdated++;
                    console.log(`[SYNC] Added ${keysAddedToThisLocale} keys to ${localeCode}`);
                }
            }

            console.log(`[SYNC] Total: ${keysSynced} keys synced to ${localesUpdated} locales`);

            res.json({
                success: true,
                stats: {
                    keysSynced,
                    localesUpdated,
                    totalLocales: api.locales.size - 1 // Exclude en
                },
                syncedKeys: syncedKeys.slice(0, 20),
                message: `Synced ${keysSynced} keys to ${localesUpdated} locales (out of ${api.locales.size - 1} non-English locales)`
            });

        } catch (error) {
            console.error('Sync locales error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Analyze keys with _number suffix that have duplicates without the suffix
    router.get('/analyze-number-suffixes', async (req, res) => {
        try {
            await api.loadLocales();

            const enLocale = api.locales.get('en');
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }

            const suffixDuplicates = [];
            const allKeys = Object.keys(enLocale.keys);
            const keySet = new Set(allKeys);

            // Pattern to match keys ending with _1, _2, etc.
            const suffixPattern = /^(.+)_(\d+)$/;

            for (const key of allKeys) {
                const match = key.match(suffixPattern);
                if (match) {
                    const baseKey = match[1];
                    const suffix = match[2];

                    // Check if the base key (without _number) exists
                    if (keySet.has(baseKey)) {
                        const suffixValue = enLocale.keys[key];
                        const baseValue = enLocale.keys[baseKey];

                        // Check if values are the same or very similar
                        const areSame = suffixValue === baseValue;
                        const similarity = areSame ? 1.0 : calculateSimilarity(
                            suffixValue.toLowerCase(),
                            baseValue.toLowerCase()
                        );

                        if (similarity > 0.8) {
                            const dotIndex = key.indexOf('.');
                            const namespace = dotIndex > -1 ? key.substring(0, dotIndex) : 'common';

                            suffixDuplicates.push({
                                suffixKey: key,
                                baseKey: baseKey,
                                namespace,
                                suffixValue,
                                baseValue,
                                similarity,
                                areSame,
                                suffix: `_${suffix}`
                            });
                        }
                    }
                }
            }

            // Sort by namespace, then by key
            suffixDuplicates.sort((a, b) => {
                if (a.namespace !== b.namespace) return a.namespace.localeCompare(b.namespace);
                return a.suffixKey.localeCompare(b.suffixKey);
            });

            res.json({
                success: true,
                stats: {
                    totalSuffixDuplicates: suffixDuplicates.length
                },
                suffixDuplicates
            });

        } catch (error) {
            console.error('Analyze number suffixes error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Fix _number suffix duplicates - remove the suffix version and update TSX files
    router.post('/fix-number-suffixes', async (req, res) => {
        try {
            const { duplicates } = req.body;

            if (!duplicates || !Array.isArray(duplicates) || duplicates.length === 0) {
                return res.status(400).json({ error: 'Duplicates array is required' });
            }

            await api.loadLocales();
            const tsxFiles = await getTsxFiles();

            let keysRemoved = 0;
            let tsxFilesModified = 0;
            const modifiedLocales = new Set();
            const modifiedTsxSet = new Set();
            const appliedChanges = [];

            for (const dup of duplicates) {
                const { suffixKey, baseKey } = dup;

                if (!suffixKey || !baseKey) continue;

                // Skip menu-related keys that should never be modified
                const isMenuKey = (key) => {
                    const dotIndex = key.indexOf('.');
                    const namespace = dotIndex > -1 ? key.substring(0, dotIndex) : key;
                    const keyPart = dotIndex > -1 ? key.substring(dotIndex + 1) : '';
                    return namespace === 'menu' || (namespace.startsWith('ext_') && keyPart.startsWith('nav.'));
                };
                if (isMenuKey(suffixKey) || isMenuKey(baseKey)) continue;

                // Remove the suffix key from all locales
                for (const [localeCode, locale] of api.locales.entries()) {
                    if (locale.keys[suffixKey]) {
                        delete locale.keys[suffixKey];
                        modifiedLocales.add(localeCode);
                    }
                }
                keysRemoved++;

                // Update TSX files - replace t('suffixKeyPart') with t('baseKeyPart')
                // TSX files use useTranslations('namespace') and then t('key') without namespace prefix
                const [namespace, ...suffixKeyParts] = suffixKey.split('.');
                const suffixKeyPart = suffixKeyParts.join('.');
                const [, ...baseKeyParts] = baseKey.split('.');
                const baseKeyPart = baseKeyParts.join('.');

                // Only update TSX if the key part actually changes
                if (suffixKeyPart !== baseKeyPart) {
                    // Check for both client and server component patterns
                    const clientNamespacePattern = new RegExp(`useTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);
                    const serverNamespacePattern = new RegExp(`getTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);
                    const keyPattern = new RegExp(
                        `(t\\w*\\s*\\(\\s*)['"\`]${suffixKeyPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`,
                        'g'
                    );

                    for (const tsxFile of tsxFiles) {
                        try {
                            let content = await fs.readFile(tsxFile, 'utf-8');
                            // Only process files that use this namespace (client or server)
                            if (!clientNamespacePattern.test(content) && !serverNamespacePattern.test(content)) continue;

                            if (keyPattern.test(content)) {
                                // Reset lastIndex for the regex
                                keyPattern.lastIndex = 0;
                                // Replace the suffix key part with the base key part
                                content = content.replace(keyPattern, `$1'${baseKeyPart}'`);
                                await fs.writeFile(tsxFile, content, 'utf-8');
                                modifiedTsxSet.add(tsxFile);
                                console.log(`[FIX-SUFFIXES] Replaced t('${suffixKeyPart}') → t('${baseKeyPart}') in ${tsxFile.replace(/.*[\/\\]frontend[\/\\]/, '')}`);
                            }
                        } catch (err) {
                            console.error(`Error updating TSX file ${tsxFile}:`, err.message);
                        }
                    }
                }

                appliedChanges.push({
                    type: 'remove_suffix',
                    suffixKey,
                    baseKey,
                    reason: `Removed duplicate key with _number suffix`
                });
            }

            // Save all modified locales
            for (const localeCode of modifiedLocales) {
                try {
                    await api.saveLocale(localeCode);
                    console.log(`[FIX-SUFFIXES] Saved locale: ${localeCode}`);
                } catch (err) {
                    console.error(`Error saving locale ${localeCode}:`, err.message);
                }
            }

            tsxFilesModified = modifiedTsxSet.size;

            // Auto-sync to all locales after fixing suffixes
            const syncStats = await syncLocalesToEnglish();

            res.json({
                success: true,
                stats: {
                    keysRemoved,
                    localesModified: modifiedLocales.size,
                    tsxFilesModified,
                    keysSynced: syncStats.keysSynced,
                    localesSynced: syncStats.localesUpdated
                },
                appliedChanges,
                modifiedFiles: {
                    locales: [...modifiedLocales],
                    tsx: [...modifiedTsxSet].map(f => f.replace(/.*[\/\\]frontend[\/\\]/, ''))
                },
                message: `Removed ${keysRemoved} duplicate suffix keys from ${modifiedLocales.size} locales. Updated ${tsxFilesModified} TSX files.${syncStats.keysSynced > 0 ? ` Auto-synced ${syncStats.keysSynced} keys to ${syncStats.localesUpdated} locales.` : ''}`
            });

        } catch (error) {
            console.error('Fix number suffixes error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Analyze keys with number prefixes in their values (e.g., "100 per page", "2FA status")
    router.get('/analyze-number-prefixes', async (req, res) => {
        try {
            await api.loadLocales();

            const enLocale = api.locales.get('en');
            if (!enLocale) {
                return res.status(404).json({ error: 'English locale not found' });
            }

            const numberPrefixedKeys = [];
            const allKeys = Object.keys(enLocale.keys);
            const keySet = new Set(allKeys);

            for (const fullKey of allKeys) {
                const value = enLocale.keys[fullKey];
                if (!value || typeof value !== 'string') continue;

                const parsed = parseNumberPrefixedValue(value);
                if (parsed) {
                    const dotIndex = fullKey.indexOf('.');
                    const namespace = dotIndex > -1 ? fullKey.substring(0, dotIndex) : 'common';
                    const keyName = dotIndex > -1 ? fullKey.substring(dotIndex + 1) : fullKey;

                    // Check if the text part key already exists (in common namespace)
                    const targetKey = `common.${parsed.suggestedKey}`;
                    const targetExists = keySet.has(targetKey);

                    // Get existing translation for the text part if it exists
                    const existingValue = targetExists ? enLocale.keys[targetKey] : null;

                    numberPrefixedKeys.push({
                        fullKey,
                        namespace,
                        keyName,
                        value,
                        numberPart: parsed.numberPart,
                        textPart: parsed.textPart,
                        suggestedKey: parsed.suggestedKey,
                        targetKey,
                        targetExists,
                        existingValue,
                        codeReplacement: parsed.codeReplacement
                    });
                }
            }

            // Sort by namespace, then by key
            numberPrefixedKeys.sort((a, b) => {
                if (a.namespace !== b.namespace) return a.namespace.localeCompare(b.namespace);
                return a.fullKey.localeCompare(b.fullKey);
            });

            res.json({
                success: true,
                stats: {
                    totalNumberPrefixedKeys: numberPrefixedKeys.length,
                    keysWithExistingTarget: numberPrefixedKeys.filter(k => k.targetExists).length,
                    keysNeedingNewTarget: numberPrefixedKeys.filter(k => !k.targetExists).length
                },
                numberPrefixedKeys
            });

        } catch (error) {
            console.error('Analyze number prefixes error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Fix number-prefixed keys - split them into number (literal) + translatable text
    router.post('/fix-number-prefixes', async (req, res) => {
        try {
            const { keys } = req.body;

            if (!keys || !Array.isArray(keys) || keys.length === 0) {
                return res.status(400).json({ error: 'Keys array is required' });
            }

            await api.loadLocales();
            const tsxFiles = await getTsxFiles();
            // Also get .ts files for analytics.ts etc
            const tsFiles = await getTsxFiles('**/*.ts');
            const allCodeFiles = [...new Set([...tsxFiles, ...tsFiles])];

            let keysRemoved = 0;
            let keysCreated = 0;
            let tsxFilesModified = 0;
            const modifiedLocales = new Set();
            const modifiedCodeFiles = new Set();
            const appliedChanges = [];

            for (const keyInfo of keys) {
                const { fullKey, numberPart, textPart, suggestedKey, targetKey, targetExists } = keyInfo;

                if (!fullKey || !numberPart || !textPart || !suggestedKey) continue;

                const dotIndex = fullKey.indexOf('.');
                const namespace = dotIndex > -1 ? fullKey.substring(0, dotIndex) : 'common';
                const keyName = dotIndex > -1 ? fullKey.substring(dotIndex + 1) : fullKey;

                // Step 1: Create the text part key in common namespace if it doesn't exist
                if (!targetExists) {
                    for (const [localeCode, locale] of api.locales.entries()) {
                        if (!locale.keys[targetKey]) {
                            // Use the text part value (English) or localized equivalent
                            const originalValue = locale.keys[fullKey];
                            if (originalValue) {
                                // Try to extract text part from localized value
                                const localizedParsed = parseNumberPrefixedValue(originalValue);
                                locale.keys[targetKey] = localizedParsed ? localizedParsed.textPart : textPart;
                            } else {
                                locale.keys[targetKey] = textPart;
                            }
                            modifiedLocales.add(localeCode);
                        }
                    }
                    keysCreated++;
                    appliedChanges.push({
                        type: 'create_key',
                        key: targetKey,
                        value: textPart,
                        reason: `Created text part key for "${fullKey}"`
                    });
                }

                // Step 2: Update code files to use template literal
                // Pattern: t('keyName') or t("keyName") within files using this namespace
                const clientNamespacePattern = new RegExp(`useTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);
                const serverNamespacePattern = new RegExp(`getTranslations\\s*\\(\\s*['"\`]${namespace}['"\`]\\s*\\)`);

                // Convert namespace to camelCase function name: ext_admin -> tExtAdmin, dashboard_admin -> tDashboardAdmin
                function toFunctionName(ns) {
                    return 't' + ns.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                }
                const patternFunctionName = toFunctionName(namespace);

                // Build regex to find t('keyName') - be more flexible about function name matching
                const escapedKeyName = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const keyPattern = new RegExp(
                    `t\\w*\\s*\\(\\s*['"\`]${escapedKeyName}['"\`]\\s*\\)`,
                    'g'
                );

                for (const codeFile of allCodeFiles) {
                    try {
                        let content = await fs.readFile(codeFile, 'utf-8');

                        // Check if file uses this namespace (client, server, or pattern-based function name)
                        const usesNamespace = clientNamespacePattern.test(content) ||
                            serverNamespacePattern.test(content) ||
                            content.includes(patternFunctionName);

                        if (!usesNamespace) continue;

                        if (keyPattern.test(content)) {
                            keyPattern.lastIndex = 0; // Reset regex

                            // Replace t('keyName') with `${numberPart} ${tCommon('suggestedKey')}`
                            const newCode = `\`${numberPart} \${tCommon('${suggestedKey}')}\``;

                            // Detect if this is a server component (no "use client" directive)
                            const trimmedContent = content.trim();
                            const isServer = !trimmedContent.startsWith('"use client"') && !trimmedContent.startsWith("'use client'");

                            // Check if tCommon is already declared in this file (client or server)
                            const hasCommonDeclaration = /useTranslations\s*\(\s*['"`]common['"`]\s*\)/.test(content) ||
                                                         /getTranslations\s*\(\s*['"`]common['"`]\s*\)/.test(content) ||
                                                         /const\s+tCommon\s*=/.test(content);

                            if (!hasCommonDeclaration) {
                                // Need to add tCommon declaration automatically
                                // Find where other translation calls are and add tCommon there
                                const useTranslationsMatch = content.match(/const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\s*\(\s*['"`]\w+['"`]\s*\)/);

                                if (useTranslationsMatch) {
                                    // Add tCommon declaration after the existing translation declaration
                                    const insertPoint = content.indexOf(useTranslationsMatch[0]) + useTranslationsMatch[0].length;
                                    const tCommonDeclaration = isServer
                                        ? `\n  const tCommon = await getTranslations('common');`
                                        : `\n  const tCommon = useTranslations('common');`;
                                    content = content.slice(0, insertPoint) + tCommonDeclaration + content.slice(insertPoint);

                                    // Now do the replacement
                                    content = content.replace(keyPattern, newCode);
                                    await fs.writeFile(codeFile, content, 'utf-8');
                                    modifiedCodeFiles.add(codeFile);
                                    console.log(`[FIX-NUMBER-PREFIX] Added tCommon and replaced t('${keyName}') → ${newCode} in ${codeFile.replace(/.*[\/\\]frontend[\/\\]/, '')}`);
                                } else {
                                    // Can't find where to add tCommon, flag for manual review
                                    appliedChanges.push({
                                        type: 'manual_review',
                                        file: codeFile.replace(/.*[\/\\]frontend[\/\\]/, ''),
                                        key: fullKey,
                                        reason: `File needs tCommon declaration. Replace t('${keyName}') with ${newCode}`
                                    });
                                }
                            } else {
                                // Safe to replace - tCommon already exists
                                content = content.replace(keyPattern, newCode);
                                await fs.writeFile(codeFile, content, 'utf-8');
                                modifiedCodeFiles.add(codeFile);
                                console.log(`[FIX-NUMBER-PREFIX] Replaced t('${keyName}') → ${newCode} in ${codeFile.replace(/.*[\/\\]frontend[\/\\]/, '')}`);
                            }
                        }
                    } catch (err) {
                        console.error(`Error updating code file ${codeFile}:`, err.message);
                    }
                }

                // Step 3: Remove the old number-prefixed key from all locales
                for (const [localeCode, locale] of api.locales.entries()) {
                    if (locale.keys[fullKey]) {
                        delete locale.keys[fullKey];
                        modifiedLocales.add(localeCode);
                    }
                }
                keysRemoved++;
                appliedChanges.push({
                    type: 'remove_key',
                    key: fullKey,
                    reason: `Removed number-prefixed key, replaced with "${numberPart}" + t('${suggestedKey}')`
                });
            }

            // Save all modified locales
            for (const localeCode of modifiedLocales) {
                try {
                    await api.saveLocale(localeCode);
                    console.log(`[FIX-NUMBER-PREFIX] Saved locale: ${localeCode}`);
                } catch (err) {
                    console.error(`Error saving locale ${localeCode}:`, err.message);
                }
            }

            tsxFilesModified = modifiedCodeFiles.size;

            // Auto-sync to all locales
            const syncStats = await syncLocalesToEnglish();

            res.json({
                success: true,
                stats: {
                    keysProcessed: keys.length,
                    keysRemoved,
                    keysCreated,
                    localesModified: modifiedLocales.size,
                    codeFilesModified: modifiedCodeFiles.size,
                    keysSynced: syncStats.keysSynced,
                    localesSynced: syncStats.localesUpdated
                },
                appliedChanges,
                modifiedFiles: {
                    locales: [...modifiedLocales],
                    code: [...modifiedCodeFiles].map(f => f.replace(/.*[\/\\]frontend[\/\\]/, ''))
                },
                message: `Fixed ${keysRemoved} number-prefixed keys. Created ${keysCreated} new keys in common namespace. Updated ${modifiedCodeFiles.size} code files.${syncStats.keysSynced > 0 ? ` Auto-synced ${syncStats.keysSynced} keys to ${syncStats.localesUpdated} locales.` : ''}`
            });

        } catch (error) {
            console.error('Fix number prefixes error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = createOptimizeKeysRoutes;
