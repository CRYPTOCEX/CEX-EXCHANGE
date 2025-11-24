const fs = require("fs");
const path = require("path");

const APP_DIR = path.resolve(process.cwd(), "frontend/app");
const API_DIR = path.resolve(process.cwd(), "backend/src/api");
const PERMISSIONS_SEEDER = path.resolve(process.cwd(), "backend/seeders/20240402234643-permissions.js");

function walk(dir, callback) {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return;
  }
  
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  });
}

// Regex patterns
const permissionExportRegex = /export\s+const\s+permission\s*=\s*[`"']([^`"']+)[`"'];?/g;
const backendPermissionRegex = /permission:\s*[`"']([^`"']+)[`"']/g;
const dataTableImportRegex = /import\s+DataTable\s+from\s+["`']@\/components\/blocks\/data-table["`']/;
const dataTablePermissionsRegex = /permissions\s*=\s*\{\{([^}]+)\}\}/s;

console.log("🔍 Starting comprehensive permission extraction and cleanup...");

// Step 1: Extract permissions from frontend files (page.tsx/ts)
console.log("\n📁 Processing frontend files...");
const frontendPermissions = new Set();
const permissionFiles = [];

walk(APP_DIR, (filePath) => {
  if (filePath.endsWith("/page.tsx") || filePath.endsWith("/page.ts")) {
    const content = fs.readFileSync(filePath, "utf8");
    const matches = [...content.matchAll(permissionExportRegex)];
    
    if (matches.length > 0) {
      matches.forEach((match) => {
        const permission = match[1];
        frontendPermissions.add(permission);
        console.log(`  ✓ Found: ${permission}`);
      });

      // Create permission.ts file
      const dir = path.dirname(filePath);
      const permissionFilePath = path.join(dir, "permission.ts");
      
      matches.forEach((match) => {
        const permission = match[1];
        const permissionContent = `export const permission = "${permission}";\n`;
        fs.writeFileSync(permissionFilePath, permissionContent);
        permissionFiles.push(permissionFilePath);
      });

      // Remove permission export from page file
      const updatedContent = content.replace(permissionExportRegex, "");
      fs.writeFileSync(filePath, updatedContent);
    }
  }
});

console.log(`✅ Frontend: Found ${frontendPermissions.size} permissions`);

// Step 2: Extract permissions from DataTable components
console.log("\n📊 Processing DataTable components...");
const dataTablePermissions = new Set();

walk(APP_DIR, (filePath) => {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) {
    const content = fs.readFileSync(filePath, "utf8");
    
    // Check if file imports DataTable
    if (dataTableImportRegex.test(content)) {
      console.log(`  🔍 Found DataTable import in: ${path.relative(process.cwd(), filePath)}`);
      
      // Extract permissions from permissions prop
      const permissionsMatch = content.match(dataTablePermissionsRegex);
      if (permissionsMatch) {
        const permissionsBlock = permissionsMatch[1];
        
        // Extract individual permission values
        const permissionValueRegex = /:\s*["`']([^"`']+)["`']/g;
        let match;
        while ((match = permissionValueRegex.exec(permissionsBlock)) !== null) {
          const permission = match[1];
          dataTablePermissions.add(permission);
          console.log(`    ✓ Found permission: ${permission}`);
        }
      }
    }
  }
});

console.log(`✅ DataTable: Found ${dataTablePermissions.size} permissions`);

// Step 3: Extract permissions from backend API files
console.log("\n🔧 Processing backend API files...");
const backendPermissions = new Set();

walk(API_DIR, (filePath) => {
  if (filePath.endsWith(".ts")) {
    const content = fs.readFileSync(filePath, "utf8");
    const matches = [...content.matchAll(backendPermissionRegex)];
    
    matches.forEach((match) => {
      const permission = match[1];
      backendPermissions.add(permission);
      console.log(`  ✓ Found: ${permission}`);
    });
  }
});

console.log(`✅ Backend: Found ${backendPermissions.size} permissions`);

// Step 4: Combine all permissions and remove duplicates
const allPermissions = new Set([...frontendPermissions, ...dataTablePermissions, ...backendPermissions]);
console.log(`\n📊 Total unique permissions found: ${allPermissions.size}`);

// Step 5: Update permissions seeder with cleaned list
console.log("\n📝 Updating permissions seeder...");

// Read current seeder to check what was removed
let currentPermissions = [];
if (fs.existsSync(PERMISSIONS_SEEDER)) {
  const currentContent = fs.readFileSync(PERMISSIONS_SEEDER, "utf8");
  const permissionMatches = currentContent.match(/"([^"]+)"/g);
  if (permissionMatches) {
    currentPermissions = permissionMatches.map(p => p.replace(/"/g, ''));
  }
}

// Find removed permissions
const removedPermissions = currentPermissions.filter(p => !allPermissions.has(p));
const addedPermissions = [...allPermissions].filter(p => !currentPermissions.includes(p));

if (removedPermissions.length > 0) {
  console.log("\n🗑️  Removing obsolete permissions:");
  removedPermissions.forEach(p => console.log(`  ✗ Removed: ${p}`));
}

if (addedPermissions.length > 0) {
  console.log("\n➕ Adding new permissions:");
  addedPermissions.forEach(p => console.log(`  ✓ Added: ${p}`));
}

// Sort permissions alphabetically for better organization
const sortedPermissions = [...allPermissions].sort();

// Generate the seeder content
const seederContent = `'use strict';

const permissionsList = [
${sortedPermissions.map(p => `  "${p}",`).join('\n')}
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingPermissions = await queryInterface.sequelize.query(
      "SELECT name FROM permission",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const existingPermissionNames = existingPermissions.map((p) => p.name);

    const newPermissions = permissionsList
      .filter((permission) => !existingPermissionNames.includes(permission))
      .map((permission) => ({
        name: permission,
      }));

    if (newPermissions.length > 0) {
      await queryInterface.bulkInsert("permission", newPermissions);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("permission", {
      name: permissionsList,
    });
  },
};
`;

// Write the updated seeder
fs.writeFileSync(PERMISSIONS_SEEDER, seederContent);

console.log(`\n✅ Successfully updated permissions seeder!`);
console.log(`📄 Seeder file: ${PERMISSIONS_SEEDER}`);
console.log(`📊 Total permissions: ${sortedPermissions.length}`);
console.log(`🗑️  Removed: ${removedPermissions.length}`);
console.log(`➕ Added: ${addedPermissions.length}`);

if (permissionFiles.length > 0) {
  console.log(`\n📝 Created permission files:`);
  permissionFiles.forEach(file => console.log(`  ${file}`));
}

console.log("\n🎉 Permission extraction and cleanup completed!");
