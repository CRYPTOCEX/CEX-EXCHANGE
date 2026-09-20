"use strict";
const { v4: uuidv4 } = require("uuid");

const tokens = require("./tokenlist.json");
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    // TRON has no custodial wallets and no EVM permit: TRC20 tokens are received
    // at the user's OWN TRON address (per-address). So any non-native TRON token
    // must be PERMIT (per-address) — NOT NO_PERMIT, which would make the deposit
    // flow ask for a (nonexistent) custodial wallet. Native TRX stays NATIVE.
    const resolveContractType = (chain, token) => {
      const ct = token.contractType || "NO_PERMIT";
      if (chain === "TRON" && ct !== "NATIVE") return "PERMIT";
      return ct;
    };

    const tokenRecords = [];
    Object.keys(tokens).forEach((chain) => {
      tokens[chain].forEach((token) => {
        tokenRecords.push({
          id: uuidv4(),
          name: token.name,
          currency: token.symbol,
          chain,
          network: token.network || "mainnet",
          type: token.type,
          contract: token.address,
          decimals: token.decimals,
          icon: token.logoURI,
          contractType: resolveContractType(chain, token),
          status: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    // The unique DB index is `ecosystemTokenContractChainKey` on (contract, chain),
    // so dedup MUST use that same key — not (name, currency, chain). On a core
    // update, token metadata drifts (a contract keeps its address but gets a new
    // name/symbol in tokenlist.json); keying on name/currency would let that row
    // slip past this filter and then violate the (contract, chain) unique index on
    // bulkInsert, which Sequelize reports as a generic "Validation error".
    // MySQL string indexes are case-insensitive, so normalise the key to lowercase.
    const dedupKey = (contract, chain) =>
      `${String(contract).toLowerCase()}-${String(chain).toLowerCase()}`;

    // Fetch existing records to prevent duplicates
    const existingTokens = await queryInterface.sequelize.query(
      "SELECT contract, chain FROM ecosystem_token",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const existingTokenSet = new Set(
      existingTokens.map(({ contract, chain }) => dedupKey(contract, chain))
    );

    // Filter out tokens that already exist, while also dropping any (contract,
    // chain) duplicates within the seed file itself (guards future tokenlists).
    const seenInFile = new Set();
    const newTokenRecords = tokenRecords.filter(({ contract, chain }) => {
      const key = dedupKey(contract, chain);
      if (existingTokenSet.has(key) || seenInFile.has(key)) return false;
      seenInFile.add(key);
      return true;
    });

    // Only proceed with insertion if there are new unique tokens.
    // ignoreDuplicates is a final safety net so the seed stays idempotent even if
    // a (contract, chain) still collides (e.g. collation edge cases).
    if (newTokenRecords.length > 0) {
      await queryInterface.bulkInsert("ecosystem_token", newTokenRecords, {
        ignoreDuplicates: true,
      });
    }

    // Repair already-seeded TRON TRC20 tokens that were stored as a custodial
    // type (e.g. NO_PERMIT). TRON cannot have custodial wallets, so they must be
    // PERMIT (per-address). Idempotent: NATIVE/PERMIT rows are left untouched.
    await queryInterface.sequelize.query(
      "UPDATE ecosystem_token SET contractType = 'PERMIT', updatedAt = NOW() WHERE chain = 'TRON' AND contractType NOT IN ('NATIVE', 'PERMIT')"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ecosystem_token", null, {});
  },
};
