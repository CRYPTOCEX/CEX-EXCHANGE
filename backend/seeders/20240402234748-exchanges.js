"use strict";
const { v4: uuidv4 } = require("uuid");

const Exchanges = [
  {
    name: "kucoin",
    title: "KuCoin",
    description: "Integrate KuCoin exchange for spot trading with real-time market data, order execution, and balance management.",
    productId: "37179816",
    link: "https://codecanyon.net/item/kucoin-exchange-provider-for-bicrypto/37179816",
    type: "spot",
  },
  {
    name: "binance",
    title: "Binance",
    description: "Connect to Binance, the world's largest cryptocurrency exchange, for high-liquidity spot trading and comprehensive market data.",
    productId: "38650585",
    link: "https://codecanyon.net/item/binance-exchange-provider-for-bicrypto/38650585",
    type: "spot",
  },
  {
    name: "xt",
    title: "XT",
    description: "Integrate XT exchange for global digital asset trading with real-time prices, order management, and multi-currency support.",
    productId: "54510301",
    link: "https://codecanyon.net/item/xt-exchange-provider-for-bicrypto-trading-platform/54510301",
    type: "spot",
  },
  {
    name: "okx",
    title: "OKX",
    description: "Integrate OKX exchange for spot trading with deep liquidity, real-time market data, order execution, and multi-chain withdrawals.",
    productId: "okx-custom",
    link: null,
    type: "spot",
    licenseStatus: true,
    version: "5.0.0",
  },
  {
    name: "binanceus",
    title: "Binance.US",
    description: "Connect to Binance.US for compliant spot trading in the United States with real-time market data and order management.",
    productId: "binanceus-custom",
    link: null,
    type: "spot",
    licenseStatus: true,
    version: "5.0.0",
  },
  {
    name: "bybit",
    title: "Bybit",
    description: "Integrate Bybit exchange for high-performance spot trading with deep liquidity and multi-chain deposit/withdrawal support.",
    productId: "bybit-custom",
    link: null,
    type: "spot",
    licenseStatus: true,
    version: "5.0.0",
  },
  {
    name: "mexc",
    title: "MEXC",
    description: "Connect to MEXC Global for spot trading across a wide range of digital assets with fast order execution.",
    productId: "mexc-custom",
    link: null,
    type: "spot",
    licenseStatus: true,
    version: "5.0.0",
  },
  {
    name: "gate",
    title: "Gate.io",
    description: "Integrate Gate.io exchange for spot trading with broad market coverage, real-time prices, and multi-chain withdrawals.",
    productId: "gate-custom",
    link: null,
    type: "spot",
    licenseStatus: true,
    version: "5.0.0",
  },
  {
    name: "bitget",
    title: "Bitget",
    description: "Integrate Bitget exchange for spot trading with reliable order execution and multi-network deposit/withdrawal support.",
    productId: "bitget-custom",
    link: null,
    type: "spot",
    licenseStatus: true,
    version: "5.0.0",
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Fetch existing exchanges to check by name
    const existingExchanges = await queryInterface.sequelize.query(
      "SELECT name FROM exchange",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const existingExchangeNames = new Set(
      existingExchanges.map((exchange) => exchange.name)
    );

    // Separate new and existing exchanges
    const newExchanges = [];
    const updateExchanges = [];

    Exchanges.forEach((exchange) => {
      if (existingExchangeNames.has(exchange.name)) {
        updateExchanges.push(exchange);
      } else {
        newExchanges.push({
          ...exchange,
          id: uuidv4(),
        });
      }
    });

    // Perform bulk insert for new exchanges
    if (newExchanges.length > 0) {
      await queryInterface.bulkInsert("exchange", newExchanges, {});
    }

    // Update existing exchanges by name (updates productId, title, description, link, type)
    // Does NOT update status or version
    for (const exchange of updateExchanges) {
      await queryInterface.sequelize.query(
        `UPDATE exchange SET
          productId = :productId,
          title = :title,
          description = :description,
          link = :link,
          type = :type
        WHERE name = :name`,
        {
          replacements: {
            productId: exchange.productId,
            title: exchange.title,
            description: exchange.description,
            link: exchange.link,
            type: exchange.type,
            name: exchange.name,
          },
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("exchange", null, {});
  },
};
