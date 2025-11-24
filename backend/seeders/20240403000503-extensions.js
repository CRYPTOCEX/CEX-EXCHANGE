"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

const predefinedExtensions = [
  {
    productId: "B96677A0",
    name: "ai_investment",
    title: "AI Investments",
    description:
      "Enhance your trading experience with AI-driven investment strategies and insights.",
    link: "https://codecanyon.net/item/bot-investment-addon-for-bicrypto-crypto-trader-investment-subscription/35988984",
    image: "/img/extensions/ai-investment.png",
  },
  {
    productId: "EB4AADC3",
    name: "ecosystem",
    title: "EcoSystem & Native Trading",
    description:
      "Comprehensive ecosystem for native trading capabilities and integrated functionalities.",
    link: "https://codecanyon.net/item/ecosystem-native-trading-addon-for-bicrypto/40071914",
    image: "/img/extensions/ecosystem.png",
  },
  {
    productId: "F8C1C44E",
    name: "forex",
    title: "Forex & Investment",
    description:
      "Optimize your forex trading with advanced investment tools and features.",
    link: "https://codecanyon.net/item/forex-investment-addon-for-bicrypto/36668679",
    image: "/img/extensions/forex.png",
  },
  {
    productId: "61433370",
    name: "ico",
    title: "Token ICO",
    description:
      "Launch and manage your Initial Coin Offerings with ease and efficiency.",
    link: "https://codecanyon.net/item/token-ico-addon-for-bicrypto-token-offers-metamask-bep20-erc20-smart-contracts/36120046",
    image: "/img/extensions/ico.png",
  },
  {
    productId: "5868429E",
    name: "staking",
    title: "Staking Crypto",
    description:
      "Earn rewards by staking cryptocurrencies with our user-friendly staking platform.",
    link: "https://codecanyon.net/item/staking-crypto-addon-for-bicrypto-staking-investments-any-tokens-networks/37434481",
    image: "/img/extensions/staking.png",
  },
  {
    productId: "90AC59FB",
    name: "knowledge_base",
    title: "Knowledge Base & FAQs",
    description:
      "Comprehensive knowledge base and FAQs to support your users and improve engagement.",
    link: "https://codecanyon.net/item/knowledge-base-faqs-addon-for-bicrypto/39166202",
    image: "/img/extensions/knowledge-base.png",
  },
  {
    productId: "6FCAE834",
    name: "ecommerce",
    title: "Ecommerce",
    description:
      "Expand your business with ecommerce capabilities, including digital products and wishlists.",
    link: "https://codecanyon.net/item/ecommerce-addon-for-bicrypto-digital-products-wishlist-licenses/44624493",
    image: "/img/extensions/ecommerce.png",
  },
  {
    productId: "F47D081C",
    name: "wallet_connect",
    title: "Wallet Connect",
    description:
      "Seamlessly integrate wallet login and connect features into your platform.",
    link: "https://codecanyon.net/item/wallet-connect-addon-for-bicrypto-wallet-login-connect/37548018",
    image: "/img/extensions/wallet-connect.png",
  },
  {
    productId: "DBFE65CA",
    name: "p2p",
    title: "Peer To Peer Exchange",
    description:
      "Enable peer-to-peer trading with live chat, offers moderation, and more.",
    link: "https://codecanyon.net/item/p2p-trading-addon-for-bicrypto-p2p-livechat-offers-moderation/44593497",
    image: "/img/extensions/p2p.png",
  },
  {
    productId: "D29FD60F",
    name: "mlm",
    title: "Multi Level Marketing",
    description:
      "Incorporate multi-level marketing features into your platform to boost engagement.",
    link: "https://codecanyon.net/item/multi-level-marketing-addon-for-bicrypto/36667808",
    image: "/img/extensions/mlm.png",
  },
  {
    productId: "02B81D43",
    name: "mailwizard",
    title: "MailWizard",
    description:
      "Leverage AI for content and image generation, and design emails with drag-and-drop tools.",
    link: "https://codecanyon.net/item/mailwiz-addon-for-bicrypto-ai-image-generator-ai-content-generator-dragdrop-email-editor/45613491",
    image: "/img/extensions/mailwizard.png",
  },
  {
    productId: "C4160F60",
    name: "swap",
    title: "Swap",
    description:
      "Facilitate cryptocurrency swapping with ease and reliability.",
    link: null,
    image: "/img/extensions/swap.png",
  },
  // futures
  {
    productId: "A94B6354",
    name: "futures",
    title: "Futures",
    description:
      "Trade futures contracts with leverage and advanced trading features.",
    link: "https://codecanyon.net/item/futures-leverage-trading-addon-for-bicrypto/46094641",
    image: "/img/extensions/futures.png",
  },
  // nft
  {
    productId: "C472374E",
    name: "nft",
    title: "NFT Marketplace",
    description:
      "Create, sell, and trade NFTs with our user-friendly marketplace.",
    link: "",
    image: "/img/extensions/nft.png",
  },
  // payment gateway
  {
    productId: "B80789E1",
    name: "payment_gateway",
    title: "Payment Gateway",
    description:
      "Integrate payment gateways to enable seamless transactions on your platform.",
    link: "",
    image: "/img/extensions/payment-gateway.png",
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch existing extensions from the database
    const existingExtensions = await queryInterface.sequelize.query(
      "SELECT productId FROM extension",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Convert the result to a set for faster lookups
    const existingProductIds = new Set(
      existingExtensions.map((ext) => ext.productId)
    );

    // Separate new and existing extensions
    const newExtensions = [];
    const updateExtensions = [];

    predefinedExtensions.forEach((ext) => {
      if (existingProductIds.has(ext.productId)) {
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

    // Update existing extensions
    for (const ext of updateExtensions) {
      await queryInterface.sequelize.query(
        `UPDATE extension SET
          name = :name,
          title = :title,
          description = :description,
          link = :link,
          image = :image
        WHERE productId = :productId`,
        {
          replacements: {
            name: ext.name,
            title: ext.title,
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
    await queryInterface.bulkDelete("extension", null, {});
  },
};
