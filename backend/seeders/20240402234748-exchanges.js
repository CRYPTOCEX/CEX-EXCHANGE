"use strict";
const { v4: uuidv4 } = require("uuid");

const Exchanges = [
  {
    name: "kucoin",
    title: "KuCoin",
    productId: "6D0DD3C8",
    version: "1.0.0",
    type: "spot",
  },
  {
    name: "binance",
    title: "Binance",
    productId: "EBAC01EE",
    version: "1.0.0",
    type: "spot",
  },
  // xt
  {
    name: "xt",
    title: "XT",
    productId: "498D443A",
    version: "1.0.0",
    type: "spot",
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Fetch existing exchanges to prevent duplicates
    const existingExchanges = await queryInterface.sequelize.query(
      "SELECT name FROM exchange",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const existingExchangeNames = new Set(
      existingExchanges.map((exchange) => exchange.name)
    );

    // Filter out exchanges that already exist and assign a UUID to each new one
    const newExchanges = Exchanges.filter(
      (exchange) => !existingExchangeNames.has(exchange.name)
    ).map((exchange) => ({
      ...exchange,
      id: uuidv4(), // Assign a new UUID
    }));

    // Only proceed with insertion if there are new exchanges
    if (newExchanges.length > 0) {
      await queryInterface.bulkInsert("exchange", newExchanges, {});
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("exchange", null, {});
  },
};
