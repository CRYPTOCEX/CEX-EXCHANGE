const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { readJsonFile } = require('../utils/file-utils');

// Use environment variable or fallback to default path
const MESSAGES_DIR = process.env.MESSAGES_DIR || path.join(__dirname, '../../../../frontend/messages');

class TranslationAPI {
    constructor() {
        this.locales = new Map();
        this.loadLocales();
    }

    async loadLocales() {
        try {
            const files = await fs.readdir(MESSAGES_DIR);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                const code = file.replace('.json', '');
                const filePath = path.join(MESSAGES_DIR, file);
                const content = await readJsonFile(filePath);
                
                this.locales.set(code, {
                    name: this.getLanguageName(code),
                    content: content,
                    filePath: filePath,
                    keys: this.flattenObject(content),
                    totalKeys: Object.keys(this.flattenObject(content)).length
                });
            }
            
            console.log(`Loaded ${this.locales.size} locales`);
        } catch (error) {
            console.error('Error loading locales:', error);
        }
    }

    getLanguageName(code) {
        const names = {
            'en': 'English',
            'af': 'Afrikaans',
            'am': 'Amharic',
            'ar': 'Arabic',
            'as': 'Assamese',
            'az': 'Azerbaijani',
            'bg': 'Bulgarian',
            'bn': 'Bengali',
            'bs': 'Bosnian',
            'ca': 'Catalan',
            'cs': 'Czech',
            'cy': 'Welsh',
            'da': 'Danish',
            'de': 'German',
            'dv': 'Divehi',
            'el': 'Greek',
            'eo': 'Esperanto',
            'es': 'Spanish',
            'et': 'Estonian',
            'eu': 'Basque',
            'fa': 'Persian',
            'fi': 'Finnish',
            'fj': 'Fijian',
            'fo': 'Faroese',
            'fr': 'French',
            'ga': 'Irish',
            'gl': 'Galician',
            'gu': 'Gujarati',
            'ha': 'Hausa',
            'he': 'Hebrew',
            'hi': 'Hindi',
            'hr': 'Croatian',
            'hu': 'Hungarian',
            'hy': 'Armenian',
            'id': 'Indonesian',
            'ig': 'Igbo',
            'is': 'Icelandic',
            'it': 'Italian',
            'ja': 'Japanese',
            'ka': 'Georgian',
            'kk': 'Kazakh',
            'km': 'Khmer',
            'kn': 'Kannada',
            'ko': 'Korean',
            'ku': 'Kurdish',
            'ky': 'Kyrgyz',
            'lb': 'Luxembourgish',
            'lo': 'Lao',
            'lt': 'Lithuanian',
            'lv': 'Latvian',
            'mg': 'Malagasy',
            'mi': 'Maori',
            'mk': 'Macedonian',
            'ml': 'Malayalam',
            'mn': 'Mongolian',
            'mr': 'Marathi',
            'ms': 'Malay',
            'mt': 'Maltese',
            'my': 'Burmese',
            'nb': 'Norwegian Bokmål',
            'ne': 'Nepali',
            'nl': 'Dutch',
            'no': 'Norwegian',
            'ny': 'Chichewa',
            'or': 'Odia',
            'pa': 'Punjabi',
            'pl': 'Polish',
            'ps': 'Pashto',
            'pt': 'Portuguese',
            'ro': 'Romanian',
            'ru': 'Russian',
            'rw': 'Kinyarwanda',
            'sd': 'Sindhi',
            'si': 'Sinhala',
            'sk': 'Slovak',
            'sl': 'Slovenian',
            'sm': 'Samoan',
            'sn': 'Shona',
            'so': 'Somali',
            'sq': 'Albanian',
            'sr': 'Serbian',
            'st': 'Sesotho',
            'su': 'Sundanese',
            'sv': 'Swedish',
            'sw': 'Swahili',
            'ta': 'Tamil',
            'te': 'Telugu',
            'tg': 'Tajik',
            'th': 'Thai',
            'tk': 'Turkmen',
            'tl': 'Tagalog',
            'tr': 'Turkish',
            'tt': 'Tatar',
            'ug': 'Uyghur',
            'uk': 'Ukrainian',
            'ur': 'Urdu',
            'uz': 'Uzbek',
            'vi': 'Vietnamese',
            'xh': 'Xhosa',
            'yi': 'Yiddish',
            'yo': 'Yoruba',
            'zh': 'Chinese',
            'zu': 'Zulu'
        };
        return names[code] || code.toUpperCase();
    }

    flattenObject(obj, prefix = '') {
        const flattened = {};
        
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    // Check if this object has both string properties and nested objects
                    const hasNestedObjects = Object.keys(obj[key]).some(k => 
                        typeof obj[key][k] === 'object' && obj[key][k] !== null && !Array.isArray(obj[key][k])
                    );
                    
                    // If it has a 'title' property and nested objects, preserve the title
                    if (obj[key].title && hasNestedObjects) {
                        flattened[`${newKey}.title`] = obj[key].title;
                    }
                    
                    Object.assign(flattened, this.flattenObject(obj[key], newKey));
                } else {
                    flattened[newKey] = obj[key];
                }
            }
        }
        
        return flattened;
    }

    unflattenObject(obj) {
        const result = {};

        // Helper to set a deeply nested property
        const setNestedProperty = (target, keys, value) => {
            let current = target;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key] || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
        };

        // Translation keys have a two-level structure:
        // 1. Namespace (e.g., "nft/details" or "dashboard")
        // 2. Key within namespace (e.g., "Activity" or "some_key")
        // Flattened format: "namespace.key" where we only split on the FIRST period
        // This prevents keys containing periods from being incorrectly nested
        //
        // EXCEPTION: The "menu" namespace uses deeply nested keys like:
        // menu.admin.dashboard.title -> menu: { admin: { dashboard: { title: "..." } } }

        for (const fullKey of Object.keys(obj)) {
            const firstDotIndex = fullKey.indexOf('.');

            if (firstDotIndex === -1) {
                // No dot - this is a top-level key (shouldn't happen normally but handle it)
                result[fullKey] = obj[fullKey];
            } else {
                // Split only on the first dot
                const namespace = fullKey.substring(0, firstDotIndex);
                const key = fullKey.substring(firstDotIndex + 1);

                // Special handling for namespaces that use deeply nested structure:
                // - "menu" namespace: menu.admin.dashboard.title -> menu: { admin: { dashboard: { title: "..." } } }
                // - "ext_*" namespaces with nav: ext_affiliate.nav.home.title -> ext_affiliate: { nav: { home: { title: "..." } } }
                const needsDeepNesting = (namespace === 'menu' && key.includes('.')) ||
                                         (namespace.startsWith('ext_') && key.startsWith('nav.'));

                if (needsDeepNesting) {
                    const allParts = fullKey.split('.');
                    setNestedProperty(result, allParts, obj[fullKey]);
                } else {
                    // Ensure namespace object exists
                    if (!result[namespace] || typeof result[namespace] !== 'object') {
                        result[namespace] = {};
                    }

                    // Add the key to the namespace
                    result[namespace][key] = obj[fullKey];
                }
            }
        }

        return result;
    }

    calculateProgress(locale, localeCode = null) {
        if (!locale) return { progress: 0, translated: 0, missing: 0, identical: 0, total: 0, complete: false };

        const enLocale = this.locales.get('en');
        const enKeys = enLocale?.keys || {};
        const localeKeys = locale.keys || {};
        const total = Object.keys(enKeys).length;

        // If this is English locale (either by code or by comparing keys object), return 100%
        if (localeCode === 'en' || locale === enLocale || locale.keys === enKeys) {
            return { progress: 100, translated: total, missing: 0, identical: 0, total, complete: true };
        }

        let translated = 0;
        let identical = 0;
        let missing = 0;

        for (const key in enKeys) {
            if (key in localeKeys) {
                // Key exists in locale
                if (localeKeys[key] !== enKeys[key]) {
                    translated++;
                } else {
                    identical++;
                }
            } else {
                // Key is actually missing from locale
                missing++;
            }
        }

        // Progress reflects actual translation progress
        // Only count keys that are actually translated (different from English)
        const progress = total > 0 ? Math.round((translated / total) * 100) : 100;

        // Add a completion indicator (all keys exist, even if not all translated)
        const complete = missing === 0;

        return { progress, translated, missing, identical, total, complete };
    }

    async findIdenticalValues(sourceLocale = 'en', targetLocale) {
        const source = this.locales.get(sourceLocale);
        const target = this.locales.get(targetLocale);

        if (!source || !target) {
            throw new Error('Locale not found');
        }

        const identical = [];
        const sourceKeys = source.keys;
        const targetKeys = target.keys;

        let totalChecked = 0;
        let foundIdentical = 0;
        let skippedByFilter = 0;

        // Terms that are universally the same across languages - ONLY technical terms and brand names
        // NOTE: Normal words like "Add", "Edit", "View", "Back" etc. SHOULD be translated!
        const universalTerms = [
            // Technical acronyms
            'api', 'url', 'html', 'css', 'json', 'xml', 'http', 'https', 'sql', 'uuid',
            'wifi', 'vpn', 'ip', 'dns', 'ssl', 'tls', 'ftp', 'ssh', 'oauth', 'jwt',
            // Brand names (always stay the same)
            'github', 'google', 'facebook', 'twitter', 'linkedin', 'youtube', 'metamask',
            'bitcoin', 'ethereum', 'binance', 'coinbase', 'pinata', 'ipfs'
        ];

        // Patterns that suggest the term should NOT be translated (truly untranslatable)
        // IMPORTANT: This should be very restrictive - only skip things that are genuinely not translatable
        const shouldKeepIdentical = (text) => {
            const lowerText = text.toLowerCase().trim();
            const trimmedText = text.trim();

            // Check if it's a universal technical term or brand name (exact match)
            if (universalTerms.includes(lowerText)) return true;

            // Check if it's all caps acronym (like BTC, ETH, ROI, APR, USDT)
            if (trimmedText === trimmedText.toUpperCase() &&
                trimmedText.length >= 2 &&
                trimmedText.length <= 6 &&
                /^[A-Z0-9]+$/.test(trimmedText)) return true;

            // Check if it's a number or time/size format (like "5MB", "15m", "1W", "90D")
            if (/^\d+$/.test(trimmedText) || /^\d+[a-zA-Z]{1,3}$/.test(trimmedText)) return true;

            // Check if it's a time period format (1M, 1W, 1Y, 3M, 6M, 90D, etc.)
            if (/^\d+[mwydMWYD]$/.test(trimmedText)) return true;

            // Check if it's a placeholder variable (like {variable})
            if (/^{[^}]+}$/.test(trimmedText) || /^%[sd]$/.test(trimmedText)) return true;

            // Check if it's a URL or path
            if (/^(https?:\/\/|\/|\.\/|\.\.\/|[a-z]:\/)/i.test(trimmedText)) return true;

            // Check if it's an email pattern
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedText)) return true;

            // Check if it's a date/time format pattern (like "yyyy-MM-dd", "HH:mm:ss")
            if (/^[yMdHhms:\s\-\/]+$/.test(trimmedText) && trimmedText.length <= 20) return true;

            // Skip measurement units only (not words)
            const measurementUnits = ['px', 'em', 'rem', 'vh', 'vw', '%', 'kg', 'lb', 'oz', 'g', 'mg', 'ml', 'l', 'm³', 'cm', 'mm', 'm', 'km'];
            if (measurementUnits.includes(lowerText)) return true;

            // Skip file extensions
            if (/^\.[a-z0-9]+$/i.test(trimmedText)) return true;

            // Skip if it looks like a malformed key (contains special chars that shouldn't be there)
            if (/^[(\[]/.test(trimmedText)) return true; // Starts with ( or [
            if (/^\/\d+/.test(trimmedText)) return true; // Like "/5 Rating", "/500 characters"

            // Skip environment/config values
            if (['env', 'dev', 'prod', 'staging', 'localhost'].includes(lowerText)) return true;

            // ALL other identical values should be translated!
            // This includes: Add, Edit, View, Back, Done, All, Max, Min, High, Low, etc.
            return false;
        };

        for (const key in sourceKeys) {
            totalChecked++;
            if (targetKeys[key] && sourceKeys[key] === targetKeys[key]) {
                foundIdentical++;
                // Only include if it's NOT a universal term that should stay the same
                if (!shouldKeepIdentical(sourceKeys[key])) {
                    identical.push({
                        key,
                        value: sourceKeys[key]
                    });
                } else {
                    skippedByFilter++;
                    console.log(`Skipping identical value for key "${key}" as it's likely intentional: "${sourceKeys[key]}"`);
                }
            }
        }

        console.log(`\n📊 Identical values scan for ${targetLocale}:`);
        console.log(`   Total keys checked: ${totalChecked}`);
        console.log(`   Found identical: ${foundIdentical}`);
        console.log(`   Skipped by filter: ${skippedByFilter}`);
        console.log(`   Selected for translation: ${identical.length}\n`);

        return identical;
    }

    async callClaudeCode(texts, targetLocale, context = '', progressCallback = null) {
        // Handle both single text and array of texts
        const isArray = Array.isArray(texts);
        const textsToTranslate = isArray ? texts : [texts];
        
        // Build prompt for batch translation
        const languageName = this.getLanguageName(targetLocale);
        
        // Use JSON format for more reliable parsing
        let prompt = `TASK: Translate English UI texts to ${languageName} (language code: ${targetLocale}).

You are translating user interface strings for a web application. The TARGET LANGUAGE is ${languageName}.

RULES:
1. Translate ALL texts to ${languageName}, including common words like "To", "From", "High", "Low", "Open", "New", "Next", "Free", "Send", "Show", "Step", "Type", "User", "Plan", "Read", "Risk", etc.
2. Words like "To" and "From" are UI labels that MUST be translated (e.g., "To" in Vietnamese = "Đến", in French = "À", etc.)
3. Technical acronyms (API, URL, HTML, BTC, ETH) can remain unchanged
4. Brand names (Venmo, WhatsApp, MetaMask) should remain unchanged
5. Preserve placeholders: {name}, {count}, %s, %d
6. Keep HTML tags unchanged

${context ? `Context: ${context}\n` : ''}
INPUT: ${textsToTranslate.length} English texts to translate to ${languageName}:

${textsToTranslate.map((text, i) => `[${i}] "${text}"`).join('\n')}

OUTPUT: Return ONLY a JSON array with EXACTLY ${textsToTranslate.length} ${languageName} translations in the same order.
Example format: ["translation1", "translation2", "translation3"]

JSON array:`;

        return new Promise((resolve, reject) => {
            console.log(`Translation request: ${textsToTranslate.length} texts to ${targetLocale} (${languageName})`);
            
            // Broadcast progress start
            if (progressCallback) {
                progressCallback({
                    type: 'batch_start',
                    locale: targetLocale,
                    totalTexts: textsToTranslate.length
                });
            }
            
            const claudeCommand = process.platform === 'win32' ? 'claude' : 'claude';

            // Calculate dynamic max output tokens based on batch size
            // Each translation averages ~100 chars = ~25 tokens, plus JSON overhead
            // Use 50 tokens per item as safe estimate + 1000 for JSON structure
            const estimatedTokens = Math.min(128000, Math.max(32000, textsToTranslate.length * 50 + 1000));

            // Use claude with the prompt directly via stdin
            // Set higher output token limit for larger batches
            const claudeProcess = spawn(claudeCommand, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                windowsHide: true,
                env: {
                    ...process.env,
                    CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(estimatedTokens)
                }
            });

            let output = '';
            let error = '';
            let hasReceivedData = false;
            let timeoutId;

            // Set timeout for the command - dynamic based on batch size
            // Allow 2 seconds per text minimum, or 120 seconds minimum, max 10 minutes
            const dynamicTimeout = Math.min(600000, Math.max(120000, textsToTranslate.length * 2000));
            timeoutId = setTimeout(() => {
                claudeProcess.kill();
                console.error(`Claude command timed out after ${dynamicTimeout}ms for ${textsToTranslate.length} texts`);
                if (progressCallback) {
                    progressCallback({
                        type: 'batch_error',
                        locale: targetLocale,
                        error: 'Translation timeout'
                    });
                }
                // Fallback to returning original text
                resolve(isArray ? textsToTranslate : textsToTranslate[0]);
            }, dynamicTimeout);

            claudeProcess.stdout.on('data', (data) => {
                hasReceivedData = true;
                output += data.toString();
            });

            claudeProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            claudeProcess.on('close', (code) => {
                clearTimeout(timeoutId);

                if (code !== 0 || !hasReceivedData) {
                    const errorMsg = code === null ? 'Claude process was terminated (timeout or killed)' : `Claude process exited with code ${code}`;
                    console.error(errorMsg);
                    if (error) console.error(`Stderr: ${error}`);
                    if (output && output.trim()) {
                        console.log(`Partial output received: ${output.substring(0, 200)}...`);
                    }
                    if (progressCallback) {
                        progressCallback({
                            type: 'batch_error',
                            locale: targetLocale,
                            error: error || errorMsg
                        });
                    }
                    // Fallback to returning original text
                    resolve(isArray ? textsToTranslate : textsToTranslate[0]);
                    return;
                }

                try {
                    // Parse the output - Claude should return a JSON array
                    let translations = [];
                    const cleanedOutput = output.trim();
                    
                    // Progress callback
                    if (progressCallback) {
                        progressCallback({
                            type: 'translation_progress',
                            locale: targetLocale
                        });
                    }
                    
                    try {
                        // First, clean up common formatting issues
                        let processedOutput = cleanedOutput;

                        console.log(`\n--- Parsing translation response (${cleanedOutput.length} chars) ---`);
                        console.log(`First 200 chars: ${cleanedOutput.substring(0, 200)}`);
                        console.log(`Last 200 chars: ${cleanedOutput.substring(cleanedOutput.length - 200)}`);

                        // Remove markdown code blocks if present (handle multi-line)
                        // Match ```json or ``` at start, and ``` at end
                        processedOutput = processedOutput.replace(/^```json\s*/i, '');
                        processedOutput = processedOutput.replace(/^```\s*/i, '');
                        processedOutput = processedOutput.replace(/\s*```\s*$/i, '');
                        // Also handle case where ```json is on its own line
                        processedOutput = processedOutput.replace(/```json\s*\n/gi, '');
                        processedOutput = processedOutput.replace(/\n\s*```/gi, '');

                        // Remove any text before the JSON array
                        if (processedOutput.includes('[') && !processedOutput.trim().startsWith('[')) {
                            const arrayStart = processedOutput.indexOf('[');
                            console.log(`Removing ${arrayStart} chars before JSON array`);
                            processedOutput = processedOutput.substring(arrayStart);
                        }

                        // Remove any text after the JSON array
                        if (processedOutput.includes(']')) {
                            const arrayEnd = processedOutput.lastIndexOf(']');
                            if (arrayEnd < processedOutput.length - 1) {
                                console.log(`Removing ${processedOutput.length - arrayEnd - 1} chars after JSON array`);
                            }
                            processedOutput = processedOutput.substring(0, arrayEnd + 1);
                        }

                        // Fix special/smart quotes that break JSON parsing
                        // Replace German/Polish style low-high quotes: „text"
                        processedOutput = processedOutput.replace(/„/g, '"').replace(/"/g, '"');
                        // Replace curly/smart quotes: "text" 'text'
                        processedOutput = processedOutput.replace(/[""]/g, '"').replace(/['']/g, "'");
                        // Replace guillemets: «text» ‹text›
                        processedOutput = processedOutput.replace(/[«»‹›]/g, '"');

                        console.log(`Processed output length: ${processedOutput.length} chars`);

                        // Try to parse the cleaned output
                        const parsed = JSON.parse(processedOutput.trim());
                        if (Array.isArray(parsed)) {
                            console.log(`Parsed JSON array with ${parsed.length} elements`);
                            // Check if it's a double-encoded JSON (array with a single JSON string)
                            if (parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].startsWith('[')) {
                                try {
                                    // It's double-encoded, parse the inner JSON
                                    const innerParsed = JSON.parse(parsed[0]);
                                    if (Array.isArray(innerParsed)) {
                                        translations = innerParsed;
                                        console.log('Detected and fixed double-encoded JSON response');
                                    } else {
                                        translations = parsed;
                                    }
                                } catch (e) {
                                    // Not double-encoded, use as is
                                    translations = parsed;
                                }
                            } else {
                                translations = parsed;
                            }
                        } else {
                            throw new Error('Response is not a JSON array');
                        }
                    } catch (jsonError) {
                        console.warn('Failed to parse as JSON after cleanup:', jsonError.message);

                        // Also fix special quotes in original for fallback parsing
                        let fixedOutput = cleanedOutput
                            .replace(/„/g, '"').replace(/"/g, '"')
                            .replace(/[""]/g, '"').replace(/['']/g, "'")
                            .replace(/[«»‹›]/g, '"');

                        // Fallback: try to extract JSON array from the fixed text
                        const jsonMatch = fixedOutput.match(/\[[\s\S]*?\]/);
                        if (jsonMatch) {
                            try {
                                // First attempt: direct parse
                                translations = JSON.parse(jsonMatch[0]);
                            } catch (e) {
                                // Second attempt: try to fix common JSON issues
                                try {
                                    let fixedJson = jsonMatch[0];
                                    
                                    // Fix unescaped quotes inside strings
                                    // This regex looks for quotes that are not preceded by \ and not at string boundaries
                                    fixedJson = fixedJson.replace(
                                        /"([^"]*)"(?=\s*[,\]])/g, 
                                        (match, content) => {
                                            // Escape any unescaped quotes inside the content
                                            const escaped = content.replace(/(?<!\\)"/g, '\\"');
                                            return `"${escaped}"`;
                                        }
                                    );
                                    
                                    translations = JSON.parse(fixedJson);
                                    console.log('Fixed malformed JSON with unescaped quotes');
                                } catch (e2) {
                                    // Third attempt: try to parse as comma-separated strings
                                    console.error('Failed to fix JSON, attempting CSV-style extraction');

                                    // Remove the array brackets (use fixedOutput which has normalized quotes)
                                    let content = fixedOutput;

                                    // Find and extract just the array content
                                    const arrayStartIdx = content.indexOf('[');
                                    const arrayEndIdx = content.lastIndexOf(']');
                                    if (arrayStartIdx !== -1 && arrayEndIdx !== -1 && arrayEndIdx > arrayStartIdx) {
                                        content = content.substring(arrayStartIdx + 1, arrayEndIdx);
                                    } else {
                                        if (content.startsWith('[')) content = content.slice(1);
                                        if (content.endsWith(']')) content = content.slice(0, -1);
                                    }

                                    // Also clean up any markdown code fence markers that got through
                                    content = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();

                                    // Split by ", " pattern (comma followed by space and quote)
                                    const parts = content.split(/",\s*"/);

                                    if (parts.length > 0) {
                                        translations = parts.map((part, index) => {
                                            // Clean up each part
                                            let cleaned = part;
                                            // Remove leading/trailing quotes
                                            if (index === 0 && cleaned.startsWith('"')) {
                                                cleaned = cleaned.slice(1);
                                            }
                                            // Also clean any json prefix artifacts (like "```json\n[")
                                            if (index === 0) {
                                                cleaned = cleaned.replace(/^```json\s*\[?\s*"?/, '');
                                            }
                                            if (index === parts.length - 1 && cleaned.endsWith('"')) {
                                                cleaned = cleaned.slice(0, -1);
                                            }
                                            // Unescape escaped quotes
                                            cleaned = cleaned.replace(/\\"/g, '"');
                                            // Remove any trailing newlines or whitespace
                                            cleaned = cleaned.trim();
                                            return cleaned;
                                        }).filter(part => part.length > 0); // Filter out empty parts
                                        console.log(`CSV extraction found ${translations.length} translations`);
                                    } else {
                                        // Last resort: split by lines
                                        translations = cleanedOutput.split('\n')
                                            .map(line => line.trim())
                                            .filter(line => line.length > 0)
                                            .map(line => line.replace(/^["']|["']$/g, ''));
                                    }
                                }
                            }
                        } else {
                            // Last resort: split by lines
                            translations = cleanedOutput.split('\n')
                                .map(line => line.trim())
                                .filter(line => line.length > 0)
                                .map(line => line.replace(/^["']|["']$/g, ''));
                        }
                    }
                    
                    // Verify we have the right number of translations
                    if (translations.length !== textsToTranslate.length) {
                        console.error(`\n${'='.repeat(80)}`);
                        console.error(`CRITICAL: Translation count mismatch! Expected ${textsToTranslate.length}, got ${translations.length}`);
                        console.error(`${'='.repeat(80)}`);

                        // Find where the mismatch occurred by comparing lengths
                        const diff = textsToTranslate.length - translations.length;
                        console.error(`Missing ${diff} translation(s)`);

                        // Log first few and last few for debugging
                        console.error('\n--- First 5 original texts ---');
                        textsToTranslate.slice(0, 5).forEach((t, i) => console.error(`  [${i}] "${t.substring(0, 60)}${t.length > 60 ? '...' : ''}"`));

                        console.error('\n--- First 5 translations ---');
                        translations.slice(0, 5).forEach((t, i) => console.error(`  [${i}] "${t.substring(0, 60)}${t.length > 60 ? '...' : ''}"`));

                        console.error('\n--- Last 5 original texts ---');
                        textsToTranslate.slice(-5).forEach((t, i) => {
                            const idx = textsToTranslate.length - 5 + i;
                            console.error(`  [${idx}] "${t.substring(0, 60)}${t.length > 60 ? '...' : ''}"`);
                        });

                        console.error('\n--- Last 5 translations ---');
                        translations.slice(-5).forEach((t, i) => {
                            const idx = translations.length - 5 + i;
                            console.error(`  [${idx}] "${t.substring(0, 60)}${t.length > 60 ? '...' : ''}"`);
                        });

                        // Try to find merged translations by looking for unusually long ones
                        console.error('\n--- Checking for merged translations (unusually long) ---');
                        const avgOriginalLength = textsToTranslate.reduce((sum, t) => sum + t.length, 0) / textsToTranslate.length;
                        translations.forEach((t, i) => {
                            if (t.length > avgOriginalLength * 2.5) {
                                console.error(`  [${i}] POSSIBLE MERGE (len=${t.length}, avg=${Math.round(avgOriginalLength)}): "${t.substring(0, 100)}..."`);
                            }
                        });

                        // Try to align translations with originals by finding matching patterns
                        console.error('\n--- Attempting to find alignment issues ---');
                        let mismatchFound = false;
                        for (let i = 0; i < Math.min(translations.length, textsToTranslate.length); i++) {
                            const orig = textsToTranslate[i];
                            const trans = translations[i];

                            // Check if translation is suspiciously different in structure
                            // (e.g., original has no period but translation has multiple sentences)
                            const origSentences = (orig.match(/[.!?]/g) || []).length;
                            const transSentences = (trans.match(/[.!?]/g) || []).length;

                            if (transSentences > origSentences + 1 && !mismatchFound) {
                                console.error(`  [${i}] STRUCTURE MISMATCH - Original sentences: ${origSentences}, Translation sentences: ${transSentences}`);
                                console.error(`    Original: "${orig.substring(0, 80)}..."`);
                                console.error(`    Translation: "${trans.substring(0, 80)}..."`);
                                mismatchFound = true;
                            }
                        }

                        console.error(`${'='.repeat(80)}\n`);

                        // Create a safe array with original texts as fallback
                        const safeTranslations = [];
                        for (let i = 0; i < textsToTranslate.length; i++) {
                            if (i < translations.length && translations[i]) {
                                safeTranslations.push(translations[i]);
                            } else {
                                safeTranslations.push(textsToTranslate[i]);
                                console.warn(`Using original text for index ${i}: "${textsToTranslate[i].substring(0, 50)}..."`);
                            }
                        }
                        translations = safeTranslations;
                    } else {
                        console.log(`✓ Translation count matches: ${translations.length} items`);
                    }
                    
                    // Final validation and progress updates
                    for (let i = 0; i < translations.length; i++) {
                        const translation = translations[i];
                        const original = textsToTranslate[i];
                        
                        // Check if translation is actually different
                        const isTranslated = translation && 
                                            translation.length > 0 && 
                                            translation.toLowerCase() !== original.toLowerCase();
                        
                        // Send progress update for each translation
                        if (progressCallback && isTranslated) {
                            progressCallback({
                                type: 'individual_translation',
                                locale: targetLocale,
                                original: original,
                                translated: translation,
                                index: i,
                                total: textsToTranslate.length
                            });
                        }
                    }
                    
                    console.log(`Successfully translated ${translations.length} texts`);
                    console.log(`Translation completed for ${targetLocale}`);
                    resolve(isArray ? translations : translations[0]);
                } catch (parseError) {
                    console.error('Failed to parse Claude output:', parseError);
                    // Fallback to returning original text
                    resolve(isArray ? textsToTranslate : textsToTranslate[0]);
                }
            });

            claudeProcess.on('error', (err) => {
                clearTimeout(timeoutId);
                console.error('Failed to spawn Claude process:', err);
                // Fallback to returning original text
                resolve(isArray ? textsToTranslate : textsToTranslate[0]);
            });

            // Send the prompt via stdin
            claudeProcess.stdin.write(prompt);
            claudeProcess.stdin.end();
        });
    }

    getKeyPriority(key) {
        // Determine priority based on key path
        if (key.includes('error') || key.includes('warning') || key.includes('alert')) {
            return 'high';
        }
        if (key.includes('user') || key.includes('form') || key.includes('button')) {
            return 'high';
        }
        if (key.includes('admin') || key.includes('settings') || key.includes('config')) {
            return 'medium';
        }
        return 'low';
    }

    async saveLocale(localeCode, content) {
        const locale = this.locales.get(localeCode);
        if (!locale) throw new Error('Locale not found');

        // If no content provided, use the current locale keys
        const keysToSave = content || locale.keys;

        // Get the English locale as a reference for key ordering
        const enLocale = this.locales.get('en');

        // If we have an English reference, order keys to match it
        if (enLocale && localeCode !== 'en') {
            const orderedKeys = {};

            // First, add keys in the same order as English locale
            for (const key in enLocale.keys) {
                if (Object.prototype.hasOwnProperty.call(keysToSave, key)) {
                    orderedKeys[key] = keysToSave[key];
                }
            }

            // Then add any additional keys that exist in target but not in English
            for (const key in keysToSave) {
                if (!Object.prototype.hasOwnProperty.call(orderedKeys, key)) {
                    orderedKeys[key] = keysToSave[key];
                }
            }

            const unflattened = this.unflattenObject(orderedKeys);
            await fs.writeFile(locale.filePath, JSON.stringify(unflattened, null, 2));

            // Update in-memory data
            locale.content = unflattened;
            locale.keys = orderedKeys;
        } else {
            // For English or if no reference, save as is
            const unflattened = this.unflattenObject(keysToSave);
            await fs.writeFile(locale.filePath, JSON.stringify(unflattened, null, 2));

            // Update in-memory data
            locale.content = unflattened;
            locale.keys = keysToSave;
        }

        return true;
    }
}

module.exports = TranslationAPI;