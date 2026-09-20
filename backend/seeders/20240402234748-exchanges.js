"use strict";
const { v4: uuidv4 } = require("uuid");

const Exchanges = [
  {
    name: "kucoin",
    title: "KuCoin",
    description: "Integrate KuCoin exchange for spot trading with real-time market data, order execution, and balance management.",
    productId: "37179816",
    link: "https://mashdiv.com/products/kucoin-provider",
    type: "spot",
  },
  {
    name: "binance",
    title: "Binance",
    description: "Connect to Binance, the world's largest cryptocurrency exchange, for high-liquidity spot trading and comprehensive market data.",
    productId: "38650585",
    link: "https://mashdiv.com/products/binance-provider",
    type: "spot",
  },
  {
    name: "xt",
    title: "XT",
    description: "Integrate XT exchange for global digital asset trading with real-time prices, order management, and multi-currency support.",
    productId: "54510301",
    link: "https://mashdiv.com/products/xt-provider",
    type: "spot",
  },
  {
    name: "okx",
    title: "OKX",
    description: "Integrate OKX exchange for spot trading with deep liquidity, real-time market data, order execution, and multi-chain withdrawals.",
    productId: "okx-custom",
    link: "https://www.okx.com",
    type: "spot",
  },
  {
    name: "binanceus",
    title: "Binance.US",
    description: "Connect to Binance.US for compliant spot trading in the United States with real-time market data and order management.",
    productId: "binanceus-custom",
    link: "https://www.binance.us",
    type: "spot",
  },
  {
    name: "bybit",
    title: "Bybit",
    description: "Integrate Bybit exchange for high-performance spot trading with deep liquidity and multi-chain deposit/withdrawal support.",
    productId: "bybit-custom",
    link: "https://www.bybit.com",
    type: "spot",
  },
  {
    name: "mexc",
    title: "MEXC",
    description: "Connect to MEXC Global for spot trading across a wide range of digital assets with fast order execution.",
    productId: "mexc-custom",
    link: "https://www.mexc.com",
    type: "spot",
  },
  {
    name: "gate",
    title: "Gate.io",
    description: "Integrate Gate.io exchange for spot trading with broad market coverage, real-time prices, and multi-chain withdrawals.",
    productId: "gate-custom",
    link: "https://www.gate.io",
    type: "spot",
  },
  {
    name: "bitget",
    title: "Bitget",
    description: "Integrate Bitget exchange for spot trading with reliable order execution and multi-network deposit/withdrawal support.",
    productId: "bitget-custom",
    link: "https://www.bitget.com",
    type: "spot",
  },
  {
    name: "kraken",
    title: "Kraken",
    description: "Connect to Kraken for spot trading, deposits, and withdrawals using the official REST API.",
    productId: "kraken-custom",
    link: "https://www.kraken.com",
    type: "spot",
  },
  {
    name: "coinbase",
    title: "Coinbase Exchange",
    description: "Coinbase Exchange (pro) spot provider — deposit addresses and crypto withdrawals via the official Exchange API.",
    productId: "coinbase-custom",
    link: "https://docs.cdp.coinbase.com/exchange/reference",
    type: "spot",
  },
  {
    name: "htx",
    title: "HTX",
    description: "HTX (Huobi) spot trading, multi-chain deposits, and withdrawals via the public HTX API.",
    productId: "htx-custom",
    link: "https://www.htx.com",
    type: "spot",
  },
  {
    name: "upbit",
    title: "Upbit",
    description: "Upbit spot markets with deposit address and withdrawal support through the official API.",
    productId: "upbit-custom",
    link: "https://upbit.com",
    type: "spot",
  },
  {
    name: "cryptocom",
    title: "Crypto.com",
    description: "Crypto.com Exchange spot trading, deposits, and withdrawals via the official Exchange API.",
    productId: "cryptocom-custom",
    link: "https://crypto.com/exchange",
    type: "spot",
  },
  {
    name: "bitfinex",
    title: "Bitfinex",
    description: "Bitfinex spot trading with wallet deposits and withdrawals through the public REST API.",
    productId: "bitfinex-custom",
    link: "https://www.bitfinex.com",
    type: "spot",
  },
  {
    name: "lbank",
    title: "LBank",
    description: "LBank spot trading, multi-network deposits, and withdrawals via the official API.",
    productId: "lbank-custom",
    link: "https://www.lbank.com",
    type: "spot",
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
          licenseStatus: true,
          version: exchange.version || "5.0.0",
          status: false,
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
