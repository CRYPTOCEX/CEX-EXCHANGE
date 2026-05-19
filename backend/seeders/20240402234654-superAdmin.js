"use strict";

const { v4: uuidv4 } = require("uuid");
const argon2 = require("argon2");

async function hashPassword(password) {
  try {
    return await argon2.hash(password);
  } catch (err) {
    console.error(`Error hashing password: ${err.message}`);
    throw new Error("Failed to hash password");
  }
}

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    const [superAdminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM role WHERE name = 'Super Admin';`
    );

    if (superAdminRole.length === 0) {
      console.error("Super Admin role not found. Exiting.");
      return;
    }

    const superAdminRoleId = superAdminRole[0].id;

    const [existingSuperAdmin] = await queryInterface.sequelize.query(
      `SELECT id FROM user WHERE roleId = '${superAdminRoleId}';`
    );

    if (existingSuperAdmin.length > 0) {
      return;
    }

    await queryInterface.bulkInsert("user", [
      {
        id: uuidv4(),
        email: "superadmin@example.com",
        password: await hashPassword("12345678"),
        firstName: "Super",
        lastName: "Admin",
        emailVerified: true,
        status: "ACTIVE",
        roleId: superAdminRoleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    const [superAdminRole] = await queryInterface.sequelize.query(
      `SELECT id FROM role WHERE name = 'Super Admin';`
    );

    if (superAdminRole.length > 0) {
      const superAdminRoleId = superAdminRole[0].id;
      await queryInterface.bulkDelete("user", { role_id: superAdminRoleId });
    }
  },
};
