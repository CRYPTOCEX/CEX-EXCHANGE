"use strict";

const rolesList = ["Super Admin", "Admin", "Support", "User"].map((role) => ({
  name: role,
}));

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Fetch existing role names to compare against
      const existingRoles = await queryInterface.sequelize.query(
        "SELECT name FROM role",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const existingNames = new Set(existingRoles.map((role) => role.name));

      // Filter out rolesList entries that already exist in the database by name
      const newRoles = rolesList.filter(
        (role) => !existingNames.has(role.name)
      );

      // Only insert new roles that do not exist
      if (newRoles.length > 0) {
        await queryInterface.bulkInsert("role", newRoles);
      }
    } catch (error) {
      console.error("Bulk insert error:", error);
      throw error; // Rethrow the error to ensure the migration fails appropriately
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("role", null, {});
  },
};
