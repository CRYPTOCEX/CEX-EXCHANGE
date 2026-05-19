"use strict";

const { v4: uuidv4 } = require("uuid");

// Default user tiers with good defaults
// These tiers apply to each engine and provide progressive win rate bonuses
const defaultTiers = [
  {
    tierName: "BRONZE",
    tierOrder: 1,
    minVolume: 0,
    minDeposit: 0,
    winRateBonus: 0,
    description: "Entry level tier - No minimum requirements",
    isActive: true,
  },
  {
    tierName: "SILVER",
    tierOrder: 2,
    minVolume: 5000,
    minDeposit: 500,
    winRateBonus: 0.01, // +1% win rate
    description: "Silver tier - $5,000 volume or $500 deposit",
    isActive: true,
  },
  {
    tierName: "GOLD",
    tierOrder: 3,
    minVolume: 25000,
    minDeposit: 2500,
    winRateBonus: 0.02, // +2% win rate
    description: "Gold tier - $25,000 volume or $2,500 deposit",
    isActive: true,
  },
  {
    tierName: "PLATINUM",
    tierOrder: 4,
    minVolume: 100000,
    minDeposit: 10000,
    winRateBonus: 0.03, // +3% win rate
    description: "Platinum tier - $100,000 volume or $10,000 deposit",
    isActive: true,
  },
  {
    tierName: "DIAMOND",
    tierOrder: 5,
    minVolume: 500000,
    minDeposit: 50000,
    winRateBonus: 0.05, // +5% win rate
    description: "Diamond tier - $500,000 volume or $50,000 deposit",
    isActive: true,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if binary_ai_engine table exists
      const tableExists = await queryInterface.sequelize
        .query(
          `SELECT COUNT(*) as count FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name = 'binary_ai_engine'`,
          { type: queryInterface.sequelize.QueryTypes.SELECT }
        )
        .then((result) => result[0].count > 0);

      if (!tableExists) {
        console.log(
          "binary_ai_engine table does not exist yet, skipping user tiers seeder"
        );
        return;
      }

      // Get all existing engines
      const engines = await queryInterface.sequelize.query(
        "SELECT id FROM binary_ai_engine",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (engines.length === 0) {
        console.log("No engines found, skipping user tiers seeder");
        return;
      }

      // Get existing tiers to avoid duplicates
      const existingTiers = await queryInterface.sequelize.query(
        "SELECT engineId, tierName FROM binary_ai_engine_user_tier",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      // Create a set of existing engine-tier combinations
      const existingCombinations = new Set(
        existingTiers.map((t) => `${t.engineId}-${t.tierName}`)
      );

      // Create tiers for each engine
      const tiersToInsert = [];
      const now = new Date();

      for (const engine of engines) {
        for (const tier of defaultTiers) {
          const combination = `${engine.id}-${tier.tierName}`;
          if (!existingCombinations.has(combination)) {
            tiersToInsert.push({
              id: uuidv4(),
              engineId: engine.id,
              ...tier,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      if (tiersToInsert.length > 0) {
        await queryInterface.bulkInsert(
          "binary_ai_engine_user_tier",
          tiersToInsert
        );
        console.log(
          `Inserted ${tiersToInsert.length} user tiers for ${engines.length} engines`
        );
      } else {
        console.log("All tiers already exist, nothing to insert");
      }
    } catch (error) {
      console.error("User tiers seeder error:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Only delete the default tiers (by name) to preserve any custom tiers
    await queryInterface.bulkDelete("binary_ai_engine_user_tier", {
      tierName: defaultTiers.map((t) => t.tierName),
    });
  },
};
