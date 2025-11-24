"use strict";
const { v4: uuidv4 } = require("uuid");

const Pages = [];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch existing pages from the database to compare against
    const existingPages = await queryInterface.sequelize.query(
      "SELECT title FROM page",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingPageTitles = existingPages.map((page) => page.title);

    // Filter out Pages that already exist in the database by title
    const newPages = Pages.filter(
      (page) => !existingPageTitles.includes(page.title)
    ).map((page) => ({
      ...page,
      id: uuidv4(),
    }));

    // Only insert new pages that do not exist
    if (newPages.length > 0) {
      await queryInterface.bulkInsert("page", newPages);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("page", null, {});
  },
};
