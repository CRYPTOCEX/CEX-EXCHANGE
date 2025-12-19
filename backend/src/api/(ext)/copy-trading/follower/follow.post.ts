/**
 * Follow a leader with multi-market allocation
 *
 * ALLOCATION SYSTEM:
 * - Followers allocate funds per market (not per subscription)
 * - Each market has separate base and quote currency allocations
 * - Leaders set per-market minimums (minBase, minQuote) for each trading pair
 * - Validation: Per-market allocation >= leader market minBase/minQuote
 */
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  checkFollowEligibility,
  createCopyTradingTransaction,
  createAuditLog,
  updateLeaderStats,
  notifyFollowerSubscriptionEvent,
  notifyLeaderNewFollower,
} from "@b/api/(ext)/copy-trading/utils";
import {
  validateFollowRequest,
  throwValidationError,
  checkMarketConflict,
} from "@b/api/(ext)/copy-trading/utils/security";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";

export const metadata = {
  summary: "Follow a Copy Trading Leader",
  description:
    "Subscribe to a leader with per-market liquidity allocation for both base and quote currencies.",
  operationId: "followCopyTradingLeader",
  tags: ["Copy Trading", "Followers"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Follow trader",
  middleware: ["copyTradingFollow"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            leaderId: {
              type: "string",
              format: "uuid",
              description: "ID of the leader to follow",
            },
            allocations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symbol: {
                    type: "string",
                    description: "Market symbol (e.g., BTC/USDT)",
                  },
                  baseAmount: {
                    type: "number",
                    minimum: 0,
                    description:
                      "Amount of base currency to allocate (for SELL orders)",
                  },
                  quoteAmount: {
                    type: "number",
                    minimum: 0,
                    description:
                      "Amount of quote currency to allocate (for BUY orders)",
                  },
                },
                required: ["symbol"],
              },
              description:
                "Per-market allocation with base and quote currency amounts",
            },
            copyMode: {
              type: "string",
              enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
              default: "PROPORTIONAL",
              description: "How to calculate copy trade amounts",
            },
            fixedAmount: {
              type: "number",
              description: "Fixed amount for FIXED_AMOUNT mode",
            },
            fixedRatio: {
              type: "number",
              description: "Fixed ratio for FIXED_RATIO mode",
            },
            maxDailyLoss: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Maximum daily loss percentage",
            },
            maxPositionSize: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Maximum position size percentage",
            },
            stopLossPercent: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Stop loss percentage",
            },
            takeProfitPercent: {
              type: "number",
              minimum: 0,
              maximum: 1000,
              description: "Take profit percentage",
            },
          },
          required: ["leaderId", "allocations"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully followed the leader",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              subscription: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    429: { description: "Too Many Requests" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating request");
  // Validate and sanitize input
  const validation = validateFollowRequest(body);
  if (!validation.valid) {
    throwValidationError(validation);
  }

  const {
    leaderId,
    copyMode,
    fixedAmount,
    fixedRatio,
    maxDailyLoss,
    maxPositionSize,
    stopLossPercent,
    takeProfitPercent,
  } = validation.sanitized;

  // Get allocations from body (not sanitized by security util)
  const { allocations } = body;

  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    throw createError({
      statusCode: 400,
      message: "At least one market allocation is required",
    });
  }

  ctx?.step("Validating leader and markets");
  // Fetch leader with their declared markets
  const leader = await models.copyTradingLeader.findOne({
    where: { id: leaderId, status: "ACTIVE" },
    include: [
      {
        model: models.copyTradingLeaderMarket,
        as: "markets",
        where: { isActive: true },
        required: false,
      },
    ],
  });

  if (!leader) {
    throw createError({
      statusCode: 404,
      message: "Leader not found or not active",
    });
  }

  // Prevent self-following
  if ((leader as any).userId === user.id) {
    throw createError({
      statusCode: 400,
      message: "You cannot follow yourself",
    });
  }

  ctx?.step("Checking for market conflicts");
  // Check if user already has active allocations on these markets from another leader
  const conflictCheck = await checkMarketConflict(
    user.id,
    leaderId,
    allocations.map((a) => a.symbol)
  );

  if (conflictCheck.hasConflict) {
    const details = conflictCheck.conflictDetails[0];
    throw createError({
      statusCode: 400,
      message: `You already have active allocations on ${details.markets.join(", ")} from leader "${details.leaderName}". You cannot follow multiple leaders on the same market.`,
    });
  }

  const leaderMarkets = (leader as any).markets || [];
  const leaderMarketMap = new Map<string, any>();
  for (const m of leaderMarkets) {
    leaderMarketMap.set(m.symbol, m);
  }

  // Validate all allocations are for leader's declared markets
  for (const alloc of allocations) {
    const leaderMarket = leaderMarketMap.get(alloc.symbol);
    if (!leaderMarket) {
      throw createError({
        statusCode: 400,
        message: `Market ${alloc.symbol} is not traded by this leader`,
      });
    }
    if (
      (!alloc.baseAmount || alloc.baseAmount <= 0) &&
      (!alloc.quoteAmount || alloc.quoteAmount <= 0)
    ) {
      throw createError({
        statusCode: 400,
        message: `At least one of baseAmount or quoteAmount must be greater than 0 for ${alloc.symbol}`,
      });
    }

    // Validate minimum allocation requirements set by the leader
    const minBase = leaderMarket.minBase || 0;
    const minQuote = leaderMarket.minQuote || 0;

    if (minBase > 0 && alloc.baseAmount > 0 && alloc.baseAmount < minBase) {
      const [baseCurrency] = alloc.symbol.split("/");
      throw createError({
        statusCode: 400,
        message: `${alloc.symbol}: Minimum ${baseCurrency} allocation is ${minBase}`,
      });
    }

    if (minQuote > 0 && alloc.quoteAmount > 0 && alloc.quoteAmount < minQuote) {
      const [, quoteCurrency] = alloc.symbol.split("/");
      throw createError({
        statusCode: 400,
        message: `${alloc.symbol}: Minimum ${quoteCurrency} allocation is ${minQuote}`,
      });
    }
  }

  ctx?.step("Checking eligibility");
  // Check basic eligibility (not amount-based, just follower limits etc.)
  const eligibility = await checkFollowEligibility(user.id, leaderId, 0);
  if (!eligibility.eligible) {
    throw createError({
      statusCode: 400,
      message: eligibility.reason || "Eligibility check failed",
    });
  }

  ctx?.step("Validating ECO wallet balances");
  // Collect all unique currencies needed and validate ECO wallet balances
  const currencyAmounts = new Map<string, number>();
  for (const alloc of allocations) {
    const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
    if (alloc.baseAmount && alloc.baseAmount > 0) {
      currencyAmounts.set(
        baseCurrency,
        (currencyAmounts.get(baseCurrency) || 0) + alloc.baseAmount
      );
    }
    if (alloc.quoteAmount && alloc.quoteAmount > 0) {
      currencyAmounts.set(
        quoteCurrency,
        (currencyAmounts.get(quoteCurrency) || 0) + alloc.quoteAmount
      );
    }
  }

  // Validate all ECO wallet balances upfront
  const ecoWallets = new Map<string, { wallet: any; balance: number }>();
  for (const [currency, requiredAmount] of currencyAmounts) {
    const ecoWallet = await getWalletByUserIdAndCurrency(
      user.id,
      currency,
      "ECO"
    );
    if (!ecoWallet) {
      throw createError({
        statusCode: 400,
        message: `ECO wallet not found for ${currency}`,
      });
    }
    const balance = parseFloat(ecoWallet.balance?.toString() || "0");
    if (balance < requiredAmount) {
      throw createError({
        statusCode: 400,
        message: `Insufficient ${currency} balance in ECO wallet. Required: ${requiredAmount.toFixed(8)}, Available: ${balance.toFixed(8)}`,
      });
    }
    ecoWallets.set(currency, { wallet: ecoWallet, balance });
  }

  ctx?.step("Creating subscription");
  const t = await sequelize.transaction();

  try {
    // Create follower record
    const follower = await models.copyTradingFollower.create(
      {
        userId: user.id,
        leaderId,
        copyMode: copyMode || "PROPORTIONAL",
        fixedAmount: copyMode === "FIXED_AMOUNT" ? fixedAmount : null,
        fixedRatio: copyMode === "FIXED_RATIO" ? fixedRatio : null,
        maxDailyLoss,
        maxPositionSize,
        stopLossPercent,
        takeProfitPercent,
        status: "ACTIVE",
      },
      { transaction: t }
    );

    // Process each allocation - Transfer funds from ECO to CT wallet
    for (const alloc of allocations) {
      const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");

      // Transfer base currency if allocated
      if (alloc.baseAmount && alloc.baseAmount > 0) {
        const { wallet: ecoWallet, balance: ecoBalance } =
          ecoWallets.get(baseCurrency)!;

        // Get or create CT wallet
        let ctWallet = await getWalletByUserIdAndCurrency(
          user.id,
          baseCurrency,
          "COPY_TRADING"
        );
        if (!ctWallet) {
          ctWallet = await models.wallet.create(
            {
              userId: user.id,
              currency: baseCurrency,
              type: "COPY_TRADING",
              balance: 0,
              inOrder: 0,
            },
            { transaction: t }
          );
        }

        const ecoBalanceNum = parseFloat(ecoWallet.balance.toString());
        const ctBalanceNum = parseFloat(ctWallet.balance.toString());

        // Deduct from ECO wallet
        const newEcoBalance = ecoBalanceNum - alloc.baseAmount;
        await models.wallet.update(
          { balance: newEcoBalance },
          { where: { id: ecoWallet.id }, transaction: t }
        );

        // Add to CT wallet
        const newCtBalance = ctBalanceNum + alloc.baseAmount;
        await models.wallet.update(
          { balance: newCtBalance },
          { where: { id: ctWallet.id }, transaction: t }
        );

        // Create transaction records for both wallets
        await createCopyTradingTransaction(
          {
            userId: user.id,
            leaderId,
            followerId: (follower as any).id,
            type: "ALLOCATION",
            amount: -alloc.baseAmount, // Negative for deduction
            currency: baseCurrency,
            balanceBefore: ecoBalance,
            balanceAfter: newEcoBalance,
            description: `Transfer ${alloc.baseAmount} ${baseCurrency} from ECO to CT wallet for ${alloc.symbol}`,
          },
          t
        );

        await createCopyTradingTransaction(
          {
            userId: user.id,
            leaderId,
            followerId: (follower as any).id,
            type: "ALLOCATION",
            amount: alloc.baseAmount, // Positive for addition
            currency: baseCurrency,
            balanceBefore: ctBalanceNum,
            balanceAfter: newCtBalance,
            description: `Received ${alloc.baseAmount} ${baseCurrency} in CT wallet for ${alloc.symbol}`,
          },
          t
        );

        // Update ECO wallet tracking
        ecoWallets.set(baseCurrency, {
          wallet: ecoWallet,
          balance: newEcoBalance,
        });
      }

      // Transfer quote currency if allocated
      if (alloc.quoteAmount && alloc.quoteAmount > 0) {
        const { wallet: ecoWallet, balance: ecoBalance } =
          ecoWallets.get(quoteCurrency)!;

        // Get or create CT wallet
        let ctWallet = await getWalletByUserIdAndCurrency(
          user.id,
          quoteCurrency,
          "COPY_TRADING"
        );
        if (!ctWallet) {
          ctWallet = await models.wallet.create(
            {
              userId: user.id,
              currency: quoteCurrency,
              type: "COPY_TRADING",
              balance: 0,
              inOrder: 0,
            },
            { transaction: t }
          );
        }

        const ecoBalanceNum = parseFloat(ecoWallet.balance.toString());
        const ctBalanceNum = parseFloat(ctWallet.balance.toString());

        // Deduct from ECO wallet
        const newEcoBalance = ecoBalanceNum - alloc.quoteAmount;
        await models.wallet.update(
          { balance: newEcoBalance },
          { where: { id: ecoWallet.id }, transaction: t }
        );

        // Add to CT wallet
        const newCtBalance = ctBalanceNum + alloc.quoteAmount;
        await models.wallet.update(
          { balance: newCtBalance },
          { where: { id: ctWallet.id }, transaction: t }
        );

        // Create transaction records for both wallets
        await createCopyTradingTransaction(
          {
            userId: user.id,
            leaderId,
            followerId: (follower as any).id,
            type: "ALLOCATION",
            amount: -alloc.quoteAmount, // Negative for deduction
            currency: quoteCurrency,
            balanceBefore: ecoBalance,
            balanceAfter: newEcoBalance,
            description: `Transfer ${alloc.quoteAmount} ${quoteCurrency} from ECO to CT wallet for ${alloc.symbol}`,
          },
          t
        );

        await createCopyTradingTransaction(
          {
            userId: user.id,
            leaderId,
            followerId: (follower as any).id,
            type: "ALLOCATION",
            amount: alloc.quoteAmount, // Positive for addition
            currency: quoteCurrency,
            balanceBefore: ctBalanceNum,
            balanceAfter: newCtBalance,
            description: `Received ${alloc.quoteAmount} ${quoteCurrency} in CT wallet for ${alloc.symbol}`,
          },
          t
        );

        // Update ECO wallet tracking
        ecoWallets.set(quoteCurrency, {
          wallet: ecoWallet,
          balance: newEcoBalance,
        });
      }

      // Create allocation record
      await models.copyTradingFollowerAllocation.create(
        {
          followerId: (follower as any).id,
          symbol: alloc.symbol,
          baseAmount: alloc.baseAmount || 0,
          baseUsedAmount: 0,
          quoteAmount: alloc.quoteAmount || 0,
          quoteUsedAmount: 0,
          isActive: true,
        },
        { transaction: t }
      );
    }

    // Note: totalFollowers is now calculated on-demand from copyTradingFollower table
    // No need to increment here - stats-calculator.ts handles this

    // Create audit log
    await createAuditLog(
      {
        entityType: "FOLLOWER",
        entityId: (follower as any).id,
        action: "FOLLOW",
        newValue: {
          ...follower.toJSON(),
          allocations: allocations,
        },
        userId: user.id,
      },
      t
    );

    await t.commit();

    ctx?.step("Updating leader stats");
    // Update leader stats (outside transaction)
    await updateLeaderStats(leaderId);

    ctx?.step("Fetching subscription details");
    // Fetch complete subscription with allocations
    const subscription = await models.copyTradingFollower.findByPk(
      (follower as any).id,
      {
        include: [
          {
            model: models.copyTradingLeader,
            as: "leader",
            include: [
              {
                model: models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "avatar"],
              },
              {
                model: models.copyTradingLeaderMarket,
                as: "markets",
                where: { isActive: true },
                required: false,
              },
            ],
          },
          {
            model: models.copyTradingFollowerAllocation,
            as: "allocations",
            where: { isActive: true },
            required: false,
          },
        ],
      }
    );

    // Notify follower about subscription start
    ctx?.step("Sending follower notification");
    const leaderUser = subscription?.leader?.user;
    const leaderName = leaderUser ? `${leaderUser.firstName} ${leaderUser.lastName}` : undefined;
    await notifyFollowerSubscriptionEvent(
      (follower as any).id,
      "STARTED",
      { leaderName },
      ctx
    );

    // Notify leader about new follower
    ctx?.step("Sending leader notification");
    await notifyLeaderNewFollower(leaderId, user.id, ctx);

    ctx?.success("Successfully followed leader");
    return {
      message: "Successfully subscribed to leader with multi-market allocation",
      subscription: subscription?.toJSON(),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
