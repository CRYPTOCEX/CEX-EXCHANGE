"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

const predefinedEcosystemBlockchains = [
  {
    productId: "54514052",
    chain: "SOL",
    name: "Solana Blockchain for Ecosystem Addon",
    description:
      "Integrate Solana blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "https://codecanyon.net/item/solana-blockchain-for-ecosystem-addon/54514052",
    image: "/img/blockchains/sol.png",
  },
  {
    productId: "54577641",
    chain: "TRON",
    name: "Tron Blockchain for Ecosystem Addon",
    description:
      "Integrate Tron blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "https://codecanyon.net/item/tron-trx-blockchain-for-ecosystem-addon/54577641",
    image: "/img/blockchains/trx.png",
  },
  {
    productId: "54578959",
    chain: "XMR",
    name: "Monero Blockchain for Ecosystem Addon",
    description:
      "Integrate Monero blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "https://codecanyon.net/item/monero-xmr-blockchain-for-ecosystem-addon/54578959",
    image: "/img/blockchains/xmr.png",
  },
  {
    productId: "55715370",
    chain: "TON",
    name: "TON Blockchain for Ecosystem Addon",
    description:
      "Integrate TON blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "https://codecanyon.net/item/ton-ton-blockchain-for-ecosystem-addon/55715370",
    image: "/img/blockchains/ton.png",
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch existing ecosystemblockchains from the database by chain
    const existingEcosystemBlockchains = await queryInterface.sequelize.query(
      "SELECT chain FROM ecosystem_blockchain",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Convert the result to a set for faster lookups
    const existingChains = new Set(
      existingEcosystemBlockchains.map((ext) => ext.chain)
    );

    // Separate new and existing ecosystemblockchains
    const newEcosystemBlockchains = [];
    const updateEcosystemBlockchains = [];

    predefinedEcosystemBlockchains.forEach((ext) => {
      if (existingChains.has(ext.chain)) {
        updateEcosystemBlockchains.push(ext);
      } else {
        newEcosystemBlockchains.push({
          ...ext,
          status: false,
          id: uuidv4(),
        });
      }
    });

    // Perform bulk insert for new ecosystemblockchains
    if (newEcosystemBlockchains.length > 0) {
      await queryInterface.bulkInsert(
        "ecosystem_blockchain",
        newEcosystemBlockchains
      );
    }

    // Update existing ecosystemblockchains by chain (updates productId, name, description, link, image)
    // Does NOT update status or version
    for (const ext of updateEcosystemBlockchains) {
      await queryInterface.sequelize.query(
        `UPDATE ecosystem_blockchain SET
          productId = :productId,
          name = :name,
          description = :description,
          link = :link,
          image = :image
        WHERE chain = :chain`,
        {
          replacements: {
            productId: ext.productId,
            name: ext.name,
            description: ext.description,
            link: ext.link,
            image: ext.image,
            chain: ext.chain,
          },
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ecosystem_blockchain", null, {});
  },
};
