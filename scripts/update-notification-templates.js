/**
 * Script to update notification template content
 * This script updates the email, SMS, and push templates to the latest design
 * while preserving admin customizations to other fields (subject, shortCodes, etc.)
 *
 * Usage: pnpm seed:notification
 */

const path = require("path");
const fs = require("fs");

// Load environment variables from root .env
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { Sequelize } = require("sequelize");

// Database configuration - use backend/config.js
const config = require("../backend/config")[process.env.NODE_ENV || "development"];

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port || 3306,
    dialect: config.dialect || "mysql",
    logging: false,
  }
);

// Import the notification templates from the seeder
const notificationTemplatesPath = path.join(
  __dirname,
  "../backend/seeders/20240402234702-notificationTemplates.js"
);

// We need to extract the templates array from the seeder file
// Read the file and extract the templates
const seederContent = fs.readFileSync(notificationTemplatesPath, "utf8");

// Find the start of the array (after "const notificationTemplates = [")
const arrayStartMatch = seederContent.match(/const notificationTemplates\s*=\s*\[/);
if (!arrayStartMatch) {
  console.error("Could not find notificationTemplates array in seeder file");
  process.exit(1);
}

const arrayStart = arrayStartMatch.index + arrayStartMatch[0].length - 1;

// Find the matching closing bracket
let bracketCount = 0;
let arrayEnd = -1;
for (let i = arrayStart; i < seederContent.length; i++) {
  if (seederContent[i] === "[") bracketCount++;
  if (seederContent[i] === "]") bracketCount--;
  if (bracketCount === 0) {
    arrayEnd = i + 1;
    break;
  }
}

if (arrayEnd === -1) {
  console.error("Could not find end of notificationTemplates array");
  process.exit(1);
}

// Extract the array string and evaluate it
const arrayString = seederContent.substring(arrayStart, arrayEnd);

// Create a function to safely evaluate the array
let notificationTemplates;
try {
  // eslint-disable-next-line no-eval
  notificationTemplates = eval(arrayString);
} catch (error) {
  console.error("Error parsing notification templates:", error.message);
  process.exit(1);
}

async function updateNotificationTemplates() {
  console.log("🚀 Starting notification template update...\n");

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established\n");

    // Get all existing templates
    const [existingTemplates] = await sequelize.query(
      "SELECT id, name, emailBody, smsBody, pushBody, sms, push FROM notification_template"
    );

    console.log(`📧 Found ${existingTemplates.length} existing templates in database`);
    console.log(`📝 Found ${notificationTemplates.length} templates in seeder file\n`);

    // Create a map of existing templates by name
    const existingByName = new Map();
    existingTemplates.forEach((t) => {
      existingByName.set(t.name, t);
    });

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // Update each template
    for (const template of notificationTemplates) {
      const existing = existingByName.get(template.name);

      if (!existing) {
        console.log(`⚠️  Template not found in database: ${template.name}`);
        notFound++;
        continue;
      }

      // Build update fields
      const updates = {};
      const changes = [];

      // Check emailBody
      const newEmailBody = (template.emailBody || "").trim();
      const existingEmailBody = (existing.emailBody || "").trim();
      if (newEmailBody && newEmailBody !== existingEmailBody) {
        updates.emailBody = template.emailBody;
        changes.push("emailBody");
      }

      // Check smsBody
      const newSmsBody = (template.smsBody || "").trim();
      const existingSmsBody = (existing.smsBody || "").trim();
      if (newSmsBody && newSmsBody !== existingSmsBody) {
        updates.smsBody = template.smsBody;
        changes.push("smsBody");
      }

      // Check pushBody
      const newPushBody = (template.pushBody || "").trim();
      const existingPushBody = (existing.pushBody || "").trim();
      if (newPushBody && newPushBody !== existingPushBody) {
        updates.pushBody = template.pushBody;
        changes.push("pushBody");
      }

      // Check sms flag - always set to true if defined in template
      if (template.sms === true && existing.sms !== true && existing.sms !== 1) {
        updates.sms = true;
        changes.push("sms");
      }

      // Check push flag - always set to true if defined in template
      if (template.push === true && existing.push !== true && existing.push !== 1) {
        updates.push = true;
        changes.push("push");
      }

      // Skip if no changes
      if (Object.keys(updates).length === 0) {
        skipped++;
        continue;
      }

      // Build dynamic UPDATE query
      const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(", ");
      const values = [...Object.values(updates), template.name];

      try {
        await sequelize.query(
          `UPDATE notification_template SET ${setClauses} WHERE name = ?`,
          {
            replacements: values,
            type: Sequelize.QueryTypes.UPDATE,
          }
        );
        console.log(`✅ Updated: ${template.name} (${changes.join(", ")})`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${template.name}:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Update Summary:");
    console.log("=".repeat(50));
    console.log(`   ✅ Updated: ${updated} templates`);
    console.log(`   ⏭️  Skipped (no changes): ${skipped} templates`);
    console.log(`   ⚠️  Not found in DB: ${notFound} templates`);
    console.log("=".repeat(50));
    console.log("\n✨ Notification template update complete!\n");
  } catch (error) {
    console.error("\n❌ Error during update:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateNotificationTemplates();
