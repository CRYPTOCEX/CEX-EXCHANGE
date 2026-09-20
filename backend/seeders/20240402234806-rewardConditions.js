"use strict";

// Exactly ONE condition ships ACTIVE per trigger.
//
// Every one of these used to seed ACTIVE, and several conditions share a
// trigger, so one piece of activity paid commission under all of them at once.
// A single deposit paid WELCOME_BONUS 10% + FIRST_DEPOSIT_BONUS 5% +
// DEPOSIT 2% = 17%, on a screen where the operator reads "10%". Fourteen of the
// fifteen trigger types were in that state.
//
// The overlap is wider than "same `type`", because utils/cron.ts maps several
// condition types onto the same transaction types — TRADE, SPOT_TRADE,
// COPY_TRADING and TOKEN_PURCHASE all resolve to EXCHANGE_ORDER — so conditions
// of *different* types can still collect on one fill.
//
// The one left ACTIVE per trigger is the base commission: the condition named
// after its own type. The rest are seeded `status: false` — present, documented
// and one switch away, so an operator who WANTS a stacked bonus programme can
// still build one deliberately instead of inheriting it by accident.
//
// EXCEPTION: NFT_PURCHASE and NFT_SALE both stay ACTIVE. They are a two-sided
// pair paying two DIFFERENT users (buyer and seller) for one trade, which is
// not double-payment. P2P_TRADE / P2P_TRADE_COMPLETION is the same shape.
//
// This affects NEW installs only — the insert below skips by `name`, so an
// existing install keeps whatever its operator has already chosen.
const predefinedConditions = [
  // ===== DEPOSIT CONDITIONS =====
  {
    type: "DEPOSIT",
    name: "WELCOME_BONUS",
    status: false,
    title: "Welcome Deposit Bonus",
    description: "A welcome bonus for the first deposit of at least 100 USDT",
    reward: 10,
    rewardType: "PERCENTAGE",
    minAmount: 100, // Requires USDT currency
  },
  {
    type: "DEPOSIT",
    name: "FIRST_DEPOSIT_BONUS",
    status: false,
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
    status: false,
    title: "Spot Trading Volume Bonus",
    description: "Bonus for referred users achieving high spot trading volume",
    reward: 25,
    rewardType: "FIXED",
    period: "MONTHLY",
    minAmount: 500,
  },

  // ===== GENERAL TRADING CONDITIONS =====
  {
    type: "TRADE",
    name: "MONTHLY_TRADE_VOLUME",
    status: false,
    title: "Monthly Trade Volume Bonus",
    description: "A reward for users who trade more than 1,000 USDT in a month",
    reward: 50,
    rewardType: "FIXED",
    period: "MONTHLY",
    minAmount: 1000, // Requires USDT currency
  },
  {
    type: "TRADE",
    name: "TRADE_COMMISSION",
    status: false,
    title: "Trade Commission Reward",
    description: "A commission for the broker on every trade executed",
    reward: 0.1,
    rewardType: "PERCENTAGE",
    minAmount: 1,
  },
  {
    type: "TRADE",
    name: "TRADE",
    status: false,
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
    status: false,
    title: "Binary Options Winning Trade Bonus",
    description: "A fixed bonus for winning binary options trades",
    reward: 50,
    rewardType: "FIXED",
    period: "MONTHLY",
    minAmount: 10,
  },
  {
    type: "BINARY_WIN",
    name: "BINARY_TRADE_VOLUME",
    status: false,
    title: "Binary Options Monthly Volume",
    description: "Bonus for achieving high binary trading volume in a month",
    reward: 100,
    rewardType: "FIXED",
    period: "MONTHLY",
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
    status: false,
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
    status: false,
    title: "AI Investment Profit Share",
    description: "Commission on AI investment profits earned by referred users",
    reward: 1,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },

  // ===== FOREX INVESTMENT CONDITIONS =====
  // THIS SEEDED A 100% PAYOUT, ACTIVE, ON EVERY NEW INSTALL.
  //
  // `reward: 100` with `rewardType: "FIXED"` and `minAmount: 100` means: a
  // referred user invests the 100 minimum, and the operator pays their referrer
  // 100 — the entire qualifying investment, out of the operator's own balance
  // sheet, on every referred forex investment, without anybody opting in.
  //
  // It is the only FIXED reward in this file. Every other condition that ships
  // active is a small percentage (0.1 to 15), including this one's own sibling
  // FOREX_PROFIT at 2%. The shape of the mistake is a `minAmount` copied into
  // `reward` with the type left wrong.
  //
  // Repaired to a percentage in line with INVESTMENT, the general
  // investment-plan condition and the closest analogue this product has. The
  // qualifying threshold is left at the 100 the author chose. THE RATE IS A
  // COMMERCIAL DECISION — change it in Admin → Affiliate → Conditions.
  //
  // The insert below skips by `name`, so this repairs NEW installs only. Any
  // install seeded before this change still has the 100 FIXED row in its
  // database and needs it corrected by hand.
  {
    type: "FOREX_INVESTMENT",
    name: "FOREX_INVESTMENT",
    title: "Forex Investment Bonus",
    description: "Bonus for investing in Forex",
    reward: 5,
    rewardType: "PERCENTAGE",
    minAmount: 100,
  },
  {
    type: "FOREX_INVESTMENT",
    name: "FOREX_PROFIT",
    status: false,
    title: "Forex Profit Commission",
    description: "Commission on Forex investment profits by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },

  // ===== FOREX TRADING (IB / PARTNER REBATE) CONDITIONS =====
  // Native `forex_trading` dealing desk — distinct from the legacy FOREX_*
  // investment-plan conditions above. Seeded DISABLED: enabling a payout by
  // default on upgrade would start paying real money without the operator
  // ever opting in. Turn on in Admin -> Affiliate -> Conditions.
  {
    type: "FOREX_TRADING",
    name: "FX_TRADE_COMMISSION",
    title: "Forex IB Commission Share",
    description:
      "Partner share of the commission a referred user pays on each forex trade (LIVE accounts only)",
    reward: 20,
    rewardType: "PERCENTAGE",
    minAmount: 0,
    status: false,
  },
  {
    type: "FOREX_TRADING",
    name: "FX_TRADE_VOLUME",
    title: "Forex IB Volume Rebate",
    description:
      "Per-lot partner rebate on referred forex volume. PERCENTAGE reward R pays lots x R/100, so R=100 is 1.00 per lot (LIVE accounts only)",
    reward: 100,
    rewardType: "PERCENTAGE",
    minAmount: 0,
    status: false,
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
    status: false,
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
    status: false,
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
    status: false,
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
    status: false,
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
    status: false,
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
    status: false,
    title: "Futures Trading Profit Share",
    description: "Commission on futures trading profits by referred users",
    reward: 2,
    rewardType: "PERCENTAGE",
    minAmount: 5,
  },
  {
    type: "FUTURES_TRADE",
    name: "FUTURES_VOLUME",
    status: false,
    title: "Futures Volume Bonus",
    description: "Bonus for high futures trading volume by referred users",
    reward: 50,
    rewardType: "FIXED",
    period: "MONTHLY",
    minAmount: 1000,
  },

  // ===== TOKEN PURCHASE CONDITIONS =====
  {
    type: "TOKEN_PURCHASE",
    name: "TOKEN_PURCHASE",
    // Cron-driven, and TOKEN_PURCHASE resolves to the EXCHANGE_ORDER
    // transaction type — the same one SPOT_TRADE collects on. Leaving both
    // active meant one spot fill paid TRADE 0.05% + SPOT_TRADE 0.1% +
    // TOKEN_PURCHASE 5% = 5.15%, which is the cross-type version of exactly the
    // overlap this file exists to prevent. SPOT_TRADE is the single active
    // EXCHANGE_ORDER earner. COPY_TRADING also maps there but is EVENT-driven,
    // so the cron skips it and it cannot stack on a fill.
    status: false,
    title: "Token Purchase Commission",
    description: "Commission on token purchases made by referred users",
    reward: 5,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
  {
    type: "TOKEN_PURCHASE",
    name: "TOKEN_SALE",
    status: false,
    title: "Token Sale Commission",
    description: "Commission on token sales completed by referred users",
    reward: 3,
    rewardType: "PERCENTAGE",
    minAmount: 10,
  },
];

// Which ledger transaction types a condition TYPE is evaluated against.
//
// A seeder is plain JS run by sequelize-cli and cannot import the TypeScript
// engine, so this is a deliberate second copy of CONDITION_TYPE_TO_TX_TYPES in
// backend/src/api/(ext)/admin/affiliate/condition/overlap.ts. Keep the two in
// step: it is used only to PRINT a warning, never to decide a payout, so a
// drifted copy costs an inaccurate upgrade notice rather than money.
const CONDITION_TYPE_TO_TX_TYPES = {
  DEPOSIT: ["DEPOSIT"],
  TRADE: ["EXCHANGE_ORDER"],
  SPOT_TRADE: ["EXCHANGE_ORDER"],
  BINARY_WIN: ["BINARY_ORDER"],
  INVESTMENT: ["INVESTMENT", "INVESTMENT_ROI"],
  AI_INVESTMENT: ["AI_INVESTMENT", "AI_INVESTMENT_ROI"],
  FOREX_INVESTMENT: ["FOREX_INVESTMENT", "FOREX_INVESTMENT_ROI"],
  FOREX_TRADING: [],
  ICO_CONTRIBUTION: ["ICO_CONTRIBUTION"],
  STAKING: ["STAKING", "STAKING_REWARD"],
  ECOMMERCE_PURCHASE: ["ECOMMERCE_PURCHASE"],
  P2P_TRADE: ["P2P_TRADE"],
  NFT_TRADE: ["NFT_PURCHASE", "NFT_SALE"],
  COPY_TRADING: ["EXCHANGE_ORDER"],
  FUTURES_TRADE: ["FUTURES_ORDER"],
  TOKEN_PURCHASE: ["EXCHANGE_ORDER"],
};

/** Pairs that fire on one event but are not double payment. */
const TWO_SIDED_PAIRS = [
  ["NFT_PURCHASE", "NFT_SALE"],
  ["P2P_TRADE", "P2P_TRADE_COMPLETION"],
  ["FX_TRADE_COMMISSION", "FX_TRADE_VOLUME"],
];

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const EXEMPT_PAIRS = new Set(TWO_SIDED_PAIRS.map(([a, b]) => pairKey(a, b)));

function overlaps(a, b) {
  if (EXEMPT_PAIRS.has(pairKey(a.name, b.name))) return false;
  if (a.type === b.type) return true;
  const mine = CONDITION_TYPE_TO_TX_TYPES[a.type] || [];
  const theirs = CONDITION_TYPE_TO_TX_TYPES[b.type] || [];
  return mine.some((t) => theirs.includes(t));
}

/**
 * Read-only upgrade audit.
 *
 * The insert above skips by `name`, so an EXISTING install keeps whatever its
 * operator already chose — including the historical default where every seeded
 * condition shipped ACTIVE. In that configuration one deposit paid
 * WELCOME_BONUS + FIRST_DEPOSIT_BONUS + DEPOSIT, and nothing anywhere said so.
 * This changes nothing; it prints exactly what the conditions screen now shows,
 * so the upgrade is not silent about an economics decision the operator never
 * knowingly made.
 */
async function auditActiveOverlap(queryInterface) {
  let rows;
  try {
    rows = await queryInterface.sequelize.query(
      "SELECT name, title, type, reward, rewardType FROM mlm_referral_condition WHERE status = 1;",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
  } catch (error) {
    // An install too old to have `status` cannot be audited; that is not a
    // reason to fail the seeder.
    console.log(`Skipping the overlap audit: ${error.message}`);
    return;
  }
  if (!rows || rows.length < 2) return;

  // Connected components over the "can both collect on one event" relation.
  // Grouping by `type` would miss the widest case: TRADE, SPOT_TRADE,
  // COPY_TRADING and TOKEN_PURCHASE are four different types that all resolve
  // to EXCHANGE_ORDER, so all four can pay on a single spot fill.
  const group = new Map(rows.map((r) => [r.name, r.name]));
  const find = (name) => {
    let root = name;
    while (group.get(root) !== root) root = group.get(root);
    return root;
  };
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (!overlaps(rows[i], rows[j])) continue;
      const a = find(rows[i].name);
      const b = find(rows[j].name);
      if (a !== b) group.set(b, a);
    }
  }

  const members = new Map();
  for (const row of rows) {
    const root = find(row.name);
    const list = members.get(root) || [];
    list.push(row);
    members.set(root, list);
  }

  for (const list of members.values()) {
    if (list.length < 2) continue;
    const rate = list
      .filter((r) => r.rewardType === "PERCENTAGE")
      .reduce((sum, r) => sum + Number(r.reward || 0), 0);
    const combined = rate > 0 ? ` — combined ${Math.round(rate * 1e6) / 1e6}%` : "";
    console.warn(
      `⚠ ${list.length} ACTIVE affiliate conditions pay on the same activity${combined}: ` +
        list
          .map(
            (r) =>
              `${r.name} (${r.rewardType === "PERCENTAGE" ? `${r.reward}%` : r.reward})`
          )
          .join(", ") +
        ". Review them in Admin → Affiliate → Conditions."
    );
  }
}

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
          // Pay in the unit the platform actually trades in.
          //
          // Every condition used to seed FIAT/USD while all activity on a
          // Bicrypto install is denominated in USDT (every market is */USDT,
          // deposits land in SPOT/ECO USDT wallets). The evaluator restricted
          // qualifying volume to the reward currency, so a USD condition summed
          // USD activity — of which there is none — and no condition could ever
          // pay. It also meant the reward landed in a FIAT USD wallet the user
          // has no way to withdraw from unless a fiat gateway is configured.
          //
          // Conversion in utils/cron.ts now makes a USD condition qualify on
          // USDT volume too, so this is no longer load-bearing for payment —
          // but the DEFAULT should still name the unit the operator is really
          // paying in. Existing installs are untouched (the insert above skips
          // by `name`); use scripts/affiliate-condition-currency.mjs to retarget
          // conditions that are still on the old FIAT/USD default.
          rewardWalletType: "SPOT",
          rewardCurrency: "USDT",
          rewardChain: null,
        };

        // Only add minAmount if column exists
        if (hasMinAmount) {
          condition.minAmount = cond.minAmount || 0;
        }

        // Only add status if column exists. Conditions that move real money
        // without an explicit operator decision opt out by declaring
        // `status: false` (see the FX IB rebates) — everything else keeps
        // the historical default of enabled-on-seed.
        if (hasStatus) {
          condition.status = cond.status !== undefined ? cond.status : true;
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

    await auditActiveOverlap(queryInterface);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("mlm_referral_condition", null, {});
  },
};
