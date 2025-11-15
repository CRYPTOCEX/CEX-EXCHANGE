#!/usr/bin/env node

/**
 * Menu Translation Extractor
 * Extracts translatable strings from menu.ts and generates translation keys
 */

const fs = require('fs');
const path = require('path');

const MENU_FILE = path.join(__dirname, '../frontend/config/menu.ts');
const MESSAGES_DIR = path.join(__dirname, '../frontend/messages');
const OUTPUT_FILE = path.join(__dirname, 'menu-translations.json');

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

// Function to update locale files
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

    // Add menu translations if they don't exist
    let added = 0;
    for (const [key, value] of Object.entries(translations)) {
      if (!localeData[key]) {
        localeData[key] = locale === 'en' ? value : value; // For non-English, keep English as placeholder
        added++;
      }
    }

    if (added > 0) {
      // Sort keys alphabetically
      const sorted = {};
      Object.keys(localeData).sort().forEach(key => {
        sorted[key] = localeData[key];
      });

      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
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

    // Extract translations
    const translations = {};
    menuItems.forEach(item => {
      if (item.key && item.title) {
        const titleKey = `menu.${item.key.replace(/-/g, '.')}`;
        const descKey = `${titleKey}.description`;

        translations[titleKey] = item.title;
        if (item.description) {
          translations[descKey] = item.description;
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
