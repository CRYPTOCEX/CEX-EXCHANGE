/**
 * Email Template Fixer Script
 * This script enables the email notification for all templates in the database
 * Run with: node fix-email-templates.js
 */

const { Sequelize } = require('./backend/node_modules/sequelize');

// Database configuration - change these to match your .env file
const DB_HOST = 'localhost';
const DB_PORT = 3306;
const DB_NAME = 'v5'; // Your database name
const DB_USER = 'root';
const DB_PASSWORD = ''; // Your database password

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false, // Set to console.log to see SQL queries
});

async function fixEmailTemplates() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully\n');

    // Get all notification templates
    console.log('📋 Fetching all notification templates...');
    const [templates] = await sequelize.query(`
      SELECT id, name, email, sms, push, subject, emailBody
      FROM notification_template
      ORDER BY name
    `);

    console.log(`Found ${templates.length} templates\n`);

    // Check which templates have email disabled
    const disabledEmailTemplates = templates.filter(t => !t.email);
    const missingBodyTemplates = templates.filter(t => !t.emailBody || t.emailBody === '');

    console.log('📊 Status Report:');
    console.log(`   - Total templates: ${templates.length}`);
    console.log(`   - Email disabled: ${disabledEmailTemplates.length}`);
    console.log(`   - Missing email body: ${missingBodyTemplates.length}\n`);

    if (disabledEmailTemplates.length === 0) {
      console.log('✅ All templates have email enabled!');
    } else {
      console.log('❌ Templates with email disabled:');
      disabledEmailTemplates.forEach(t => {
        const hasBody = t.emailBody && t.emailBody !== '';
        console.log(`   - ${t.name} ${hasBody ? '(has body)' : '(⚠️ missing body)'}`);
      });
      console.log('');
    }

    if (missingBodyTemplates.length > 0) {
      console.log('⚠️  Templates missing email body:');
      missingBodyTemplates.forEach(t => {
        console.log(`   - ${t.name}`);
      });
      console.log('');
    }

    // Important templates that should definitely have email enabled
    const criticalTemplates = [
      'EmailVerification',
      'PasswordReset',
      'TransactionStatusUpdate',
      'SpotWalletDepositConfirmation',
      'SpotWalletWithdrawalConfirmation',
      'FiatWalletTransaction',
      'WalletBalanceUpdate'
    ];

    console.log('🔧 Enabling email for critical templates...');
    let enabledCount = 0;

    for (const templateName of criticalTemplates) {
      const template = templates.find(t => t.name === templateName);

      if (!template) {
        console.log(`   ⚠️  Template "${templateName}" not found in database`);
        continue;
      }

      if (!template.email) {
        await sequelize.query(`
          UPDATE notification_template
          SET email = 1
          WHERE name = ?
        `, {
          replacements: [templateName]
        });
        console.log(`   ✅ Enabled email for: ${templateName}`);
        enabledCount++;
      } else {
        console.log(`   ✓  Already enabled: ${templateName}`);
      }

      if (!template.emailBody || template.emailBody === '') {
        console.log(`   ⚠️  ${templateName} is missing email body!`);
      }
    }

    if (enabledCount > 0) {
      console.log(`\n✅ Enabled email for ${enabledCount} template(s)`);
    }

    // Verify the changes
    console.log('\n📊 Final status check...');
    const [updatedTemplates] = await sequelize.query(`
      SELECT name, email, LENGTH(emailBody) as bodyLength
      FROM notification_template
      WHERE name IN (${criticalTemplates.map(() => '?').join(',')})
    `, {
      replacements: criticalTemplates
    });

    console.log('\nCritical templates status:');
    updatedTemplates.forEach(t => {
      const status = t.email ? '✅' : '❌';
      const bodyStatus = t.bodyLength > 0 ? `(${t.bodyLength} chars)` : '⚠️ NO BODY';
      console.log(`   ${status} ${t.name} ${bodyStatus}`);
    });

    console.log('\n✅ Done! Email templates have been checked and updated.');
    console.log('\n💡 Next steps:');
    console.log('   1. Check the admin panel: http://localhost:3000/en/admin/system/notification/template');
    console.log('   2. Verify templates have email bodies and are enabled');
    console.log('   3. Test sending a verification email by registering a new user');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure MySQL is running');
    console.error('   2. Check database credentials in your .env file');
    console.error('   3. Verify the database name is correct');
  } finally {
    await sequelize.close();
  }
}

// Run the script
fixEmailTemplates();
