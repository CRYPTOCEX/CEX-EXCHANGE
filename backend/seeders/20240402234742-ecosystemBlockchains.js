"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

const predefinedEcosystemBlockchains = [
  {
    productId: "AC6A4329",
    chain: "SOL",
    name: "Solana Blockchain for Ecosystem Addon",
    description:
      "Integrate Solana blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "",
    image: "/img/blockchains/sol.png",
  },
  // tron
  {
    productId: "AC6A4330",
    chain: "TRON",
    name: "Tron Blockchain for Ecosystem Addon",
    description:
      "Integrate Tron blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "",
    image: "/img/blockchains/trx.png",
  },
  // xmr
  {
    productId: "AC6A4331",
    chain: "XMR",
    name: "Monero Blockchain for Ecosystem Addon",
    description:
      "Integrate Monero blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "",
    image: "/img/blockchains/xmr.png",
  },
  // MO
  {
    productId: "2ED90A72",
    chain: "MO",
    name: "MO Chain for Ecosystem Addon",
    description:
      "Integrate MO Chain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "",
    image: "/img/crypto/mo.webp",
  },
  // ton
  {
    productId: "AC6A4332",
    chain: "TON",
    name: "TON Blockchain for Ecosystem Addon",
    description:
      "Integrate TON blockchain into your ecosystem for seamless trading and deposits and withdrawals.",
    link: "",
    image: "/img/blockchains/ton.png",
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch existing ecosystemblockchains from the database
    const existingEcosystemBlockchains = await queryInterface.sequelize.query(
      "SELECT productId FROM ecosystem_blockchain",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Convert the result to a set for faster lookups
    const existingProductIds = new Set(
      existingEcosystemBlockchains.map((ext) => ext.productId)
    );

    // Separate new and existing ecosystemblockchains
    const newEcosystemBlockchains = [];
    const updateEcosystemBlockchains = [];

    predefinedEcosystemBlockchains.forEach((ext) => {
      if (existingProductIds.has(ext.productId)) {
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

    // Update existing ecosystemblockchains
    for (const ext of updateEcosystemBlockchains) {
      await queryInterface.sequelize.query(
        `UPDATE ecosystem_blockchain SET
          name = :name,
          chain = :chain,
          description = :description,
          link = :link,
          image = :image
        WHERE productId = :productId`,
        {
          replacements: {
            name: ext.name,
            chain: ext.chain,
            description: ext.description,
            link: ext.link,
            image: ext.image,
            productId: ext.productId,
          },
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ecosystem_blockchain", null, {});
  },
};
