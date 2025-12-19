#!/usr/bin/env node

/**
 * Menu Translation Extractor V2
 * Automatically extracts menu translations and updates all locale files
 * - Extracts from main admin menu (frontend/config/menu.ts)
 * - Extracts from navbar menu files (frontend/app/[locale]/(ext)/...menu.ts)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const MENU_FILE = path.join(__dirname, '../../../frontend/config/menu.ts');
const NAVBAR_MENU_DIR = path.join(__dirname, '../../../frontend/app/[locale]/(ext)');
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
// Returns keys with nested dot notation: admin.dashboard.title, admin.dashboard.description
// Keys use dots for nesting (hyphen to dot conversion): admin-dashboard -> admin.dashboard
function extractFromMenuItem(item, translations = {}) {
  if (item.key && item.title) {
    // Convert "admin-dashboard" to "admin.dashboard" (use dots for nested structure)
    const nestedKey = item.key.replace(/-/g, '.');

    // Use nested keys with dots: admin.dashboard.title, admin.dashboard.description
    translations[`${nestedKey}.title`] = item.title;
    if (item.description) {
      translations[`${nestedKey}.description`] = item.description;
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

// Function to parse a menu array from content
// menuName: 'adminMenu' or 'userMenu'
function parseMenuArray(content, menuName) {
  const items = [];
  const lines = content.split('\n');
  let currentStack = [];
  let currentItem = null;
  let inDescription = false;
  let description = '';
  let inMenu = false;
  let bracketDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start of target menu
    if (line.includes(`export const ${menuName}`)) {
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
      // End of this menu array
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
        if (line.endsWith('",') || line.endsWith("',")) {
          if (currentItem) currentItem.description = description.trim();
          inDescription = false;
          description = '';
        }
      }
    } else if (inDescription) {
      if (line.endsWith('",') || line.endsWith("',")) {
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

// Function to parse the menu.ts file (both adminMenu and userMenu)
function parseMenuFile() {
  console.log('📖 Reading and parsing menu.ts...');
  const content = fs.readFileSync(MENU_FILE, 'utf8');

  // Parse both menu arrays
  const adminItems = parseMenuArray(content, 'adminMenu');
  const userItems = parseMenuArray(content, 'userMenu');

  console.log(`   - Admin menu items: ${adminItems.length}`);
  console.log(`   - User menu items: ${userItems.length}`);

  // Combine both - they already have proper prefixes (admin-*, user-*)
  return [...adminItems, ...userItems];
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

/**
 * Derive namespace from navbar menu file path
 * e.g., frontend/app/[locale]/(ext)/forex/menu.ts -> ext_forex
 *       frontend/app/[locale]/(ext)/admin/forex/menu.ts -> ext_admin_forex
 */
function getNamespaceFromPath(filePath) {
  const relativePath = path.relative(NAVBAR_MENU_DIR, filePath);
  // e.g., "forex/menu.ts" or "admin/forex/menu.ts"
  const parts = relativePath.replace(/[\\\/]menu\.ts$/, '').split(/[\\\/]/);
  return 'ext_' + parts.join('_');
}

/**
 * Parse a navbar menu.ts file (simpler format than main menu.ts)
 * These files use: export const menu: MenuItem[] = [...]
 */
function parseNavbarMenuFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const items = [];

  // Extract the menu array content
  const menuMatch = content.match(/export const menu:\s*MenuItem\[\]\s*=\s*\[([\s\S]*?)\];/);
  if (!menuMatch) {
    console.warn(`⚠️  Could not find menu array in ${filePath}`);
    return [];
  }

  const menuContent = menuMatch[1];

  // Parse objects from the array
  // Use a state machine to extract each menu item object
  let depth = 0;
  let currentObject = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < menuContent.length; i++) {
    const char = menuContent[i];
    const prevChar = i > 0 ? menuContent[i - 1] : '';

    // Handle string boundaries
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '{') {
        depth++;
        if (depth === 1) {
          currentObject = '{';
          continue;
        }
      }
      if (char === '}') {
        depth--;
        if (depth === 0) {
          currentObject += '}';
          // Parse this object
          const item = parseMenuItemObject(currentObject);
          if (item) items.push(item);
          currentObject = '';
          continue;
        }
      }
    }

    if (depth > 0) {
      currentObject += char;
    }
  }

  return items;
}

/**
 * Parse a single menu item object string into an object
 */
function parseMenuItemObject(objStr) {
  const item = {};

  // Extract key
  const keyMatch = objStr.match(/key:\s*["']([^"']+)["']/);
  if (keyMatch) item.key = keyMatch[1];

  // Extract title
  const titleMatch = objStr.match(/title:\s*["']([^"']+)["']/);
  if (titleMatch) item.title = titleMatch[1];

  // Extract description (can be multiline)
  const descMatch = objStr.match(/description:\s*["']([^"']*(?:\\.[^"']*)*)['"]/s);
  if (descMatch) {
    // Handle escaped characters and line continuations
    item.description = descMatch[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
  } else {
    // Try multiline template literal or string concatenation
    const descMultiMatch = objStr.match(/description:\s*\n?\s*["'](.+?)["'],?\s*(?:href:|icon:|child:|$)/s);
    if (descMultiMatch) {
      item.description = descMultiMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  // Extract child array if present
  const childMatch = objStr.match(/child:\s*\[([\s\S]*?)\]/);
  if (childMatch) {
    item.child = parseChildArray(childMatch[1]);
  }

  return item.key ? item : null;
}

/**
 * Parse child array from menu item
 */
function parseChildArray(childContent) {
  const children = [];
  let depth = 0;
  let currentObject = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < childContent.length; i++) {
    const char = childContent[i];
    const prevChar = i > 0 ? childContent[i - 1] : '';

    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '{') {
        depth++;
        if (depth === 1) {
          currentObject = '{';
          continue;
        }
      }
      if (char === '}') {
        depth--;
        if (depth === 0) {
          currentObject += '}';
          const item = parseMenuItemObject(currentObject);
          if (item) children.push(item);
          currentObject = '';
          continue;
        }
      }
    }

    if (depth > 0) {
      currentObject += char;
    }
  }

  return children;
}

/**
 * Extract translations from navbar menu items
 * Returns object with nested keys like: home.title, home.description
 * Keys use dots for nesting (hyphen to dot): investment-plans -> investment.plans
 */
function extractFromNavbarMenuItem(item, translations = {}) {
  if (item.key && item.title) {
    // Use dots for nested keys: home.title, investment.plans.title
    const nestedKey = item.key.replace(/-/g, '.');
    translations[`${nestedKey}.title`] = item.title;
    if (item.description) {
      translations[`${nestedKey}.description`] = item.description;
    }
  }

  // Process children recursively
  if (item.child && Array.isArray(item.child)) {
    item.child.forEach(child => {
      extractFromNavbarMenuItem(child, translations);
    });
  }

  return translations;
}

/**
 * Find and process all navbar menu.ts files
 */
function processNavbarMenuFiles() {
  console.log('\n📂 Scanning for navbar menu files...');

  const menuFiles = glob.sync('**/menu.ts', {
    cwd: NAVBAR_MENU_DIR,
    ignore: ['node_modules/**']
  });

  console.log(`   Found ${menuFiles.length} navbar menu files`);

  const allTranslations = {};
  const fileStats = [];

  for (const file of menuFiles) {
    const filePath = path.join(NAVBAR_MENU_DIR, file);
    const namespace = getNamespaceFromPath(filePath);

    try {
      const items = parseNavbarMenuFile(filePath);
      const translations = {};

      items.forEach(item => {
        extractFromNavbarMenuItem(item, translations);
      });

      const keyCount = Object.keys(translations).length;
      if (keyCount > 0) {
        allTranslations[namespace] = translations;
        fileStats.push({ file, namespace, keyCount });
        console.log(`   ✅ ${file} -> ${namespace} (${keyCount} keys)`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Error parsing ${file}: ${error.message}`);
    }
  }

  return { translations: allTranslations, stats: fileStats };
}

// Function to update locale files with nested structure
function updateLocaleFiles(translations, namespace = 'menu') {
  console.log(`\n📝 Updating locale files for namespace: ${namespace}...`);

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

    // Ensure namespace exists
    if (!localeData[namespace]) {
      localeData[namespace] = {};
    }

    // Add menu translations with nested structure under the namespace
    let added = 0;
    for (const [key, value] of Object.entries(translations)) {
      // Check if key already exists in nested structure under namespace
      const fullPath = `${namespace}.${key}`;
      const existing = getNestedProperty(localeData, fullPath);
      if (existing === undefined) {
        // Set nested property under the namespace
        setNestedProperty(localeData, fullPath, locale === 'en' ? value : value);
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

  return stats;
}

// Function to update locale files with navbar translations (multiple namespaces)
// Uses nested nav structure to match existing translations:
// e.g., ext_forex.nav.home.title, ext_forex.nav.home.description
function updateLocaleFilesWithNavbar(navbarTranslations) {
  console.log('\n📝 Updating locale files with navbar translations...');

  const localeFiles = fs.readdirSync(MESSAGES_DIR)
    .filter(file => file.endsWith('.json'));

  const stats = {
    updated: 0,
    added: 0,
    namespaces: 0
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

    let fileAdded = 0;

    // Process each namespace
    for (const [namespace, translations] of Object.entries(navbarTranslations)) {
      // Ensure namespace and nav object exist
      if (!localeData[namespace]) {
        localeData[namespace] = {};
      }
      if (!localeData[namespace].nav) {
        localeData[namespace].nav = {};
      }

      // Add nested translations under namespace.nav
      // Keys are now in dot notation: home.title, investment.plans.title
      for (const [key, value] of Object.entries(translations)) {
        // key is like "home.title" or "home.description" or "investment.plans.title"
        // We need to set nested property under nav
        const fullPath = `nav.${key}`;
        const existing = getNestedProperty(localeData[namespace], fullPath);

        if (existing === undefined) {
          setNestedProperty(localeData[namespace], fullPath, value);
          fileAdded++;
        }
      }
    }

    if (fileAdded > 0) {
      fs.writeFileSync(filePath, JSON.stringify(localeData, null, 2) + '\n', 'utf8');
      console.log(`   ✅ ${locale}.json - Added ${fileAdded} navbar keys`);
      stats.updated++;
      stats.added += fileAdded;
    }
  }

  stats.namespaces = Object.keys(navbarTranslations).length;

  console.log(`\n📊 Navbar Summary:`);
  console.log(`   - Namespaces processed: ${stats.namespaces}`);
  console.log(`   - Files updated: ${stats.updated}`);
  console.log(`   - Total navbar keys added: ${stats.added}`);

  return stats;
}

// Main function
function main() {
  try {
    console.log('🚀 Menu Translation Extractor V2\n');
    console.log('═'.repeat(50));

    let totalAdded = 0;

    // ============================================
    // Part 1: Process main admin menu.ts
    // ============================================
    console.log('\n📁 Processing main admin menu (frontend/config/menu.ts)...');

    // Parse menu file
    const menuItems = parseMenuFile();
    const flatItems = flattenMenu(menuItems);
    console.log(`\n✅ Successfully parsed admin menu structure`);
    console.log(`   - Top-level items: ${menuItems.length}`);
    console.log(`   - Total items (including nested): ${flatItems.length}`);

    // Extract all translations
    const menuTranslations = {};
    flatItems.forEach(item => {
      Object.assign(menuTranslations, extractFromMenuItem(item));
    });

    console.log(`\n📊 Admin Menu Extraction Results:`);
    console.log(`   - Translation keys: ${Object.keys(menuTranslations).length}`);
    console.log(`   - Title keys: ${Object.keys(menuTranslations).filter(k => k.includes('.title')).length}`);
    console.log(`   - Description keys: ${Object.keys(menuTranslations).filter(k => k.includes('.description')).length}`);

    // Update locale files with menu translations
    const menuStats = updateLocaleFiles(menuTranslations, 'menu');
    totalAdded += menuStats.added;

    // ============================================
    // Part 2: Process navbar menu.ts files
    // ============================================
    console.log('\n' + '─'.repeat(50));
    console.log('📁 Processing navbar menu files...');

    const { translations: navbarTranslations, stats: navbarFileStats } = processNavbarMenuFiles();

    // Update locale files with navbar translations
    const navbarStats = updateLocaleFilesWithNavbar(navbarTranslations);
    totalAdded += navbarStats.added;

    // ============================================
    // Save combined output file
    // ============================================
    const combinedOutput = {
      menu: menuTranslations,
      navbar: navbarTranslations
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combinedOutput, null, 2) + '\n');
    console.log(`\n💾 Saved extracted translations to:`);
    console.log(`   ${OUTPUT_FILE}`);

    // Show sample of extracted keys
    const sampleKeys = Object.keys(menuTranslations).slice(0, 3);
    console.log(`\n📋 Sample admin menu translation keys:`);
    sampleKeys.forEach(key => {
      const value = menuTranslations[key];
      const display = value.length > 50 ? value.substring(0, 47) + '...' : value;
      console.log(`   menu.${key}: "${display}"`);
    });

    // Show sample navbar keys
    const navbarNamespaces = Object.keys(navbarTranslations);
    if (navbarNamespaces.length > 0) {
      console.log(`\n📋 Sample navbar translation keys:`);
      navbarNamespaces.slice(0, 2).forEach(ns => {
        const keys = Object.keys(navbarTranslations[ns]).slice(0, 2);
        keys.forEach(key => {
          const value = navbarTranslations[ns][key];
          const display = value.length > 50 ? value.substring(0, 47) + '...' : value;
          console.log(`   ${ns}.nav.${key}: "${display}"`);
        });
      });
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log('✅ Menu translation extraction complete!');

    // Output summary for the route to parse
    console.log(`\n📊 Final Summary:`);
    console.log(`   - Translation keys: ${Object.keys(menuTranslations).length + Object.values(navbarTranslations).reduce((sum, ns) => sum + Object.keys(ns).length, 0)}`);
    console.log(`   - Files updated: ${menuStats.updated + navbarStats.updated}`);
    console.log(`   - Total keys added: ${totalAdded}`);
    console.log(`   - Navbar namespaces: ${navbarStats.namespaces}`);

    if (totalAdded > 0) {
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Update menu.ts files to use translation keys`);
      console.log(`   2. Update navigation components to use useTranslations`);
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
