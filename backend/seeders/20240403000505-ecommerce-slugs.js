"use strict";
const { v4: uuidv4 } = require("uuid");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update slugs for categories
    const categories = await queryInterface.sequelize.query(
      `SELECT id, name, slug FROM ecommerce_category WHERE slug IS NULL OR slug = '';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const category of categories) {
      console.log(`Processing category: ${category.name}`);

      const slug = category.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Ensure uniqueness by appending a counter or UUID if necessary
      let uniqueSlug = slug;
      let counter = 1;
      const maxAttempts = 100; // Prevent infinite loop
      while (
        await queryInterface.sequelize.query(
          `SELECT slug FROM ecommerce_category WHERE slug = ?;`,
          {
            replacements: [uniqueSlug],
            type: queryInterface.sequelize.QueryTypes.SELECT,
          }
        )
      ) {
        if (counter > maxAttempts) {
          // Append a UUID fragment for uniqueness after max attempts
          uniqueSlug = `${slug}-${uuidv4().split("-")[0]}`;
          break;
        }
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      await queryInterface.bulkUpdate(
        "ecommerce_category",
        { slug: uniqueSlug },
        { id: category.id }
      );
    }

    // Update slugs for products
    const products = await queryInterface.sequelize.query(
      `SELECT id, name, slug FROM ecommerce_product WHERE slug IS NULL OR slug = '';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const product of products) {
      console.log(`Processing product: ${product.name}`);

      const slug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Ensure uniqueness by appending a counter or UUID if necessary
      let uniqueSlug = slug;
      let counter = 1;
      const maxAttempts = 100; // Prevent infinite loop
      while (
        await queryInterface.sequelize.query(
          `SELECT slug FROM ecommerce_product WHERE slug = ?;`,
          {
            replacements: [uniqueSlug],
            type: queryInterface.sequelize.QueryTypes.SELECT,
          }
        )
      ) {
        if (counter > maxAttempts) {
          // Append a UUID fragment for uniqueness after max attempts
          uniqueSlug = `${slug}-${uuidv4().split("-")[0]}`;
          break;
        }
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      await queryInterface.bulkUpdate(
        "ecommerce_product",
        { slug: uniqueSlug },
        { id: product.id }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate("ecommerce_category", { slug: null }, {});
    await queryInterface.bulkUpdate("ecommerce_product", { slug: null }, {});
  },
};
