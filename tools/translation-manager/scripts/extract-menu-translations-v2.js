#!/usr/bin/env node

/**
 * Menu Translation Extractor V2
 * Automatically extracts menu translations and updates all locale files
 */

const fs = require('fs');
const path = require('path');

const MENU_FILE = path.join(__dirname, '../../../frontend/config/menu.ts');
const MESSAGES_DIR = path.join(__dirname, '../../../frontend/messages');
const OUTPUT_FILE = path.join(__dirname, 'menu-translations.json');

// Function to set nested property
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

// Function to get nested property
function getNestedProperty(obj, path) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

// Function to recursively extract menu items
function extractFromMenuItem(item, translations = {}) {
  if (item.key && item.title) {
    const baseKey = `menu.${item.key.replace(/-/g, '.')}`;

    // If there's a description, we need to use .title suffix to avoid conflicts
    // Otherwise, use the base key directly for the title
    if (item.description) {
      translations[`${baseKey}.title`] = item.title;
      translations[`${baseKey}.description`] = item.description;
    } else {
      translations[baseKey] = item.title;
    }
  }

  // Process children recursively
  if (item.child && Array.isArray(item.child)) {
    item.child.forEach(child => {
      extractFromMenuItem(child, translations);
    });
  }

  return translations;
}

// Function to parse the menu.ts file
function parseMenuFile() {
  console.log('📖 Reading and parsing menu.ts...');
  const content = fs.readFileSync(MENU_FILE, 'utf8');

  // Extract all menu items manually
  const items = [];
  const lines = content.split('\n');
  let currentStack = [];
  let currentItem = null;
  let inDescription = false;
  let description = '';
  let inMenu = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start of adminMenu
    if (line.includes('export const adminMenu')) {
      inMenu = true;
      continue;
    }

    if (!inMenu) continue;

    // Track when we enter/exit objects
    if (line === '{' && currentItem) {
      currentStack.push(currentItem);
      currentItem = {};
    } else if (line === '},') {
      if (currentStack.length > 0) {
        const parent = currentStack[currentStack.length - 1];
        if (currentItem && currentItem.key) {
          if (!parent.child) parent.child = [];
          parent.child.push(currentItem);
        }
        currentItem = currentStack.pop();
      } else {
        if (currentItem && currentItem.key) {
          items.push(currentItem);
        }
        currentItem = null;
      }
    } else if (line === '];') {
      // End of menu
      if (currentItem && currentItem.key) {
        items.push(currentItem);
      }
      break;
    }

    // Extract properties
    const keyMatch = line.match(/^key:\s*["']([^"']+)["'],?$/);
    if (keyMatch) {
      if (!currentItem) currentItem = {};
      currentItem.key = keyMatch[1];
    }

    const titleMatch = line.match(/^title:\s*["']([^"']+)["'],?$/);
    if (titleMatch) {
      if (currentItem) currentItem.title = titleMatch[1];
    }

    // Description can be multiline
    if (line.startsWith('description:')) {
      inDescription = true;
      const descMatch = line.match(/description:\s*["']([^"']*)/);
      if (descMatch) {
        description = descMatch[1];
        if (line.endsWith('",') || line.endsWith('",')) {
          if (currentItem) currentItem.description = description.trim();
          inDescription = false;
          description = '';
        }
      }
    } else if (inDescription) {
      if (line.endsWith('",') || line.endsWith('",')) {
        description += ' ' + line.replace(/["'],?$/, '').trim();
        if (currentItem) currentItem.description = description.trim();
        inDescription = false;
        description = '';
      } else {
        description += ' ' + line.trim();
      }
    }

    // Check for child array
    if (line.includes('child: [')) {
      if (currentItem) currentItem.child = [];
    }
  }

  return items;
}

// Function to recursively flatten menu structure
function flattenMenu(items, result = []) {
  items.forEach(item => {
    result.push(item);
    if (item.child && Array.isArray(item.child)) {
      flattenMenu(item.child, result);
    }
  });
  return result;
}

// Function to update locale files with nested structure
function updateLocaleFiles(translations) {
  console.log('\n📝 Updating locale files...');

  const localeFiles = fs.readdirSync(MESSAGES_DIR)
    .filter(file => file.endsWith('.json'));

  const stats = {
    updated: 0,
    added: 0,
    skipped: 0
  };

  for (const file of localeFiles) {
    const locale = file.replace('.json', '');
    const filePath = path.join(MESSAGES_DIR, file);

    let localeData = {};
    try {
      localeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`⚠️  Could not read ${file}, creating new`);
    }

    // Add menu translations with nested structure
    let added = 0;
    for (const [key, value] of Object.entries(translations)) {
      const existing = getNestedProperty(localeData, key);
      if (existing === undefined) {
        // For English, use the extracted value; for others, use the same as placeholder
        setNestedProperty(localeData, key, locale === 'en' ? value : value);
        added++;
      }
    }

    if (added > 0) {
      fs.writeFileSync(filePath, JSON.stringify(localeData, null, 2) + '\n', 'utf8');
      console.log(`   ✅ ${locale}.json - Added ${added} keys`);
      stats.updated++;
      stats.added += added;
    } else {
      console.log(`   ⏭️  ${locale}.json - All keys already exist`);
      stats.skipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Files updated: ${stats.updated}`);
  console.log(`   - Files skipped: ${stats.skipped}`);
  console.log(`   - Total keys added: ${stats.added}`);

  return stats;
}

// Main function
function main() {
  try {
    console.log('🚀 Menu Translation Extractor V2\n');
    console.log('═'.repeat(50));

    // Parse menu file
    const menuItems = parseMenuFile();
    const flatItems = flattenMenu(menuItems);
    console.log(`\n✅ Successfully parsed menu structure`);
    console.log(`   - Top-level items: ${menuItems.length}`);
    console.log(`   - Total items (including nested): ${flatItems.length}`);

    // Extract all translations
    const translations = {};
    flatItems.forEach(item => {
      Object.assign(translations, extractFromMenuItem(item));
    });

    console.log(`\n📊 Extraction Results:`);
    console.log(`   - Translation keys: ${Object.keys(translations).length}`);
    console.log(`   - Title keys: ${Object.keys(translations).filter(k => k.includes('.title') || (!k.includes('.description') && !k.includes('.title'))).length}`);
    console.log(`   - Description keys: ${Object.keys(translations).filter(k => k.includes('.description')).length}`);

    // Save extracted translations
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(translations, null, 2) + '\n');
    console.log(`\n💾 Saved extracted translations to:`);
    console.log(`   ${OUTPUT_FILE}`);

    // Show sample of extracted keys
    const sampleKeys = Object.keys(translations).slice(0, 5);
    console.log(`\n📋 Sample translation keys:`);
    sampleKeys.forEach(key => {
      const value = translations[key];
      const display = value.length > 50 ? value.substring(0, 47) + '...' : value;
      console.log(`   ${key}: "${display}"`);
    });

    // Update locale files
    const stats = updateLocaleFiles(translations);

    console.log(`\n${'═'.repeat(50)}`);
    console.log('✅ Menu translation extraction complete!');

    if (stats.added > 0) {
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Update menu.ts to use translation keys (t('menu.key'))`);
      console.log(`   2. Update navigation components to use useTranslations('menu')`);
      console.log(`   3. Translate non-English locales using Translation Manager`);
    } else {
      console.log(`\n✅ All menu translations are already in locale files!`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { parseMenuFile, extractFromMenuItem, flattenMenu, updateLocaleFiles };
