"use strict";

const predefinedConditions = [
  // ===== DEPOSIT CONDITIONS =====
  {
    type: "DEPOSIT",
    name: "WELCOME_BONUS",
    title: "Welcome Deposit Bonus",
    description: "A welcome bonus for the first deposit of at least 100 USDT",
    reward: 10,
    rewardType: "PERCENTAGE",
    minAmount: 100, // Requires USDT currency
  },
  {
    type: "DEPOSIT",
    name: "FIRST_DEPOSIT_BONUS",
    title: "First Deposit Reward",
    description: "Commission earned when a referred user makes their first deposit",
    reward: 5,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
  {
    type: "DEPOSIT",
    name: "DEPOSIT",
    title: "Deposit Commission",
    description: "Commission earned on every deposit made by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },

  // ===== SPOT TRADING CONDITIONS =====
  {
    type: "SPOT_TRADE",
    name: "SPOT_TRADE",
    title: "Spot Trade Commission",
    description: "Commission earned on spot trades executed by referred users",
    reward: 0.1,
    rewardType: "PERCENTAGE",
    minAmount: 1,
  },
  {
    type: "SPOT_TRADE",
    name: "SPOT_TRADE_VOLUME",
    title: "Spot Trading Volume Bonus",
    description: "Bonus for referred users achieving high spot trading volume",
    reward: 25,
    rewardType: "FIXED",
    minAmount: 500,
  },

  // ===== GENERAL TRADING CONDITIONS =====
  {
    type: "TRADE",
    name: "MONTHLY_TRADE_VOLUME",
    title: "Monthly Trade Volume Bonus",
    description: "A reward for users who trade more than 1,000 USDT in a month",
    reward: 50,
    rewardType: "FIXED",
    minAmount: 1000, // Requires USDT currency
  },
  {
    type: "TRADE",
    name: "TRADE_COMMISSION",
    title: "Trade Commission Reward",
    description: "A commission for the broker on every trade executed",
    reward: 0.1,
    rewardType: "PERCENTAGE",
    minAmount: 1,
  },
  {
    type: "TRADE",
    name: "TRADE",
    title: "Trading Activity Reward",
    description: "Reward for general trading activity by referred users",
    reward: 0.05,
    rewardType: "PERCENTAGE",
    minAmount: 1,
  },

  // ===== BINARY OPTIONS CONDITIONS =====
  {
    type: "BINARY_WIN",
    name: "BINARY_WIN",
    title: "Binary Options Win Reward",
    description: "Commission on winning binary options trades by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },
  {
    type: "BINARY_WIN",
    name: "BINARY_WIN_COMMISSION",
    title: "Binary Options Winning Trade Bonus",
    description: "A fixed bonus for winning binary options trades",
    reward: 50,
    rewardType: "FIXED",
    minAmount: 10,
  },
  {
    type: "BINARY_WIN",
    name: "BINARY_TRADE_VOLUME",
    title: "Binary Options Monthly Volume",
    description: "Bonus for achieving high binary trading volume in a month",
    reward: 100,
    rewardType: "FIXED",
    minAmount: 1000, // Requires USDT currency
  },

  // ===== INVESTMENT CONDITIONS =====
  {
    type: "INVESTMENT",
    name: "INVESTMENT",
    title: "Investment Bonus",
    description: "A bonus for investing in the company",
    reward: 5,
    rewardType: "PERCENTAGE",
    minAmount: 50,
  },
  {
    type: "INVESTMENT",
    name: "GENERAL_INVESTMENT",
    title: "General Investment Commission",
    description: "Commission on investment profits by referred users",
    reward: 3,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },

  // ===== AI INVESTMENT CONDITIONS =====
  {
    type: "AI_INVESTMENT",
    name: "AI_INVESTMENT",
    title: "AI Managed Portfolio Bonus",
    description: "Bonus for investing in AI managed portfolios",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 25,
  },
  {
    type: "AI_INVESTMENT",
    name: "AI_INVESTMENT_PROFIT",
    title: "AI Investment Profit Share",
    description: "Commission on AI investment profits earned by referred users",
    reward: 1,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },

  // ===== FOREX INVESTMENT CONDITIONS =====
  {
    type: "FOREX_INVESTMENT",
    name: "FOREX_INVESTMENT",
    title: "Forex Investment Bonus",
    description: "Bonus for investing in Forex",
    reward: 100,
    rewardType: "FIXED",
    minAmount: 100,
  },
  {
    type: "FOREX_INVESTMENT",
    name: "FOREX_PROFIT",
    title: "Forex Profit Commission",
    description: "Commission on Forex investment profits by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },

  // ===== ICO CONDITIONS =====
  {
    type: "ICO_CONTRIBUTION",
    name: "ICO_CONTRIBUTION",
    title: "ICO Participation Bonus",
    description: "A special bonus for contributing to an Initial Coin Offering",
    reward: 15,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
  {
    type: "ICO_CONTRIBUTION",
    name: "ICO_PURCHASE",
    title: "ICO Token Purchase Reward",
    description: "Reward for ICO token purchases made by referred users",
    reward: 5,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },

  // ===== STAKING CONDITIONS =====
  {
    type: "STAKING",
    name: "STAKING_LOYALTY",
    title: "Staking Loyalty Bonus",
    description: "A loyalty bonus for users who stake their coins for a certain period",
    reward: 3,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
  {
    type: "STAKING",
    name: "STAKING",
    title: "Staking Commission",
    description: "Commission on staking rewards earned by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 1,
  },

  // ===== ECOMMERCE CONDITIONS =====
  {
    type: "ECOMMERCE_PURCHASE",
    name: "ECOMMERCE_PURCHASE",
    title: "Ecommerce Shopping Reward",
    description: "Cashback reward for purchases made on the ecommerce platform",
    reward: 5,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },
  {
    type: "ECOMMERCE_PURCHASE",
    name: "ECOMMERCE_ORDER",
    title: "Ecommerce Order Commission",
    description: "Commission on completed ecommerce orders by referred users",
    reward: 3,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },

  // ===== P2P TRADING CONDITIONS =====
  {
    type: "P2P_TRADE",
    name: "P2P_TRADE",
    title: "P2P Trading Reward",
    description: "A reward for trading on the P2P platform",
    reward: 1,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
  {
    type: "P2P_TRADE",
    name: "P2P_TRADE_COMPLETION",
    title: "P2P Trade Completion Bonus",
    description: "Bonus for successful P2P trade completions by referred users",
    reward: 0.5,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },

  // ===== NFT CONDITIONS =====
  {
    type: "NFT_TRADE",
    name: "NFT_PURCHASE",
    title: "NFT Purchase Commission",
    description: "Commission on NFT purchases made by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },
  {
    type: "NFT_TRADE",
    name: "NFT_SALE",
    title: "NFT Sale Commission",
    description: "Commission on NFT sales completed by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },
  {
    type: "NFT_TRADE",
    name: "NFT_TRADE",
    title: "NFT Trading Reward",
    description: "General reward for NFT trading activity by referred users",
    reward: 1.5,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },

  // ===== COPY TRADING CONDITIONS =====
  {
    type: "COPY_TRADING",
    name: "COPY_TRADING",
    title: "Copy Trading Commission",
    description: "Commission on copy trading investments by referred users",
    reward: 3,
    rewardType: "PERCENTAGE",
    minAmount: 50,
  },
  {
    type: "COPY_TRADING",
    name: "COPY_TRADING_PROFIT",
    title: "Copy Trading Profit Share",
    description: "Commission on copy trading profits earned by referred users",
    reward: 1,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },

  // ===== FUTURES TRADING CONDITIONS =====
  {
    type: "FUTURES_TRADE",
    name: "FUTURES_TRADE",
    title: "Futures Trade Commission",
    description: "Commission on futures trades executed by referred users",
    reward: 0.1,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
  {
    type: "FUTURES_TRADE",
    name: "FUTURES_PROFIT",
    title: "Futures Trading Profit Share",
    description: "Commission on futures trading profits by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },
  {
    type: "FUTURES_TRADE",
    name: "FUTURES_VOLUME",
    title: "Futures Volume Bonus",
    description: "Bonus for high futures trading volume by referred users",
    reward: 50,
    rewardType: "FIXED",
    minAmount: 1000,
  },

  // ===== TOKEN PURCHASE CONDITIONS =====
  {
    type: "TOKEN_PURCHASE",
    name: "TOKEN_PURCHASE",
    title: "Token Purchase Commission",
    description: "Commission on token purchases made by referred users",
    reward: 5,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
  {
    type: "TOKEN_PURCHASE",
    name: "TOKEN_SALE",
    title: "Token Sale Commission",
    description: "Commission on token sales completed by referred users",
    reward: 3,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Dynamic import for ES Module
    const { v4: uuidv4 } = await import("uuid");

    // Check if minAmount column exists and get allowed ENUM values
    let hasMinAmount = false;
    let hasStatus = false;
    let allowedTypes = new Set();
    try {
      const tableInfo = await queryInterface.describeTable('mlm_referral_condition');
      hasMinAmount = !!tableInfo.minAmount;
      hasStatus = !!tableInfo.status;

      // Extract allowed ENUM values from database
      if (tableInfo.type && tableInfo.type.type) {
        const enumMatch = tableInfo.type.type.match(/ENUM\((.*)\)/);
        if (enumMatch) {
          const enumValues = enumMatch[1].split(',').map(v => v.replace(/'/g, '').trim());
          allowedTypes = new Set(enumValues);
          console.log(`Database allows these types: ${Array.from(allowedTypes).join(', ')}`);
        }
      }
    } catch (error) {
      console.log('Could not check table structure:', error.message);
    }

    const existingConditions = await queryInterface.sequelize.query(
      `SELECT name FROM mlm_referral_condition;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingConditionNames = new Set(
      existingConditions.map((cond) => cond.name)
    );

    const newConditions = predefinedConditions
      .filter((cond) => {
        // Skip if already exists
        if (existingConditionNames.has(cond.name)) return false;

        // Skip if type is not allowed in database
        if (allowedTypes.size > 0 && !allowedTypes.has(cond.type)) {
          console.log(`Skipping condition "${cond.name}" - type "${cond.type}" not in database ENUM`);
          return false;
        }

        return true;
      })
      .map((cond) => {
        const condition = {
          id: uuidv4(),
          type: cond.type,
          title: cond.title,
          name: cond.name,
          description: cond.description,
          reward: cond.reward,
          rewardType: cond.rewardType,
          rewardWalletType: "FIAT",
          rewardCurrency: "USD",
          rewardChain: null,
        };

        // Only add minAmount if column exists
        if (hasMinAmount) {
          condition.minAmount = cond.minAmount || 0;
        }

        // Only add status if column exists
        if (hasStatus) {
          condition.status = true;
        }

        return condition;
      });

    if (newConditions.length > 0) {
      console.log(`Inserting ${newConditions.length} new conditions`);
      await queryInterface.bulkInsert("mlm_referral_condition", newConditions);
      console.log(`✓ Successfully inserted ${newConditions.length} conditions`);
    } else {
      console.log('No new conditions to insert');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("mlm_referral_condition", null, {});
  },
};
