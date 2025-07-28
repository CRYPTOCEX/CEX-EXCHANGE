require("dotenv").config({ path: require('path').join(__dirname, '../.env') });
const fs = require("fs/promises");
const path = require("path");
const glob = require("fast-glob");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

// Import Azure translator
const { translateLocaleFile } = require('./translate-locales-azure.js');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Handle multi-line environment variable with proper parsing
const languagesString = process.env.NEXT_PUBLIC_LANGUAGES || "";
const locales = languagesString
  ? languagesString
      .split(/[,\n\r]+/) // Split by comma, newline, or carriage return
      .map((l) => l.trim()) // Remove whitespace
      .filter((l) => l.length > 0) // Remove empty strings
  : ["en"];

const messagesDir = path.join(__dirname, "..", "frontend", "messages");

console.log(`🌍 Managing translations for ${locales.length} locales: ${locales.join(', ')}`);

// Utility functions
async function ensureMessageFiles() {
  await fs.mkdir(messagesDir, { recursive: true });
  for (const locale of locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, "{}", "utf8");
    }
  }
}

async function loadMessages() {
  const res = {};
  for (const locale of locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    try {
      const content = await fs.readFile(filePath, "utf8");
      res[locale] = JSON.parse(content);
    } catch {
      res[locale] = {};
    }
  }
  return res;
}

async function saveMessages(messages) {
  for (const locale of locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify(messages[locale], null, 2),
      "utf8"
    );
  }
}

// Clean translation key to be Next-intl compatible
function cleanTranslationKey(key) {
  // Don't clean simple keys that are already valid
  if (/^[a-zA-Z0-9_-]+$/.test(key)) {
    return key;
  }
  
  return key
    .replace(/[.]/g, '_') // Replace periods with underscores
    .replace(/[!]/g, '') // Remove exclamation marks
    .replace(/[?]/g, '') // Remove question marks
    .replace(/[,]/g, '') // Remove commas
    .replace(/[:]/g, '') // Remove colons
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase(); // Convert to lowercase
}

// Generate a clean key from text
function generateCleanKey(text) {
  if (!text || typeof text !== 'string') return 'untitled';
  
  // Don't clean simple keys that are already valid
  if (/^[a-zA-Z0-9_-]+$/.test(text)) {
    return text;
  }
  
  // For short text, use the cleaned version
  if (text.length <= 50) {
    return cleanTranslationKey(text);
  }
  
  // For long text, create a meaningful short key
  const words = text.split(/\s+/).slice(0, 4); // Take first 4 words
  return cleanTranslationKey(words.join(' '));
}

// Extract useTranslations calls from TSX files
async function extractTranslationKeysFromFiles() {
  console.log(`📂 Scanning TSX files for useTranslations...`);
  
  const files = await glob([
    "frontend/**/*.tsx",
    "!frontend/node_modules/**",
    "!frontend/.next/**",
    "!frontend/out/**",
    "!frontend/build/**"
  ], { cwd: path.join(__dirname, "..") });

  const extractedNamespaces = new Set();
  const fileUsageMap = new Map(); // Track which files use which namespaces
  const namespaceKeys = new Map(); // Track which keys are used in each namespace

  for (const filePath of files) {
    try {
      const fullPath = path.join(__dirname, "..", filePath);
      const content = await fs.readFile(fullPath, "utf8");
      
      // Check if file uses useTranslations
      if (!content.includes('useTranslations')) {
        continue;
      }

      const ast = parse(content, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      });

      let currentNamespace = null;

      traverse(ast, {
        CallExpression(path) {
          const { node } = path;
          
          // Look for useTranslations calls
          if (
            t.isIdentifier(node.callee, { name: "useTranslations" }) &&
            node.arguments.length > 0 &&
            t.isStringLiteral(node.arguments[0])
          ) {
            const namespace = node.arguments[0].value;
            currentNamespace = namespace;
            extractedNamespaces.add(namespace);
            
            if (!fileUsageMap.has(filePath)) {
              fileUsageMap.set(filePath, new Set());
            }
            fileUsageMap.get(filePath).add(namespace);
            
            if (!namespaceKeys.has(namespace)) {
              namespaceKeys.set(namespace, new Set());
            }
          }
          
          // Look for t("key") calls - assuming 't' is the translation function
          if (
            t.isIdentifier(node.callee, { name: "t" }) &&
            node.arguments.length > 0 &&
            t.isStringLiteral(node.arguments[0]) &&
            currentNamespace
          ) {
            const key = node.arguments[0].value;
            namespaceKeys.get(currentNamespace).add(key);
          }
        }
      });
      
    } catch (error) {
      console.warn(`⚠️  Error parsing ${filePath}:`, error.message);
    }
  }

  console.log(`✅ Found ${extractedNamespaces.size} translation namespaces in ${fileUsageMap.size} files`);
  
  return {
    namespaces: Array.from(extractedNamespaces),
    fileUsage: fileUsageMap,
    namespaceKeys: namespaceKeys
  };
}

// Flatten nested object to get all keys
function flattenObject(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      keys.push(...flattenObject(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

// Get value from nested object using path
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

// Set value in nested object using path
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
}

// Delete value from nested object using path
function deleteNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      return false;
    }
    current = current[part];
  }
  
  const lastPart = parts[parts.length - 1];
  if (lastPart in current) {
    delete current[lastPart];
    return true;
  }
  
  return false;
}

// Clean empty objects from nested structure
function cleanEmptyObjects(obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      cleanEmptyObjects(value);
      if (Object.keys(value).length === 0) {
        delete obj[key];
      }
    }
  }
}

// Update TSX files with new translation keys
async function updateTsxFiles(keyMigrations) {
  if (!keyMigrations || keyMigrations.size === 0) {
    return;
  }
  
  console.log(`🔄 Updating TSX files with new translation keys...`);
  
  const files = await glob([
    "frontend/**/*.tsx",
    "!frontend/node_modules/**",
    "!frontend/.next/**",
    "!frontend/out/**",
    "!frontend/build/**"
  ], { cwd: path.join(__dirname, "..") });
  
  let totalFilesUpdated = 0;
  let totalKeysUpdated = 0;
  
  for (const filePath of files) {
    try {
      const fullPath = path.join(__dirname, "..", filePath);
      let content = await fs.readFile(fullPath, "utf8");
      let fileChanged = false;
      
      // Check if file uses useTranslations
      if (!content.includes('useTranslations')) {
        continue;
      }
      
      // Update translation keys in the file
      for (const [oldKey, newKey] of keyMigrations) {
        // Extract namespace and key parts
        const oldParts = oldKey.split('.');
        const newParts = newKey.split('.');
        
        if (oldParts.length >= 2 && newParts.length >= 2) {
          const oldKeyPart = oldParts.slice(1).join('.');
          const newKeyPart = newParts.slice(1).join('.');
          
          if (oldKeyPart !== newKeyPart) {
            // Look for t("old key") patterns and replace with t("new key")
            const oldPattern = new RegExp(`t\\(["'\`]${oldKeyPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]\\)`, 'g');
            const newReplacement = `t("${newKeyPart}")`;
            
            if (oldPattern.test(content)) {
              content = content.replace(oldPattern, newReplacement);
              fileChanged = true;
              totalKeysUpdated++;
            }
          }
        }
      }
      
      if (fileChanged) {
        await fs.writeFile(fullPath, content, 'utf8');
        totalFilesUpdated++;
      }
      
    } catch (error) {
      console.warn(`⚠️  Error updating ${filePath}:`, error.message);
    }
  }
  
  if (totalFilesUpdated > 0) {
    console.log(`✅ Updated ${totalKeysUpdated} keys in ${totalFilesUpdated} TSX files`);
  } else {
    console.log(`✅ No TSX files needed updating`);
  }
}

// Fix invalid translation keys
async function fixInvalidKeys() {
  console.log(`🔧 Fixing invalid translation keys...`);
  
  const messages = await loadMessages();
  const keyMigrations = new Map(); // Track old -> new key mappings
  let totalFixed = 0;
  let foundBadKeys = false;
  
  for (const locale of locales) {
    const localeMessages = messages[locale] || {};
    const fixedMessages = {};
    
    function processObject(obj, currentPath = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          // This is a namespace, process recursively
          const cleanedKey = cleanTranslationKey(key);
          const newPath = currentPath ? `${currentPath}.${cleanedKey}` : cleanedKey;
          
          if (cleanedKey !== key) {
            keyMigrations.set(fullPath, newPath);
            totalFixed++;
          }
          
          if (!getNestedValue(fixedMessages, newPath)) {
            setNestedValue(fixedMessages, newPath, {});
          }
          
          processObject(value, newPath);
        } else {
          // This is a translation string
          const cleanedKey = generateCleanKey(key);
          const newPath = currentPath ? `${currentPath}.${cleanedKey}` : cleanedKey;
          
          if (cleanedKey !== key) {
            keyMigrations.set(fullPath, newPath);
            totalFixed++;
          }
          
          // Check for bad keys (where key === value)
          if (key === value && key.includes('_') && key !== key.toUpperCase()) {
            foundBadKeys = true;
          }
          
          setNestedValue(fixedMessages, newPath, value);
        }
      }
    }
    
    processObject(localeMessages);
    messages[locale] = fixedMessages;
  }
  
  if (totalFixed > 0) {
    console.log(`✅ Fixed ${totalFixed} invalid keys across all locales`);
    
    // Update TSX files with new keys
    await updateTsxFiles(keyMigrations);
    
    // Save the migration mapping for reference
    const migrationPath = path.join(messagesDir, 'key-migrations.json');
    const migrationData = {
      timestamp: new Date().toISOString(),
      migrations: Object.fromEntries(keyMigrations)
    };
    await fs.writeFile(migrationPath, JSON.stringify(migrationData, null, 2), 'utf8');
    console.log(`📄 Key migration mapping saved to: ${migrationPath}`);
    
    // Save updated messages
    await saveMessages(messages);
    console.log(`💾 Updated translation files saved`);
  } else {
    console.log(`✅ No invalid keys found - all keys are valid`);
    
    // Check if there are bad keys that need manual review
    if (foundBadKeys) {
      console.log(`\n⚠️  However, some keys may need manual review (key = value)`);
      console.log(`   Run: node manage-translations.js find-bad-keys`);
      console.log(`   This will identify keys that need proper human-readable values`);
    }
  }
  
  return keyMigrations;
}

// Migrate specific keys
async function migrateKeys(keyMappings) {
  console.log(`🔄 Migrating translation keys...`);
  
  if (!keyMappings || Object.keys(keyMappings).length === 0) {
    console.log(`⚠️  No key mappings provided`);
    return;
  }
  
  const messages = await loadMessages();
  const keyMigrationsMap = new Map(Object.entries(keyMappings));
  let totalMigrated = 0;
  
  for (const locale of locales) {
    const localeMessages = messages[locale] || {};
    
    for (const [oldKey, newKey] of Object.entries(keyMappings)) {
      const oldValue = getNestedValue(localeMessages, oldKey);
      if (oldValue !== undefined) {
        // Set new key with old value
        setNestedValue(localeMessages, newKey, oldValue);
        // Delete old key
        deleteNestedValue(localeMessages, oldKey);
        totalMigrated++;
      }
    }
    
    // Clean up empty objects
    cleanEmptyObjects(localeMessages);
  }
  
  if (totalMigrated > 0) {
    console.log(`✅ Migrated ${totalMigrated} keys across all locales`);
    
    // Update TSX files with new keys
    await updateTsxFiles(keyMigrationsMap);
    
    await saveMessages(messages);
    console.log(`💾 Updated translation files saved`);
  } else {
    console.log(`⚠️  No keys were migrated`);
  }
}

// Sync translations with extracted namespaces
async function syncTranslations() {
  console.log(`🔄 Starting translation sync...`);
  
  // Extract namespaces and keys from TSX files
  const { namespaces: extractedNamespaces, namespaceKeys } = await extractTranslationKeysFromFiles();
  
  // Load current messages
  await ensureMessageFiles();
  const messages = await loadMessages();
  
  // Get current namespaces from en.json
  const currentNamespaces = Object.keys(messages.en || {});
  
  // Find changes
  const newNamespaces = extractedNamespaces.filter(ns => !currentNamespaces.includes(ns));
  const removedNamespaces = currentNamespaces.filter(ns => !extractedNamespaces.includes(ns));
  
  console.log(`📊 Analysis:`);
  console.log(`  - Extracted namespaces: ${extractedNamespaces.length}`);
  console.log(`  - Current namespaces: ${currentNamespaces.length}`);
  console.log(`  - New namespaces: ${newNamespaces.length}`);
  console.log(`  - Removed namespaces: ${removedNamespaces.length}`);
  
  const changes = {
    added: newNamespaces,
    removed: removedNamespaces,
    keysAdded: 0
  };
  
  // Update English messages
  console.log(`📝 Updating English messages...`);
  
  if (!messages.en) {
    messages.en = {};
  }
  
  // Remove old namespaces
  for (const namespace of removedNamespaces) {
    if (messages.en[namespace]) {
      delete messages.en[namespace];
    }
  }
  
  // Add new namespaces and sync keys for all namespaces
  for (const namespace of extractedNamespaces) {
    if (!messages.en[namespace]) {
      messages.en[namespace] = {};
    }
    
    // Get keys used in this namespace from TSX files
    const usedKeys = namespaceKeys.get(namespace) || new Set();
    
    // Add missing keys to English messages
    for (const key of usedKeys) {
      if (!messages.en[namespace][key]) {
        // Create a reasonable default value for the key
        messages.en[namespace][key] = key;
        changes.keysAdded++;
      }
    }
  }
  
  // Apply same changes to other locales
  console.log(`🌍 Applying changes to other locales...`);
  
  for (const locale of locales) {
    if (locale === 'en') continue;
    
    if (!messages[locale]) {
      messages[locale] = {};
    }
    
    // Remove old namespaces
    for (const namespace of removedNamespaces) {
      if (messages[locale][namespace]) {
        delete messages[locale][namespace];
      }
    }
    
    // Sync namespaces and keys with English
    for (const namespace of extractedNamespaces) {
      if (!messages[locale][namespace]) {
        messages[locale][namespace] = {};
      }
      
      // Copy missing keys from English
      if (messages.en[namespace]) {
        for (const [key, value] of Object.entries(messages.en[namespace])) {
          if (!messages[locale][namespace][key]) {
            messages[locale][namespace][key] = value; // Start with English value
          }
        }
      }
    }
  }
  
  // Save all messages
  console.log(`💾 Saving updated messages...`);
  await saveMessages(messages);
  
  console.log(`✅ Translation sync completed!`);
  
  if (newNamespaces.length > 0) {
    console.log(`\n📋 New namespaces added:`);
    newNamespaces.forEach(ns => console.log(`  + ${ns}`));
  }
  
  if (changes.keysAdded > 0) {
    console.log(`\n🔑 New keys added: ${changes.keysAdded}`);
  }
  
  if (removedNamespaces.length > 0) {
    console.log(`\n🗑️  Namespaces removed:`);
    removedNamespaces.forEach(ns => console.log(`  - ${ns}`));
  }
  
  return changes;
}

// Find untranslated strings
async function findUntranslatedStrings() {
  console.log(`🔍 Finding untranslated strings...`);
  
  const messages = await loadMessages();
  const enMessages = messages.en || {};
  const enKeys = flattenObject(enMessages);
  
  const untranslatedByLocale = {};
  
  for (const locale of locales) {
    if (locale === 'en') continue;
    
    const localeMessages = messages[locale] || {};
    const untranslated = [];
    
    for (const key of enKeys) {
      const enValue = getNestedValue(enMessages, key);
      const localeValue = getNestedValue(localeMessages, key);
      
      // Consider untranslated if:
      // 1. Key doesn't exist in locale
      // 2. Value is same as English value (not translated)
      // 3. Value is empty or just the key name
      if (!localeValue || 
          localeValue === enValue || 
          localeValue === key.split('.').pop() ||
          localeValue.trim() === '') {
        untranslated.push(key);
      }
    }
    
    untranslatedByLocale[locale] = untranslated;
    console.log(`  ${locale}: ${untranslated.length} untranslated strings`);
  }
  
  return untranslatedByLocale;
}

// Translate untranslated strings using available translation services
async function translateUntranslatedStrings() {
  console.log(`🌐 Translating untranslated strings using Azure Translator...`);
  
  const untranslatedByLocale = await findUntranslatedStrings();
  
  for (const [locale, untranslatedKeys] of Object.entries(untranslatedByLocale)) {
    if (untranslatedKeys.length === 0) {
      console.log(`✅ ${locale}: Already fully translated`);
      continue;
    }
    
    console.log(`🔄 Translating ${untranslatedKeys.length} strings for ${locale}...`);
    
    try {
      await translateLocaleFile(locale);
      console.log(`✅ ${locale}: Translation completed`);
    } catch (error) {
      console.error(`❌ ${locale}: Translation failed -`, error.message);
    }
  }
}

// Find badly created translation keys where key and value are the same
async function findBadlyCreatedKeys() {
  console.log(`🔍 Finding badly created translation keys in English locale...`);
  
  const messages = await loadMessages();
  const enMessages = messages.en || {};
  const badKeys = [];
  
  function scanObject(obj, currentPath = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        // This is a namespace, scan recursively
        scanObject(value, fullPath);
      } else if (typeof value === 'string') {
        // This is a translation string, check if key and value are actually the same (badly created)
        // Skip keys that don't have underscores - they are likely valid single-word translations
        if (!key.includes('_')) {
          continue;
        }
        
        // Skip constants (all uppercase keys) - these are environment variables or config constants
        if (key === key.toUpperCase()) {
          continue;
        }
        
        // Check for truly bad keys - only exact matches where key === value
        const isBadKey = (
          // Only catch cases where key and value are exactly identical
          key === value
        );
        
        if (isBadKey) {
          
          badKeys.push({
            path: fullPath,
            key: key,
            value: value,
            namespace: currentPath || 'root'
          });
        }
      }
    }
  }
  
  scanObject(enMessages);
  
  console.log(`🔍 Found ${badKeys.length} badly created translation keys`);
  
  if (badKeys.length > 0) {
    console.log(`\n📋 Badly created keys (key and value are the same/similar):`);
    badKeys.forEach((item, index) => {
      console.log(`${index + 1}. ${item.path}`);
      console.log(`   Key: "${item.key}"`);
      console.log(`   Value: "${item.value}"`);
      console.log(`   Namespace: ${item.namespace}`);
      console.log('');
    });
    
    // Save the bad keys to a file for manual review
    const badKeysPath = path.join(messagesDir, 'bad-keys-report.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      totalBadKeys: badKeys.length,
      badKeys: badKeys.map(item => ({
        path: item.path,
        key: item.key,
        currentValue: item.value,
        namespace: item.namespace,
        suggestedValue: '', // To be filled manually
        needsManualReview: true
      }))
    };
    
    await fs.writeFile(badKeysPath, JSON.stringify(reportData, null, 2), 'utf8');
    console.log(`📄 Bad keys report saved to: ${badKeysPath}`);
    console.log(`\n❓ Why can't fix-keys handle these automatically?`);
    console.log(`   These keys have identical key and value (e.g., "order_failed" = "order_failed")`);
    console.log(`   The system needs human input to determine proper display text`);
    console.log(`   This prevents the system from making incorrect assumptions about intended meaning`);
    console.log(`\n🔧 Next steps:`);
    console.log(`1. Edit the bad-keys-report.json file`);
    console.log(`2. Fill in the "suggestedValue" field for each bad key with proper human-readable text`);
    console.log(`3. Run: node manage-translations.js fix-bad-keys`);
    console.log(`\n💡 Example:`);
    console.log(`   "order_failed" should become "Order failed" or "Order placement failed"`);
    console.log(`   "current_price" should become "Current Price" or "Market Price"`);
  }
  
  return badKeys;
}

// Fix badly created keys using manually provided values
async function fixBadlyCreatedKeys() {
  console.log(`🔧 Fixing badly created translation keys...`);
  
  const badKeysPath = path.join(messagesDir, 'bad-keys-report.json');
  
  try {
    const reportContent = await fs.readFile(badKeysPath, 'utf8');
    const reportData = JSON.parse(reportContent);
    
    if (!reportData.badKeys || reportData.badKeys.length === 0) {
      console.log(`⚠️  No bad keys found in report file`);
      return;
    }
    
    const messages = await loadMessages();
    let totalFixed = 0;
    let totalSkipped = 0;
    
    // Update English locale with manually provided values
    for (const badKey of reportData.badKeys) {
      if (!badKey.suggestedValue || badKey.suggestedValue.trim() === '') {
        console.log(`⚠️  Skipping ${badKey.path} - no suggested value provided`);
        totalSkipped++;
        continue;
      }
      
      // Update English locale
      setNestedValue(messages.en, badKey.path, badKey.suggestedValue.trim());
      console.log(`✅ Fixed: ${badKey.path} -> "${badKey.suggestedValue.trim()}"`);
      totalFixed++;
    }
    
    if (totalFixed > 0) {
      // Apply the English changes to all other locales
      console.log(`🌍 Applying changes to other locales...`);
      
      for (const locale of locales) {
        if (locale === 'en') continue;
        
        for (const badKey of reportData.badKeys) {
          if (!badKey.suggestedValue || badKey.suggestedValue.trim() === '') {
            continue;
          }
          
          // Set the new English value to all other locales (will be translated later)
          setNestedValue(messages[locale], badKey.path, badKey.suggestedValue.trim());
        }
      }
      
      // Save all updated messages
      await saveMessages(messages);
      console.log(`💾 Updated translation files saved`);
      
      // Create a backup of the report with timestamp
      const backupPath = path.join(messagesDir, `bad-keys-report-applied-${Date.now()}.json`);
      await fs.writeFile(backupPath, JSON.stringify(reportData, null, 2), 'utf8');
      console.log(`📄 Applied report backed up to: ${backupPath}`);
      
      console.log(`\n✅ Summary:`);
      console.log(`  - Fixed: ${totalFixed} keys`);
      console.log(`  - Skipped: ${totalSkipped} keys`);
      console.log(`\n🌐 Next step: Run translation to translate the new values to other locales`);
      console.log(`  node manage-translations.js translate`);
    } else {
      console.log(`⚠️  No keys were fixed. Please provide suggested values in the report file.`);
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ Bad keys report file not found: ${badKeysPath}`);
      console.log(`   Run 'node manage-translations.js find-bad-keys' first`);
    } else {
      console.error(`❌ Error reading bad keys report:`, error.message);
    }
  }
}

// Generate report
async function generateReport() {
  console.log(`📊 Generating translation report...`);
  
  const { namespaces: extractedNamespaces, fileUsage } = await extractTranslationKeysFromFiles();
  const messages = await loadMessages();
  const untranslatedByLocale = await findUntranslatedStrings();
  
  const enKeys = flattenObject(messages.en || {});
  
  const report = {
    summary: {
      totalNamespaces: extractedNamespaces.length,
      totalKeys: enKeys.length,
      totalFiles: fileUsage.size,
      locales: locales.length,
      timestamp: new Date().toISOString()
    },
    locales: {},
    namespaces: extractedNamespaces,
    files: Array.from(fileUsage.entries()).map(([file, namespaces]) => ({
      file: file.replace('frontend/', ''),
      namespaces: Array.from(namespaces)
    }))
  };
  
  for (const locale of locales) {
    const localeMessages = messages[locale] || {};
    const localeKeys = flattenObject(localeMessages);
    const untranslated = untranslatedByLocale[locale] || [];
    
    report.locales[locale] = {
      totalKeys: localeKeys.length,
      untranslated: untranslated.length,
      translated: localeKeys.length - untranslated.length,
      coverage: Math.round(((localeKeys.length - untranslated.length) / Math.max(localeKeys.length, 1)) * 100)
    };
  }
  
  // Save report
  const reportPath = path.join(messagesDir, 'translation-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`📋 Translation Report:`);
  console.log(`  Total Namespaces: ${report.summary.totalNamespaces}`);
  console.log(`  Total Keys: ${report.summary.totalKeys}`);
  console.log(`  Total Files: ${report.summary.totalFiles}`);
  console.log(`  Locales: ${report.summary.locales}`);
  console.log(`\n🌍 Locale Coverage:`);
  
  for (const [locale, data] of Object.entries(report.locales)) {
    console.log(`  ${locale}: ${data.coverage}% (${data.translated}/${data.totalKeys})`);
  }
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  return report;
}

// Main CLI interface
async function main() {
  try {
    switch (command) {
      case 'sync':
        await syncTranslations();
        break;
        
      case 'extract':
        const { namespaces } = await extractTranslationKeysFromFiles();
        console.log(`\n📋 Extracted ${namespaces.length} translation namespaces:`);
        namespaces.forEach(ns => console.log(`  ${ns}`));
        break;
        
      case 'untranslated':
        const untranslated = await findUntranslatedStrings();
        console.log(`\n🔍 Untranslated strings by locale:`);
        for (const [locale, keys] of Object.entries(untranslated)) {
          console.log(`\n${locale} (${keys.length} untranslated):`);
          keys.slice(0, 10).forEach(key => console.log(`  ${key}`));
          if (keys.length > 10) {
            console.log(`  ... and ${keys.length - 10} more`);
          }
        }
        break;
        
      case 'translate':
        await translateUntranslatedStrings();
        break;
        
      case 'find-bad-keys':
        await findBadlyCreatedKeys();
        break;
        
      case 'fix-bad-keys':
        await fixBadlyCreatedKeys();
        break;
        
      case 'report':
        await generateReport();
        break;
        
      case 'fix-keys':
        await fixInvalidKeys();
        break;
        
      case 'migrate':
        const mappingFile = args[1];
        if (!mappingFile) {
          console.error(`❌ Please provide a key mapping file: node manage-translations.js migrate <mapping.json>`);
          console.log(`\nExample mapping.json:`);
          console.log(`{`);
          console.log(`  "old.key.with.dots": "new_key_with_underscores",`);
          console.log(`  "another.old.key": "another_new_key"`);
          console.log(`}`);
          return;
        }
        
        try {
          const mappingPath = path.resolve(mappingFile);
          const mappingContent = await fs.readFile(mappingPath, 'utf8');
          const keyMappings = JSON.parse(mappingContent);
          await migrateKeys(keyMappings);
        } catch (error) {
          console.error(`❌ Error reading mapping file:`, error.message);
        }
        break;
        
      case 'full':
        console.log(`🚀 Running full translation management cycle...`);
        await fixInvalidKeys();
        await syncTranslations();
        await translateUntranslatedStrings();
        await generateReport();
        console.log(`🎉 Full cycle completed!`);
        break;
        
      case 'help':
      default:
        console.log(`🛠️  Translation Management Tool`);
        console.log(`================================`);
        console.log(`Usage: node manage-translations.js <command>`);
        console.log(``);
        console.log(`Commands:`);
        console.log(`  sync        - Extract namespaces from TSX files and sync with locale files`);
        console.log(`  extract     - Show all extracted translation namespaces`);
        console.log(`  untranslated- Find untranslated strings in all locales`);
        console.log(`  translate   - Translate untranslated strings using Azure Translator`);
        console.log(`  report      - Generate comprehensive translation report`);
        console.log(`  fix-keys    - Fix invalid translation keys (periods, special chars)`);
        console.log(`  migrate     - Migrate keys using mapping file`);
        console.log(`  find-bad-keys - Find badly created keys where key and value are the same`);
        console.log(`  fix-bad-keys  - Fix badly created keys using manually provided values`);
        console.log(`  full        - Run complete cycle (fix-keys + sync + translate + report)`);
        console.log(``);
        console.log(`Examples:`);
        console.log(`  node manage-translations.js sync`);
        console.log(`  node manage-translations.js fix-keys`);
        console.log(`  node manage-translations.js translate`);
        console.log(`  node manage-translations.js find-bad-keys`);
        console.log(`  node manage-translations.js fix-bad-keys`);
        console.log(`  node manage-translations.js migrate key-mappings.json`);
        console.log(`  node manage-translations.js full`);
        console.log(``);
        console.log(`Features:`);
        console.log(`  ✅ Scans TSX files for useTranslations() calls`);
        console.log(`  ✅ Syncs namespaces with locale files`);
        console.log(`  ✅ Removes unused translation keys`);
        console.log(`  ✅ Adds new translation keys to all locales`);
        console.log(`  ✅ Detects untranslated strings`);
        console.log(`  ✅ Uses Azure Translator for automatic translation`);
        console.log(`  ✅ Fixes invalid keys (periods, special characters)`);
        console.log(`  ✅ Detects and fixes badly created keys (key=value)`);
        console.log(`  ✅ Migrates keys with custom mappings`);
        console.log(`  ✅ Generates comprehensive reports`);
        break;
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  syncTranslations,
  findUntranslatedStrings,
  translateUntranslatedStrings,
  generateReport,
  extractTranslationKeysFromFiles,
  fixInvalidKeys,
  migrateKeys,
  findBadlyCreatedKeys,
  fixBadlyCreatedKeys,
  cleanTranslationKey,
  generateCleanKey
}; 