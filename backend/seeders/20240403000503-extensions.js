"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

const predefinedExtensions = [
  {
    productId: "35988984",
    name: "ai_investment",
    title: "AI Investments",
    description:
      "Enhance your trading experience with AI-driven investment strategies and insights.",
    link: "https://codecanyon.net/item/bot-investment-addon-for-bicrypto-crypto-trader-investment-subscription/35988984",
    image: "/img/extensions/ai-investment.png",
  },
  {
    productId: "40071914",
    name: "ecosystem",
    title: "EcoSystem & Native Trading",
    description:
      "Comprehensive ecosystem for native trading capabilities and integrated functionalities.",
    link: "https://codecanyon.net/item/ecosystem-native-trading-addon-for-bicrypto/40071914",
    image: "/img/extensions/ecosystem.png",
  },
  {
    productId: "36668679",
    name: "forex",
    title: "Forex & Investment",
    description:
      "Optimize your forex trading with advanced investment tools and features.",
    link: "https://codecanyon.net/item/forex-investment-addon-for-bicrypto/36668679",
    image: "/img/extensions/forex.png",
  },
  {
    productId: "36120046",
    name: "ico",
    title: "Token ICO",
    description:
      "Launch and manage your Initial Coin Offerings with ease and efficiency.",
    link: "https://codecanyon.net/item/token-ico-addon-for-bicrypto-token-offers-metamask-bep20-erc20-smart-contracts/36120046",
    image: "/img/extensions/ico.png",
  },
  {
    productId: "37434481",
    name: "staking",
    title: "Staking Crypto",
    description:
      "Earn rewards by staking cryptocurrencies with our user-friendly staking platform.",
    link: "https://codecanyon.net/item/staking-crypto-addon-for-bicrypto-staking-investments-any-tokens-networks/37434481",
    image: "/img/extensions/staking.png",
  },
  {
    productId: "39166202",
    name: "knowledge_base",
    title: "Knowledge Base & FAQs",
    description:
      "Comprehensive knowledge base and FAQs to support your users and improve engagement.",
    link: "https://codecanyon.net/item/knowledge-base-faqs-addon-for-bicrypto/39166202",
    image: "/img/extensions/knowledge-base.png",
  },
  {
    productId: "44624493",
    name: "ecommerce",
    title: "Ecommerce",
    description:
      "Expand your business with ecommerce capabilities, including digital products and wishlists.",
    link: "https://codecanyon.net/item/ecommerce-addon-for-bicrypto-digital-products-wishlist-licenses/44624493",
    image: "/img/extensions/ecommerce.png",
  },
  {
    productId: "37548018",
    name: "wallet_connect",
    title: "Wallet Connect",
    description:
      "Seamlessly integrate wallet login and connect features into your platform.",
    link: "https://codecanyon.net/item/wallet-connect-addon-for-bicrypto-wallet-login-connect/37548018",
    image: "/img/extensions/wallet-connect.png",
  },
  {
    productId: "44593497",
    name: "p2p",
    title: "Peer To Peer Exchange",
    description:
      "Enable peer-to-peer trading with live chat, offers moderation, and more.",
    link: "https://codecanyon.net/item/p2p-trading-addon-for-bicrypto-p2p-livechat-offers-moderation/44593497",
    image: "/img/extensions/p2p.png",
  },
  {
    productId: "36667808",
    name: "mlm",
    title: "Multi Level Marketing",
    description:
      "Incorporate multi-level marketing features into your platform to boost engagement.",
    link: "https://codecanyon.net/item/multi-level-marketing-addon-for-bicrypto/36667808",
    image: "/img/extensions/mlm.png",
  },
  {
    productId: "45613491",
    name: "mailwizard",
    title: "MailWizard",
    description:
      "Leverage AI for content and image generation, and design emails with drag-and-drop tools.",
    link: "https://codecanyon.net/item/mailwiz-addon-for-bicrypto-ai-image-generator-ai-content-generator-dragdrop-email-editor/45613491",
    image: "/img/extensions/mailwizard.png",
  },
  {
    productId: "46094641",
    name: "futures",
    title: "Futures",
    description:
      "Trade futures contracts with leverage and advanced trading features.",
    link: "https://codecanyon.net/item/futures-leverage-trading-addon-for-bicrypto/46094641",
    image: "/img/extensions/futures.png",
  },
  {
    productId: "60962133",
    name: "nft",
    title: "NFT Marketplace",
    description:
      "Create, sell, and trade NFTs with our user-friendly marketplace.",
    link: "https://codecanyon.net/item/nft-marketplace-addon-for-bicrypto-ecosystem-wallet-connect/60962133",
    image: "/img/extensions/nft.png",
  },
  {
    productId: "61007981",
    name: "ai_market_maker",
    title: "AI Market Maker",
    description:
      "AI-powered market making system with automated trading bots, liquidity management, and intelligent price discovery for ecosystem markets.",
    link: "https://codecanyon.net/item/ai-market-maker-automated-trading-bots-liquidity-management-price-stabilization-for-ecosystem/61007981",
    image: "/img/extensions/ai-market-maker.png",
  },
  {
    productId: "61043226",
    name: "gateway",
    title: "Payment Gateway",
    description:
      "Accept cryptocurrency payments from any website with our Payment Gateway addon. Supports multi-wallet payments, automatic currency conversion, and merchant dashboards.",
    link: "https://codecanyon.net/item/payment-gateway-addon-multiwallet-payments-merchant-onboarding-woocommerce-plugin-for-bicrypto/61043226",
    image: "/img/extensions/gateway.png",
  },
  {
    productId: "61107157",
    name: "copy_trading",
    title: "Copy Trading",
    description:
      "Enable social trading by allowing users to follow and automatically copy trades from successful traders. Features include leader profiles, follower management, profit sharing, and real-time trade replication.",
    link: "https://codecanyon.net/item/copy-trading-for-bicrypto-social-trading-signal-providers-automated-portfolio-mirroring-addon/61107157",
    image: "/img/extensions/copy-trading.png",
  },
  {
    productId: "61364182",
    name: "chart_engine",
    title: "Chart Engine",
    description:
      "Premium charting engine optimized for binary trading with order visualization, P/L zones, expiry countdown timers, limit order alerts, and advanced price action features. Seamless integration with all order types.",
    link: "https://codecanyon.net/item/chart-engine-binary-trading-visualization-plzones-order-markers-countdown-addon-for-bicrypto/61200000",
    image: "/img/extensions/chart-engine.png",
  },
  {
    productId: "61364183",
    name: "binary_ai_engine",
    title: "Binary AI Engine",
    description:
      "Advanced AI-powered binary options trading engine with adaptive win rates, ML optimization, A/B testing, cohort analysis, and external price correlation monitoring.",
    link: null,
    image: "/img/extensions/binary-ai-engine.png",
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch existing extensions from the database by name
    const existingExtensions = await queryInterface.sequelize.query(
      "SELECT name FROM extension",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Convert the result to a set for faster lookups
    const existingNames = new Set(
      existingExtensions.map((ext) => ext.name)
    );

    // Separate new and existing extensions
    const newExtensions = [];
    const updateExtensions = [];

    predefinedExtensions.forEach((ext) => {
      if (existingNames.has(ext.name)) {
        updateExtensions.push(ext);
      } else {
        newExtensions.push({
          ...ext,
          status: false,
          id: uuidv4(),
        });
      }
    });

    // Perform bulk insert for new extensions
    if (newExtensions.length > 0) {
      await queryInterface.bulkInsert("extension", newExtensions);
    }

    // Update existing extensions by name (updates productId, title, description, link, image)
    // Does NOT update status or version
    for (const ext of updateExtensions) {
      await queryInterface.sequelize.query(
        `UPDATE extension SET
          productId = :productId,
          title = :title,
          description = :description,
          link = :link,
          image = :image
        WHERE name = :name`,
        {
          replacements: {
            productId: ext.productId,
            title: ext.title,
            description: ext.description,
            link: ext.link,
            image: ext.image,
            name: ext.name,
          },
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("extension", null, {});
  },
};
