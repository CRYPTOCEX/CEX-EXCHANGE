const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration from environment variables
const config = {
  apiKey: process.env.AZURE_TRANSLATOR_KEY,
  region: process.env.AZURE_TRANSLATOR_REGION || 'global',
  endpoint: process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com',
  batchSize: parseInt(process.env.TRANSLATION_BATCH_SIZE || '50'), // Reduced batch size to avoid rate limits
  delayMs: parseInt(process.env.TRANSLATION_DELAY_MS || '500'),    // Increased delay between batches
  retries: parseInt(process.env.TRANSLATION_RETRIES || '5')        // More retries for rate limits
};

console.log(`🔷 Using Microsoft Azure Translator`);
console.log(`⚙️  Region: ${config.region}, Endpoint: ${config.endpoint}`);
console.log(`⚙️  Batch size: ${config.batchSize}, Delay: ${config.delayMs}ms`);

// Azure Translator language mappings
const languages = {
  'es': 'es',      // Spanish
  'fr': 'fr',      // French
  'de': 'de',      // German
  'it': 'it',      // Italian
  'pt': 'pt',      // Portuguese
  'ru': 'ru',      // Russian
  'ja': 'ja',      // Japanese
  'ko': 'ko',      // Korean
  'zh': 'zh-Hans', // Chinese (Simplified)
  'ar': 'ar',      // Arabic
  'hi': 'hi',      // Hindi
  'tr': 'tr',      // Turkish
  'pl': 'pl',      // Polish
  'nl': 'nl',      // Dutch
  'sv': 'sv',      // Swedish
  'da': 'da',      // Danish
  'nb': 'nb',      // Norwegian
  'fi': 'fi',      // Finnish
  'cs': 'cs',      // Czech
  'sk': 'sk',      // Slovak
  'hu': 'hu',      // Hungarian
  'ro': 'ro',      // Romanian
  'bg': 'bg',      // Bulgarian
  'hr': 'hr',      // Croatian
  'sl': 'sl',      // Slovenian
  'et': 'et',      // Estonian
  'lv': 'lv',      // Latvian
  'lt': 'lt',      // Lithuanian
  'el': 'el',      // Greek
  'uk': 'uk',      // Ukrainian
  'id': 'id',      // Indonesian
  'ms': 'ms',      // Malay
  'th': 'th',      // Thai
  'vi': 'vi',      // Vietnamese
  'he': 'he',      // Hebrew
  'fa': 'fa',      // Persian
  'ur': 'ur',      // Urdu
  'bn': 'bn',      // Bengali
  'ta': 'ta',      // Tamil
  'te': 'te',      // Telugu
  'ml': 'ml',      // Malayalam
  'kn': 'kn',      // Kannada
  'gu': 'gu',      // Gujarati
  'pa': 'pa',      // Punjabi
  'mr': 'mr',      // Marathi
  'ne': 'ne',      // Nepali
  'si': 'si',      // Sinhala
  'my': 'my',      // Myanmar
  'km': 'km',      // Khmer
  'lo': 'lo',      // Lao
  'ka': 'ka',      // Georgian
  'am': 'am',      // Amharic
  'is': 'is',      // Icelandic
  'mt': 'mt',      // Maltese
  'cy': 'cy',      // Welsh
  'ga': 'ga',      // Irish
  'eu': 'eu',      // Basque
  'ca': 'ca',      // Catalan
  'gl': 'gl',      // Galician
  'af': 'af',      // Afrikaans
  'sw': 'sw',      // Swahili
  'zu': 'zu',      // Zulu
  'xh': 'xh',      // Xhosa
  'sn': 'sn',      // Shona
  'rw': 'rw',      // Kinyarwanda
  'ny': 'ny',      // Chichewa
  'mg': 'mg',      // Malagasy
  'eo': 'eo',      // Esperanto
  'la': 'la',      // Latin
  'jv': 'jv',      // Javanese
  'su': 'su',      // Sundanese
  'tl': 'tl',      // Filipino
  'haw': 'haw',    // Hawaiian
  'mi': 'mi',      // Maori
  'sm': 'sm',      // Samoan
  'to': 'to',      // Tongan
  'fj': 'fj',      // Fijian
  'ty': 'ty'       // Tahitian
};

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Azure Translator API translation function
async function translateWithAzure(texts, targetLang, retries = config.retries) {
  if (!config.apiKey) {
    throw new Error('AZURE_TRANSLATOR_KEY not found in environment variables');
  }

  if (!texts || texts.length === 0) return [];

  try {
    // Prepare the request data
    const requestBody = texts.map(text => ({ text: text || '' }));
    const postData = JSON.stringify(requestBody);

    const url = new URL(`${config.endpoint}/translate`);
    url.searchParams.append('api-version', '3.0');
    url.searchParams.append('from', 'en');
    url.searchParams.append('to', targetLang);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': config.apiKey,
        'Ocp-Apim-Subscription-Region': config.region,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (res.statusCode !== 200) {
              reject(new Error(result.error?.message || `HTTP ${res.statusCode}: ${data}`));
              return;
            }
            
            const translations = result.map(item => 
              item.translations && item.translations[0] ? item.translations[0].text : ''
            );
            resolve(translations);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

  } catch (error) {
    console.warn(`Azure translation failed:`, error.message);
    
    // Check if it's a rate limit error
    const isRateLimit = error.message.includes('exceeded request limits') || 
                       error.message.includes('429') ||
                       error.message.includes('Too Many Requests');
    
    if (retries > 0) {
      // Use exponential backoff for rate limits, shorter delay for other errors
      const baseDelay = isRateLimit ? 5000 : 1000; // 5s for rate limits, 1s for others
      const delay = baseDelay * Math.pow(2, config.retries - retries); // Exponential backoff
      
      console.log(`⏳ Retrying in ${delay/1000}s... (${retries} attempts left)`);
      await sleep(delay);
      return translateWithAzure(texts, targetLang, retries - 1);
    }
    
    throw error;
  }
}

// Function to collect texts that need translation
function collectUntranslatedTexts(enObj, targetObj, path = '') {
  const untranslatedTexts = [];
  const textMap = new Map(); // Maps text to its path for reconstruction
  
  function traverse(enData, targetData, currentPath) {
    for (const [key, value] of Object.entries(enData)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (typeof value === 'string') {
        const targetValue = targetData && targetData[key];
        
        // Check if translation is needed
        const needsTranslation = !targetValue || 
                                targetValue === value || // Same as English
                                targetValue === key ||   // Just the key name
                                targetValue.trim() === ''; // Empty
        
        if (needsTranslation && shouldTranslateText(value)) {
          untranslatedTexts.push(value);
          textMap.set(value, fullPath);
        }
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, targetData && targetData[key], fullPath);
      }
    }
  }
  
  traverse(enObj, targetObj, path);
  return { untranslatedTexts, textMap };
}

// Function to check if text should be translated
function shouldTranslateText(text) {
  if (!text || text.trim() === '') return false;
  
  // Skip symbols, numbers, punctuation only
  if (text.match(/^[\d\s\(\)\[\]{}.,;:!?@#$%^&*+=<>\/\\|`~"'-]+$/)) return false;
  
  // Skip URLs, emails, technical terms
  if (text.match(/^(https?:\/\/|www\.|@|#|\$|%|&|\+|=|<|>|\/|\\|\||`|~)/) || 
      text.match(/\.(com|org|net|io|co|uk|de|fr|es|it|ru|jp|cn)$/i)) return false;
  
  return true;
}

// Function to apply translations to target object
function applyTranslationsToObject(enObj, targetObj, translationMap) {
  const result = JSON.parse(JSON.stringify(targetObj || {})); // Deep clone
  
  function traverse(enData, targetData, currentPath) {
    for (const [key, value] of Object.entries(enData)) {
      if (typeof value === 'string') {
        const translation = translationMap.get(value);
        if (translation) {
          if (!targetData[key]) targetData[key] = {};
          targetData[key] = translation;
        } else if (!targetData[key]) {
          // Keep English as fallback if no translation available
          targetData[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        if (!targetData[key]) targetData[key] = {};
        traverse(value, targetData[key], currentPath);
      }
    }
  }
  
  traverse(enObj, result, '');
  return result;
}

// Function to translate object with intelligent processing
async function translateObjectBatch(enObj, targetObj, targetLang) {
  console.log(`📝 Analyzing texts for translation...`);
  
  // Collect only untranslated texts
  const { untranslatedTexts, textMap } = collectUntranslatedTexts(enObj, targetObj);
  const uniqueTexts = [...new Set(untranslatedTexts)];
  
  console.log(`🔤 Found ${uniqueTexts.length} unique texts that need translation`);
  
  if (uniqueTexts.length === 0) {
    console.log(`✅ No translation needed - all texts are already translated!`);
    return targetObj || JSON.parse(JSON.stringify(enObj));
  }
  
  console.log(`⏱️  Estimated time: ${Math.round((uniqueTexts.length / config.batchSize * config.delayMs) / 1000)} seconds`);
  
  // Create translation map
  const translationMap = new Map();
  
  let successCount = 0;
  let failureCount = 0;
  
  // Process in batches
  for (let i = 0; i < uniqueTexts.length; i += config.batchSize) {
    const batch = uniqueTexts.slice(i, i + config.batchSize);
    const batchNum = Math.floor(i / config.batchSize) + 1;
    const totalBatches = Math.ceil(uniqueTexts.length / config.batchSize);
    
    console.log(`🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} texts)...`);
    
    try {
      const translations = await translateWithAzure(batch, targetLang);
      
      // Store translations
      batch.forEach((text, index) => {
        if (translations[index] && translations[index] !== text) {
          translationMap.set(text, translations[index]);
          successCount++;
        } else {
          translationMap.set(text, text); // Keep original
          failureCount++;
        }
      });
      
      // Progress indicator
      const progress = Math.round(((i + batch.length) / uniqueTexts.length) * 100);
      console.log(`✅ Batch ${batchNum} completed (${progress}% total progress)`);
      console.log(`📊 Success: ${successCount}, Failed: ${failureCount}`);
      
    } catch (error) {
      console.error(`❌ Batch ${batchNum} failed:`, error.message);
      
      // Add failed texts as-is
      batch.forEach(text => {
        translationMap.set(text, text);
        failureCount++;
      });
    }
    
    // Delay between batches (longer delay to avoid rate limits)
    if (i + config.batchSize < uniqueTexts.length) {
      await sleep(config.delayMs);
    }
  }
  
  console.log(`🎯 Translation completed!`);
  console.log(`✅ Successfully translated: ${successCount} texts`);
  console.log(`❌ Failed/Kept original: ${failureCount} texts`);
  console.log(`📈 Success rate: ${uniqueTexts.length > 0 ? Math.round((successCount / uniqueTexts.length) * 100) : 100}%`);
  
  // Apply translations to target object
  return applyTranslationsToObject(enObj, targetObj, translationMap);
}

// Function to translate a single locale file
async function translateLocaleFile(langCode) {
  const messagesDir = path.join(__dirname, '../frontend/messages');
  const enFilePath = path.join(messagesDir, 'en.json');
  const targetFilePath = path.join(messagesDir, `${langCode}.json`);
  
  if (!languages[langCode]) {
    throw new Error(`Unsupported language code: ${langCode}`);
  }
  
  const targetLang = languages[langCode];
  
  try {
    console.log(`🌍 Starting Azure translation for ${langCode} (${targetLang})...`);
    
    // Read English file
    console.log(`📖 Reading English source file...`);
    const enContent = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
    
    // Read existing target file if it exists
    let existingContent = {};
    if (fs.existsSync(targetFilePath)) {
      console.log(`📖 Reading existing ${langCode} file...`);
      try {
        existingContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
      } catch (error) {
        console.warn(`⚠️  Could not parse existing ${langCode}.json, starting fresh`);
        existingContent = {};
      }
    }
    
    // Translate content (only missing/untranslated strings)
    console.log(`🔄 Translating content with Azure...`);
    const translatedContent = await translateObjectBatch(enContent, existingContent, targetLang);
    
    // Write translated file
    console.log(`💾 Writing translated file...`);
    fs.writeFileSync(targetFilePath, JSON.stringify(translatedContent, null, 2), 'utf8');
    
    console.log(`✅ Successfully translated ${langCode}.json`);
    console.log(`📊 File size: ${(fs.statSync(targetFilePath).size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error(`❌ Error translating ${langCode}.json:`, error.message);
    throw error;
  }
}

// Function to translate all locale files
async function translateAllLocales() {
  const langCodes = Object.keys(languages);
  console.log(`🚀 Starting Azure translation for ${langCodes.length} languages...`);
  
  let completed = 0;
  let failed = 0;
  
  for (const langCode of langCodes) {
    try {
      console.log(`\n🔄 [${completed + failed + 1}/${langCodes.length}] Translating ${langCode}...`);
      await translateLocaleFile(langCode);
      completed++;
      console.log(`✅ Completed: ${completed}, Failed: ${failed}, Remaining: ${langCodes.length - completed - failed}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to translate ${langCode}:`, error.message);
    }
    
    // Small delay between languages
    await sleep(1000);
  }
  
  console.log(`\n🎉 Azure translation complete!`);
  console.log(`✅ Successfully translated: ${completed} languages`);
  console.log(`❌ Failed: ${failed} languages`);
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const langCode = process.argv[3];
  
  if (command === 'all') {
    await translateAllLocales();
  } else if (command === 'single' && langCode) {
    if (!languages[langCode]) {
      console.error(`❌ Unsupported language code: ${langCode}`);
      console.log('Available languages:', Object.keys(languages).join(', '));
      return;
    }
    await translateLocaleFile(langCode);
  } else {
    console.log('🔷 Microsoft Azure Translator');
    console.log('=============================');
    console.log('Usage:');
    console.log('  node translate-locales-azure.js all              # Translate all languages');
    console.log('  node translate-locales-azure.js single <lang>    # Translate single language');
    console.log('');
    console.log('Available languages:', Object.keys(languages).join(', '));
    console.log('');
    console.log('Setup required:');
    console.log('1. Sign up at https://azure.microsoft.com/services/cognitive-services/translator/');
    console.log('2. Create a Translator resource');
    console.log('3. Get your API key and region');
    console.log('4. Add to .env:');
    console.log('   AZURE_TRANSLATOR_KEY=your-api-key');
    console.log('   AZURE_TRANSLATOR_REGION=your-region');
    console.log('');
    console.log('Pricing: $10/month for 2M characters (pay-as-you-go available)');
    console.log('Quality: Excellent, comparable to Google Translate');
    console.log('Payment: Credit card, PayPal, bank transfer, invoice');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { translateLocaleFile, translateAllLocales, languages }; 