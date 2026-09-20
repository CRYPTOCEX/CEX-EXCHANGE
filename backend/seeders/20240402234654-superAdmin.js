"use strict";

const { v4: uuidv4 } = require("uuid");
const argon2 = require("argon2");

// `db:seed:all` runs with seederStorage "none", so every seeder re-runs on every
// `pnpm seed` — which the documented update flow (`pnpm updator`) invokes on each
// update. Without a durable marker this seeder re-created the default administrator
// each time the owner deleted it, which reads to the site owner as an account that
// cannot be removed. The marker lives in `settings` so it survives deletion of the
// user row itself.
const SEED_MARKER_KEY = "superAdminSeeded";

const DEFAULT_EMAIL = "superadmin@example.com";
const DEFAULT_PASSWORD = "12345678";

async function hashPassword(password) {
  try {
    return await argon2.hash(password);
  } catch (err) {
    console.error(`Error hashing password: ${err.message}`);
    throw new Error("Failed to hash password");
  }
}

// Returns null when the marker is absent, and also when `settings` does not exist
// yet — on a first install the seeder can run before the app has synced its models.
async function readSeedMarker(queryInterface) {
  try {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT `value` FROM `settings` WHERE `key` = :key;",
      { replacements: { key: SEED_MARKER_KEY } }
    );
    return rows.length > 0 ? rows[0].value : null;
  } catch (err) {
    return null;
  }
}

async function writeSeedMarker(queryInterface) {
  try {
    await queryInterface.sequelize.query(
      "INSERT INTO `settings` (`key`, `value`) VALUES (:key, :value) " +
        "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);",
      {
        replacements: {
          key: SEED_MARKER_KEY,
          value: new Date().toISOString(),
        },
      }
    );
  } catch (err) {
    console.warn(
      `Super Admin seeder: could not persist the "${SEED_MARKER_KEY}" marker ` +
        `(${err.message}). The default account may be offered again on the next seed.`
    );
  }
}

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Already handled on a previous run — never touch the user table again.
    if (await readSeedMarker(queryInterface)) {
      return;
    }

    const [superAdminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM role WHERE name = 'Super Admin';`
    );

    if (superAdminRole.length === 0) {
      console.error("Super Admin role not found. Exiting.");
      return;
    }

    const superAdminRoleId = superAdminRole[0].id;

    // Any user at all means this install is already in use, so there is no first-run
    // account to create. Claiming the marker here is what retires the seeder for
    // existing installs that never had one, including those where the owner has
    // already deleted the default administrator.
    const [userCountRows] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS total FROM `user`;"
    );

    if (Number(userCountRows[0].total) > 0) {
      await writeSeedMarker(queryInterface);
      return;
    }

    const email = (process.env.SUPERADMIN_EMAIL || DEFAULT_EMAIL).trim();
    const password = process.env.SUPERADMIN_PASSWORD || DEFAULT_PASSWORD;

    await queryInterface.bulkInsert("user", [
      {
        id: uuidv4(),
        email,
        password: await hashPassword(password),
        firstName: "Super",
        lastName: "Admin",
        emailVerified: true,
        status: "ACTIVE",
        roleId: superAdminRoleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await writeSeedMarker(queryInterface);

    console.log(`Created the first administrator account: ${email}`);
    if (!process.env.SUPERADMIN_PASSWORD) {
      console.warn(
        "This account uses the published default password. Change it as soon as " +
          "you have signed in, or set SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD in .env " +
          "before the first seed."
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const [superAdminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM role WHERE name = 'Super Admin';`
    );

    if (superAdminRole.length > 0) {
      const superAdminRoleId = superAdminRole[0].id;
      await queryInterface.bulkDelete("user", { roleId: superAdminRoleId });
    }

    try {
      await queryInterface.sequelize.query(
        "DELETE FROM `settings` WHERE `key` = :key;",
        { replacements: { key: SEED_MARKER_KEY } }
      );
    } catch (err) {
      // settings table may not exist; nothing to undo
    }
  },
};
