"use strict";
const { v4: uuidv4 } = require("uuid");

const predefinedConditions = [
  {
    type: "DEPOSIT",
    name: "WELCOME_BONUS",
    title: "Welcome Deposit Bonus",
    description: "A welcome bonus for the first deposit of at least 100 USDT",
    reward: 10,
    rewardType: "PERCENTAGE",
  },
  {
    type: "TRADE",
    name: "MONTHLY_TRADE_VOLUME",
    title: "Monthly Trade Volume Bonus",
    description:
      "A reward for users who trade more than 1,000 USDT in a month.",
    reward: 50,
    rewardType: "FIXED",
  },
  {
    type: "TRADE",
    name: "TRADE_COMMISSION",
    title: "Trade Commission Reward",
    description: "A commission for the broker on every trade executed.",
    reward: 0.1,
    rewardType: "PERCENTAGE",
  },
  {
    type: "INVESTMENT",
    name: "INVESTMENT",
    title: "Investment Bonus",
    description: "A bonus for investing in the company.",
    reward: 5,
    rewardType: "PERCENTAGE",
  },
  {
    type: "AI_INVESTMENT",
    name: "AI_INVESTMENT",
    title: "AI Managed Portfolio Bonus",
    description: "Bonus for investing in AI managed portfolios.",
    reward: 2,
    rewardType: "PERCENTAGE",
  },
  {
    type: "FOREX_INVESTMENT",
    name: "FOREX_INVESTMENT",
    title: "Forex Investment Bonus",
    description: "Bonus for investing in Forex.",
    reward: 100,
    rewardType: "FIXED",
  },
  {
    type: "ICO_CONTRIBUTION",
    name: "ICO_CONTRIBUTION",
    title: "ICO Participation Bonus",
    description:
      "A special bonus for contributing to an Initial Coin Offering.",
    reward: 15,
    rewardType: "PERCENTAGE",
  },
  {
    type: "STAKING",
    name: "STAKING_LOYALTY",
    title: "Staking Loyalty Bonus",
    description:
      "A loyalty bonus for users who stake their coins for a certain period.",
    reward: 3,
    rewardType: "PERCENTAGE",
  },
  {
    type: "ECOMMERCE_PURCHASE",
    name: "ECOMMERCE_PURCHASE",
    title: "Ecommerce Shopping Reward",
    description:
      "Cashback reward for purchases made on the ecommerce platform.",
    reward: 5,
    rewardType: "PERCENTAGE",
  },
  {
    type: "P2P_TRADE",
    name: "P2P_TRADE",
    title: "P2P Trading Reward",
    description: "A reward for trading on the P2P platform.",
    reward: 1,
    rewardType: "PERCENTAGE",
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existingConditions = await queryInterface.sequelize.query(
      `SELECT name FROM mlm_referral_condition;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingConditionNames = new Set(
      existingConditions.map((cond) => cond.name)
    );

    const newConditions = predefinedConditions
      .filter((cond) => !existingConditionNames.has(cond.name))
      .map((cond) => ({
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
      }));

    if (newConditions.length > 0) {
      await queryInterface.bulkInsert("mlm_referral_condition", newConditions);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("mlm_referral_condition", null, {});
  },
};
