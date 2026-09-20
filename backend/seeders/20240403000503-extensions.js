"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

// `version` is only honoured on INSERT — the update branch below deliberately
// leaves it alone so the license sync (syncProductVersions) stays its owner.
// Set it on any addon whose first release is already 6.x, otherwise the row
// lands on the model default 0.0.1 and the admin products page advertises a
// six-major-versions-old build that was never shipped.
const predefinedExtensions = [
  {
    productId: "35988984",
    name: "ai_investment",
    title: "AI Investments",
    description:
      "Enhance your trading experience with AI-driven investment strategies and insights.",
    link: "https://mashdiv.com/products/ai-investments",
    image: "/img/store/ai-investments.svg",
  },
  {
    productId: "35988084",
    name: "hummingbot",
    title: "Hummingbot Connector",
    description:
      "Plug Bicrypto's ecosystem and futures CLOBs into Hummingbot v2 for PMM and XEMM market-making — bridge local liquidity to MEXC, Hyperliquid and other deep external venues.",
    link: "https://mashdiv.com/products/hummingbot-connector",
    image: "/img/store/hummingbot.svg",
    version: "6.1.6",
  },
  {
    productId: "40071914",
    name: "ecosystem",
    title: "EcoSystem & Native Trading",
    description:
      "Comprehensive ecosystem for native trading capabilities and integrated functionalities.",
    link: "https://mashdiv.com/products/ecosystem",
    image: "/img/store/ecosystem.svg",
  },
  {
    productId: "36668679",
    name: "forex",
    title: "Forex Broker & Investments",
    description:
      "Connect clients to MT4/MT5 broker accounts and offer managed forex investment plans with configurable returns.",
    link: "https://mashdiv.com/products/forex",
    image: "/img/store/forex.svg",
  },
  {
    // TODO: replace placeholder productId with the real Envato item ID before release
    productId: "62000000",
    name: "forex_trading",
    title: "Forex & Multi-Asset Trading",
    description:
      "Real multi-asset trading engine: forex, stocks, commodities and indices with live market data, margin/leverage, SL/TP, trailing stops, swaps, sessions and an operator risk desk.",
    // The store slug is NOT the extension name — the listing is
    // "forex-multi-asset-trading". Same for hummingbot / binary_ai_engine below.
    link: "https://mashdiv.com/products/forex-multi-asset-trading",
    image: "/img/store/forex-trading.svg",
    version: "6.0.1",
  },
  {
    productId: "36120046",
    name: "ico",
    title: "Token ICO",
    description:
      "Launch and manage your Initial Coin Offerings with ease and efficiency.",
    link: "https://mashdiv.com/products/ico",
    image: "/img/store/ico.svg",
  },
  {
    productId: "37434481",
    name: "staking",
    title: "Staking Crypto",
    description:
      "Earn rewards by staking cryptocurrencies with our user-friendly staking platform.",
    link: "https://mashdiv.com/products/staking",
    image: "/img/store/staking.svg",
  },
  {
    productId: "39166202",
    name: "knowledge_base",
    title: "Knowledge Base & FAQs",
    description:
      "Comprehensive knowledge base and FAQs to support your users and improve engagement.",
    link: "https://mashdiv.com/products/faq-system",
    image: "/img/store/faq-system.svg",
  },
  {
    productId: "44624493",
    name: "ecommerce",
    title: "Ecommerce",
    description:
      "Expand your business with ecommerce capabilities, including digital products and wishlists.",
    link: "https://mashdiv.com/products/ecommerce",
    image: "/img/store/ecommerce.svg",
  },
  {
    productId: "37548018",
    name: "wallet_connect",
    title: "Wallet Connect",
    description:
      "Seamlessly integrate wallet login and connect features into your platform.",
    link: "https://mashdiv.com/products/wallet-connect",
    image: "/img/store/wallet-connect.svg",
  },
  {
    productId: "44593497",
    name: "p2p",
    title: "Peer To Peer Exchange",
    description:
      "Enable peer-to-peer trading with live chat, offers moderation, and more.",
    link: "https://mashdiv.com/products/p2p",
    image: "/img/store/p2p.svg",
  },
  {
    productId: "36667808",
    name: "mlm",
    title: "Multi Level Marketing",
    description:
      "Incorporate multi-level marketing features into your platform to boost engagement.",
    link: "https://mashdiv.com/products/mlm",
    image: "/img/store/mlm.svg",
  },
  {
    productId: "45613491",
    name: "mailwizard",
    title: "MailWizard",
    // There is no AI anywhere in this addon — no content generation, no image
    // generation. The drag-and-drop editor is real; the rest was not.
    description:
      "Design emails from reusable drag-and-drop blocks and send them to your own users on an hourly job.",
    link: "https://mashdiv.com/products/mailwizard-bicrypto",
    image: "/img/store/mailwizard-bicrypto.svg",
  },
  {
    productId: "46094641",
    name: "futures",
    title: "Futures",
    description:
      "Trade futures contracts with leverage and advanced trading features.",
    link: "https://mashdiv.com/products/futures",
    image: "/img/store/futures.svg",
  },
  {
    productId: "60962133",
    name: "nft",
    title: "NFT Marketplace",
    description:
      "Create, sell, and trade NFTs with our user-friendly marketplace.",
    link: "https://mashdiv.com/products/nft-marketplace",
    image: "/img/store/nft-marketplace.svg",
  },
  {
    productId: "61007981",
    name: "ai_market_maker",
    title: "AI Market Maker",
    description:
      "AI-powered market making system with automated trading bots, liquidity management, and intelligent price discovery for ecosystem markets.",
    link: "https://mashdiv.com/products/ai-market-maker",
    image: "/img/store/ai-market-maker.svg",
  },
  {
    productId: "61043226",
    name: "gateway",
    title: "Payment Gateway",
    description:
      "Accept cryptocurrency payments from any website with our Payment Gateway addon. Supports multi-wallet payments, automatic currency conversion, and merchant dashboards.",
    link: "https://mashdiv.com/products/payment-gateway",
    image: "/img/store/payment-gateway.svg",
  },
  {
    productId: "61107157",
    name: "copy_trading",
    title: "Copy Trading",
    description:
      "Enable social trading by allowing users to follow and automatically copy trades from successful traders. Features include leader profiles, follower management, profit sharing, and real-time trade replication.",
    link: "https://mashdiv.com/products/copy-trading",
    image: "/img/store/copy-trading.svg",
  },
  {
    productId: "61364182",
    name: "chart_engine",
    title: "Chart Engine",
    description:
      "Premium charting engine optimized for binary trading with order visualization, P/L zones, expiry countdown timers, limit order alerts, and advanced price action features. Seamless integration with all order types.",
    link: "https://mashdiv.com/products/chart-engine",
    image: "/img/store/chart-engine.svg",
  },
  {
    productId: "61364183",
    name: "binary_ai_engine",
    title: "Binary AI Engine",
    description:
      "Advanced AI-powered binary options trading engine with adaptive win rates, ML optimization, A/B testing, cohort analysis, and external price correlation monitoring.",
    link: "https://mashdiv.com/products/binary-trading-ai-engine",
    image: "/img/store/binary-ai-engine.svg",
    version: "6.2.0",
  },
  {
    productId: "61500000",
    name: "trading_bot",
    title: "Algo Trading Bots",
    description:
      "User-run algorithmic trading bots with multiple strategies (DCA, Grid, Indicator, Trailing Stop), strategy marketplace with revenue sharing, paper trading simulation, and comprehensive risk management controls.",
    link: "https://mashdiv.com/products/trading-bot",
    image: "/img/store/trading-bot.svg",
    version: "6.0.0",
  },
  {
    // TODO: replace this placeholder with the real Envato item ID before release.
    // The same number must also land in the four hand-maintained productId maps
    // (patch-notes route, docs-server, frontend/store/patch-notes.ts,
    // frontend/lib/product-features.ts) — that is Phase 6 packaging work.
    productId: "62100000",
    name: "dex",
    title: "Web3 Wallet & On-Chain Trading",
    description:
      "A self-custody wallet layer and an on-chain trading desk. Users connect their own wallet, hold their own keys, and trade through aggregated DeFi liquidity across six EVM chains. The platform holds no funds, deploys no contracts, and never signs on a user's behalf.",
    // The store slug is NOT the extension name — same convention as
    // forex_trading -> forex-multi-asset-trading above. Two naming rules from
    // plans/DEX-SYSTEM.md, both binding:
    //   - Never "DEX" in a product name: `trade/pro` already calls the in-house
    //     ecosystem "the DEX" (OrderTypeSelector.tsx:41), and :9 forbids this
    //     addon reading as "a DEX we operate".
    //   - "Trading", not "Swap": Swap is the name of the user-facing TERMINAL
    //     (:7). The addon also ships the whole Phase-3 wallet layer, and Phases
    //     7-8 add bridging and operator liquidity pools.
    link: "https://mashdiv.com/products/web3-wallet-trading",
    image: "/img/store/web3-wallet-trading.svg",
    version: "6.0.0",
  },
  {
    // PLACEHOLDER until the CodeCanyon item exists — the same number is in
    // `backend/src/config/license.ts` and must be replaced in both places at
    // once, or the licence gate validates against an id that does not exist.
    productId: "62000001",
    name: "ai_support",
    title: "AI Support Agent",
    description:
      "Answers tickets and live chat from your own documentation, cites every source, and refuses anything it cannot ground — fees, limits and review times are answerable only from articles you wrote, in any language. Deflects questions before the ticket is filed, serves your published articles verbatim at no cost, and turns the replies your agents already typed into draft articles overnight. Ships in copilot mode: it drafts, your team sends.",
    // Store slug is not the extension name — same convention as
    // forex_trading -> forex-multi-asset-trading above.
    link: "https://mashdiv.com/products/ai-support-agent",
    image: "/img/store/ai-support-agent.svg",
    version: "6.0.0",
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
