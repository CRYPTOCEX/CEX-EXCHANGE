#!/usr/bin/env node

/**
 * Menu Translation Extractor
 * Extracts translatable strings from menu.ts and generates translation keys
 */

const fs = require('fs');
const path = require('path');

const MENU_FILE = path.join(__dirname, '../../../frontend/config/menu.ts');
const MESSAGES_DIR = path.join(__dirname, '../../../frontend/messages');
const OUTPUT_FILE = path.join(__dirname, 'menu-translations.json');

// Function to set nested property
function setNestedProperty(obj, keyPath, value) {
  const keys = keyPath.split('.');
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
function getNestedProperty(obj, keyPath) {
  const keys = keyPath.split('.');
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

// Function to generate a translation key from a menu key
function generateTranslationKey(menuKey, field = 'title') {
  // Convert admin-user-management -> menu.admin.userManagement.title
  const parts = menuKey.replace('admin-', '').split('-');
  const camelCase = parts.map((part, i) =>
    i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  return `menu.${field}.${camelCase}`;
}

// Function to recursively extract menu items
function extractMenuItems(items, parentKey = '') {
  const translations = {};

  items.forEach(item => {
    if (item.title && item.key) {
      const titleKey = `menu.${item.key.replace(/-/g, '.')}`;
      const descKey = `menu.${item.key.replace(/-/g, '.')}.description`;

      translations[titleKey] = item.title;
      if (item.description) {
        translations[descKey] = item.description;
      }
    }

    // Recursively process children
    if (item.child && Array.isArray(item.child)) {
      Object.assign(translations, extractMenuItems(item.child, item.key));
    }
  });

  return translations;
}

// Function to parse menu.ts file
function parseMenuFile() {
  console.log('📖 Reading menu.ts file...');
  const content = fs.readFileSync(MENU_FILE, 'utf8');

  // Extract adminMenu array using regex
  const adminMenuMatch = content.match(/export const adminMenu: MenuItem\[\] = (\[[\s\S]*?\n\]);/);
  if (!adminMenuMatch) {
    throw new Error('Could not find adminMenu in menu.ts');
  }

  // Parse the menu structure
  // This is a simplified parser - for production, consider using a proper AST parser
  const menuStr = adminMenuMatch[1];

  // Extract menu items using a more sophisticated approach
  const items = [];
  const lines = content.split('\n');
  let currentItem = null;
  let inMenu = false;
  let braceCount = 0;

  for (const line of lines) {
    if (line.includes('export const adminMenu')) {
      inMenu = true;
      continue;
    }

    if (!inMenu) continue;

    // Track braces to know when we're done
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;

    // Extract key
    const keyMatch = line.match(/key:\s*["']([^"']+)["']/);
    if (keyMatch) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = { key: keyMatch[1] };
    }

    // Extract title
    const titleMatch = line.match(/title:\s*["']([^"']+)["']/);
    if (titleMatch && currentItem) {
      currentItem.title = titleMatch[1];
    }

    // Extract description (multiline support)
    const descMatch = line.match(/description:\s*["']([^"']+)["']/);
    if (descMatch && currentItem) {
      currentItem.description = descMatch[1];
    }

    if (braceCount === 0 && inMenu) {
      if (currentItem) {
        items.push(currentItem);
      }
      break;
    }
  }

  return items;
}

// Function to update locale files with nested structure
function updateLocaleFiles(translations) {
  console.log('📝 Updating locale files...');

  const localeFiles = fs.readdirSync(MESSAGES_DIR)
    .filter(file => file.endsWith('.json'));

  let updatedCount = 0;

  for (const file of localeFiles) {
    const locale = file.replace('.json', '');
    const filePath = path.join(MESSAGES_DIR, file);

    let localeData = {};
    try {
      localeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`⚠️  Could not read ${file}, creating new`);
    }

    // Ensure menu namespace exists
    if (!localeData.menu) {
      localeData.menu = {};
    }

    // Add menu translations with nested structure
    let added = 0;
    for (const [key, value] of Object.entries(translations)) {
      // key is like "admin.dashboard.title", we need to add under menu namespace
      const fullPath = `menu.${key}`;
      const existing = getNestedProperty(localeData, fullPath);
      if (existing === undefined) {
        setNestedProperty(localeData, fullPath, locale === 'en' ? value : value);
        added++;
      }
    }

    if (added > 0) {
      fs.writeFileSync(filePath, JSON.stringify(localeData, null, 2) + '\n', 'utf8');
      console.log(`   ✅ ${locale}.json - Added ${added} translations`);
      updatedCount++;
    } else {
      console.log(`   ✓  ${locale}.json - Already up to date`);
    }
  }

  return updatedCount;
}

// Main function
function main() {
  try {
    console.log('🚀 Menu Translation Extractor\n');

    // Parse menu file
    const menuItems = parseMenuFile();
    console.log(`✅ Found ${menuItems.length} menu items\n`);

    // Extract translations (keys WITHOUT "menu." prefix, e.g., "admin.dashboard.title")
    const translations = {};
    menuItems.forEach(item => {
      if (item.key && item.title) {
        // Convert "admin-dashboard" to "admin.dashboard"
        const baseKey = item.key.replace(/-/g, '.');

        // Always use .title suffix for consistency
        translations[`${baseKey}.title`] = item.title;
        if (item.description) {
          translations[`${baseKey}.description`] = item.description;
        }
      }
    });

    console.log(`📊 Extracted ${Object.keys(translations).length} translation keys\n`);

    // Save extracted translations
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(translations, null, 2) + '\n');
    console.log(`💾 Saved to ${OUTPUT_FILE}\n`);

    // Update locale files
    const updated = updateLocaleFiles(translations);

    console.log(`\n✅ Done! Updated ${updated} locale files`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the generated translations in frontend/messages/`);
    console.log(`   2. Update menu.ts to use translation keys`);
    console.log(`   3. Update navigation components to use useTranslations()`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractMenuItems, parseMenuFile, updateLocaleFiles };
