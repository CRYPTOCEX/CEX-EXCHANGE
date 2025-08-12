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
        
        for (const key in obj) {
            const keys = key.split('.');
            let current = result;
            
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = current[keys[i]] || {};
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = obj[key];
        }
        
        return result;
    }

    calculateProgress(locale) {
        if (!locale || locale === 'en') return { progress: 100, translated: locale?.totalKeys || 0, missing: 0 };
        
        const enKeys = this.locales.get('en')?.keys || {};
        const localeKeys = locale.keys || {};
        
        let translated = 0;
        let identical = 0;
        
        for (const key in enKeys) {
            if (localeKeys[key]) {
                if (localeKeys[key] !== enKeys[key]) {
                    translated++;
                } else {
                    identical++;
                }
            }
        }
        
        const total = Object.keys(enKeys).length;
        const missing = total - translated - identical;
        const progress = Math.round(((translated) / total) * 100);
        
        return { progress, translated, missing, identical, total };
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
        
        for (const key in sourceKeys) {
            if (targetKeys[key] && sourceKeys[key] === targetKeys[key]) {
                identical.push({
                    key,
                    value: sourceKeys[key]
                });
            }
        }
        
        return identical;
    }

    async callClaudeCode(texts, targetLocale, context = '', progressCallback = null) {
        // Handle both single text and array of texts
        const isArray = Array.isArray(texts);
        const textsToTranslate = isArray ? texts : [texts];
        
        // Build prompt for batch translation
        const languageName = this.getLanguageName(targetLocale);
        
        // Use JSON format for more reliable parsing
        let prompt = `You are a professional translator. Translate the following English texts to ${languageName}.

IMPORTANT RULES:
1. Translate ALL texts, even common words like "Platform", "Volume", "Blog", "Filter", "Items"
2. For words like "Platform" that might seem like they could stay the same, you MUST provide the proper ${languageName} translation
3. Technical terms that are universally used (like "API", "URL", "HTML") can remain unchanged
4. Brand names and product names should remain unchanged
5. Preserve any placeholders like {name}, {count}, %s, %d
6. Keep HTML tags unchanged if present

${context ? `Context: ${context}\n` : ''}

Translate each of these English texts to ${languageName} and return a JSON array with EXACTLY ${textsToTranslate.length} translations in the same order:

${textsToTranslate.map((text, i) => `[${i}] "${text}"`).join('\n')}

Return ONLY a JSON array of ${textsToTranslate.length} translated strings, like ["translation1", "translation2", ...]. No other text or explanation:`;

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
            
            // Use claude with the prompt directly via stdin
            const claudeProcess = spawn(claudeCommand, [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                windowsHide: true
            });

            let output = '';
            let error = '';
            let hasReceivedData = false;
            let timeoutId;

            // Set timeout for the command
            timeoutId = setTimeout(() => {
                claudeProcess.kill();
                console.error('Claude command timed out');
                if (progressCallback) {
                    progressCallback({
                        type: 'batch_error',
                        locale: targetLocale,
                        error: 'Translation timeout'
                    });
                }
                // Fallback to returning original text
                resolve(isArray ? textsToTranslate : textsToTranslate[0]);
            }, 45000); // 45 second timeout for larger batches

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
                    console.error(`Claude process exited with code ${code}`);
                    if (error) console.error(`Error: ${error}`);
                    if (progressCallback) {
                        progressCallback({
                            type: 'batch_error',
                            locale: targetLocale,
                            error: error || 'Translation failed'
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
                        // Try to parse as JSON array
                        const parsed = JSON.parse(cleanedOutput);
                        if (Array.isArray(parsed)) {
                            translations = parsed;
                        } else {
                            throw new Error('Response is not a JSON array');
                        }
                    } catch (jsonError) {
                        console.warn('Failed to parse as JSON, falling back to line-by-line parsing:', jsonError.message);
                        
                        // Fallback: try to extract JSON array from the text
                        const jsonMatch = cleanedOutput.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            try {
                                translations = JSON.parse(jsonMatch[0]);
                            } catch (e) {
                                console.error('Failed to extract JSON array from response');
                                // Last resort: split by lines
                                translations = cleanedOutput.split('\n')
                                    .map(line => line.trim())
                                    .filter(line => line.length > 0)
                                    .map(line => line.replace(/^["']|["']$/g, ''));
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
                        console.error(`CRITICAL: Translation count mismatch! Expected ${textsToTranslate.length}, got ${translations.length}`);
                        console.log('Original texts:', textsToTranslate);
                        console.log('Received translations:', translations);
                        
                        // Create a safe array with original texts as fallback
                        const safeTranslations = [];
                        for (let i = 0; i < textsToTranslate.length; i++) {
                            if (i < translations.length && translations[i]) {
                                safeTranslations.push(translations[i]);
                            } else {
                                safeTranslations.push(textsToTranslate[i]);
                                console.warn(`Using original text for index ${i}: "${textsToTranslate[i]}"`);
                            }
                        }
                        translations = safeTranslations;
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

        const unflattened = this.unflattenObject(content);
        await fs.writeFile(locale.filePath, JSON.stringify(unflattened, null, 2));
        
        // Update in-memory data
        locale.content = unflattened;
        locale.keys = content;
        
        return true;
    }
}

module.exports = TranslationAPI;