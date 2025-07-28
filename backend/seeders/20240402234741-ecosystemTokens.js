"use strict";
const { v4: uuidv4 } = require("uuid");

const tokens = require("./tokenlist.json");
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tokenRecords = [];
    Object.keys(tokens).forEach((chain) => {
      tokens[chain].forEach((token) => {
        tokenRecords.push({
          id: uuidv4(),
          name: token.name,
          currency: token.symbol,
          chain,
          network: token.network || "mainnet",
          type: token.type,
          contract: token.address,
          decimals: token.decimals,
          icon: token.logoURI,
          contractType: token.contractType || "NO_PERMIT",
          status: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    // Fetch existing records to prevent duplicates
    const existingTokens = await queryInterface.sequelize.query(
      "SELECT name, currency, chain FROM ecosystem_token",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const existingTokenSet = new Set(
      existingTokens.map(
        ({ name, currency, chain }) => `${name}-${currency}-${chain}`
      )
    );

    // Filter out tokens that already exist
    const newTokenRecords = tokenRecords.filter(
      ({ name, currency, chain }) =>
        !existingTokenSet.has(`${name}-${currency}-${chain}`)
    );

    // Only proceed with insertion if there are new unique tokens
    if (newTokenRecords.length > 0) {
      await queryInterface.bulkInsert("ecosystem_token", newTokenRecords, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ecosystem_token", null, {});
  },
};
