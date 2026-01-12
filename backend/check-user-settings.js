/**
 * Check user notification settings
 */

const { models } = require('./dist/src/db');

async function checkUserSettings() {
  try {
    const userId = 'c13dc538-8ee2-4bc3-90f3-9bfeb9e88787';

    console.log('🔍 Checking notification settings for user:', userId);
    console.log('');

    const user = await models.user.findByPk(userId, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'settings'],
    });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('');
    console.log('📋 Raw settings field:');
    console.log('   Type:', typeof user.settings);
    console.log('   Value:', JSON.stringify(user.settings, null, 2));
    console.log('');

    const settings = user.settings || {};
    console.log('📊 Parsed settings:');
    console.log('   email:', settings.email, '(type:', typeof settings.email, ')');
    console.log('   sms:', settings.sms, '(type:', typeof settings.sms, ')');
    console.log('   push:', settings.push, '(type:', typeof settings.push, ')');
    console.log('');

    // Test the logic
    console.log('🧪 Testing preference logic:');
    const emailPref = settings.email !== undefined ? settings.email : true;
    const smsPref = settings.sms !== undefined ? settings.sms : false;
    const pushPref = settings.push !== undefined ? settings.push : false;

    console.log('   email preference:', emailPref);
    console.log('   sms preference:', smsPref);
    console.log('   push preference:', pushPref);
    console.log('');

    // Test filter logic
    console.log('🔍 Testing filter logic:');
    console.log('   EMAIL channel allowed?', emailPref === true);
    console.log('   SMS channel allowed?', smsPref === true);
    console.log('   PUSH channel allowed?', pushPref === true);
    console.log('');

    // Update with correct settings
    console.log('💾 Updating user settings with correct structure...');
    await models.user.update(
      {
        settings: {
          email: true,
          sms: false,
          push: false,
        },
      },
      {
        where: { id: userId },
      }
    );

    // Verify update
    const updatedUser = await models.user.findByPk(userId, {
      attributes: ['settings'],
    });

    console.log('✅ Updated settings:');
    console.log('   ', JSON.stringify(updatedUser.settings, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkUserSettings();
