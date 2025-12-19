/**
 * Create a new market allocation for a subscription
 *
 * Per-market allocation system:
 * - Validates against leader's per-market minimums (minBase, minQuote)
 * - Allocates base currency (for SELL orders) and quote currency (for BUY orders) separately
 * - Each market allocation is tracked independently in copyTradingFollowerAllocation table
 *
 * Validation:
 * - Market must be declared by the leader (in copyTradingLeaderMarket)
 * - If leader set minBase > 0, baseAmount must be >= minBase or 0
 * - If leader set minQuote > 0, quoteAmount must be >= minQuote or 0
 * - At least one of baseAmount or quoteAmount must be > 0
 */
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  createCopyTradingTransaction,
  createAuditLog,
} from "@b/api/(ext)/copy-trading/utils";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";
import { isValidUUID } from "@b/api/(ext)/copy-trading/utils/security";
import { literal } from "sequelize";

export const metadata = {
  summary: "Create Market Allocation",
  description:
    "Creates a new market allocation for a subscription. The market must be one of the leader's declared markets.",
  operationId: "createSubscriptionAllocation",
  tags: ["Copy Trading", "Followers", "Allocations"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Create allocation",
  middleware: ["copyTradingFunds"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Subscription (follower) ID",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Market symbol (e.g., BTC/USDT)",
            },
            baseAmount: {
              type: "number",
              minimum: 0,
              description: "Initial base currency amount for selling",
            },
            quoteAmount: {
              type: "number",
              minimum: 0,
              description: "Initial quote currency amount for buying",
            },
          },
          required: ["symbol"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Allocation created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              allocation: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Subscription not found" },
    429: { description: "Too Many Requests" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  const { id } = params;
  const { symbol, baseAmount = 0, quoteAmount = 0 } = body;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!isValidUUID(id)) {
    throw createError({ statusCode: 400, message: "Invalid subscription ID" });
  }

  if (!symbol || typeof symbol !== "string") {
    throw createError({ statusCode: 400, message: "Symbol is required" });
  }

  const parts = symbol.split("/");
  if (parts.length !== 2) {
    throw createError({
      statusCode: 400,
      message: "Invalid symbol format. Use BASE/QUOTE (e.g., BTC/USDT)",
    });
  }
  const [baseCurrency, quoteCurrency] = parts;

  ctx?.step("Fetching subscription");
  const subscription = await models.copyTradingFollower.findByPk(id);

  if (!subscription) {
    throw createError({ statusCode: 404, message: "Subscription not found" });
  }

  if (subscription.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  if (subscription.status === "STOPPED") {
    throw createError({
      statusCode: 400,
      message: "Cannot add allocations to a stopped subscription",
    });
  }

  ctx?.step("Verifying leader market");
  // Check if this market is one of the leader's declared markets
  const leaderMarket = await models.copyTradingLeaderMarket.findOne({
    where: {
      leaderId: subscription.leaderId,
      symbol,
      isActive: true,
    },
  });

  if (!leaderMarket) {
    throw createError({
      statusCode: 400,
      message: `Market ${symbol} is not available for this leader`,
    });
  }

  // Validate minimum allocation requirements set by the leader
  const minBase = (leaderMarket as any).minBase || 0;
  const minQuote = (leaderMarket as any).minQuote || 0;
  const baseAmt = Number(baseAmount) || 0;
  const quoteAmt = Number(quoteAmount) || 0;

  if (minBase > 0 && baseAmt > 0 && baseAmt < minBase) {
    throw createError({
      statusCode: 400,
      message: `${symbol}: Minimum ${baseCurrency} allocation is ${minBase}`,
    });
  }

  if (minQuote > 0 && quoteAmt > 0 && quoteAmt < minQuote) {
    throw createError({
      statusCode: 400,
      message: `${symbol}: Minimum ${quoteCurrency} allocation is ${minQuote}`,
    });
  }

  ctx?.step("Checking for existing allocation");
  // Check if allocation already exists
  const existingAllocation = await models.copyTradingFollowerAllocation.findOne(
    {
      where: { followerId: id, symbol },
    }
  );

  if (existingAllocation) {
    throw createError({
      statusCode: 400,
      message: `You already have an allocation for ${symbol}. Use add-funds to increase it.`,
    });
  }

  // Validate amounts (baseAmt and quoteAmt already defined above for min check)
  if (baseAmt < 0 || quoteAmt < 0) {
    throw createError({
      statusCode: 400,
      message: "Amounts cannot be negative",
    });
  }

  if (baseAmt === 0 && quoteAmt === 0) {
    throw createError({
      statusCode: 400,
      message: "At least one of baseAmount or quoteAmount must be greater than 0",
    });
  }

  ctx?.step("Creating allocation");
  let allocation: any;

  await sequelize.transaction(async (transaction) => {
    // Transfer base currency from ECO to CT wallet if provided
    if (baseAmt > 0) {
      // Get ECO wallet with lock inside transaction
      const baseEcoWallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: baseCurrency,
          type: "ECO",
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!baseEcoWallet) {
        throw createError({
          statusCode: 400,
          message: `ECO wallet not found for ${baseCurrency}`,
        });
      }

      const baseBalance = parseFloat(baseEcoWallet.balance?.toString() || "0");

      if (baseBalance < baseAmt) {
        throw createError({
          statusCode: 400,
          message: `Insufficient ${baseCurrency} balance. Available: ${baseBalance}`,
        });
      }

      // Get or create CT wallet
      let baseCtWallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: baseCurrency,
          type: "COPY_TRADING",
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!baseCtWallet) {
        baseCtWallet = await models.wallet.create(
          {
            userId: user.id,
            currency: baseCurrency,
            type: "COPY_TRADING",
            balance: 0,
            inOrder: 0,
          },
          { transaction }
        );
      }

      const baseCtBalance = parseFloat(baseCtWallet.balance.toString());

      // Transfer from ECO to CT wallet
      const newBaseEcoBalance = baseBalance - baseAmt;
      await models.wallet.update(
        { balance: newBaseEcoBalance },
        { where: { id: baseEcoWallet.id }, transaction }
      );

      const newBaseCtBalance = baseCtBalance + baseAmt;
      await models.wallet.update(
        { balance: newBaseCtBalance },
        { where: { id: baseCtWallet.id }, transaction }
      );

      // Create transaction records for both wallets
      await createCopyTradingTransaction(
        {
          userId: user.id,
          leaderId: subscription.leaderId,
          followerId: id,
          type: "ALLOCATION",
          amount: -baseAmt, // Negative for deduction
          currency: baseCurrency,
          balanceBefore: baseBalance,
          balanceAfter: newBaseEcoBalance,
          description: `Transfer ${baseAmt} ${baseCurrency} from ECO to CT wallet (allocate to ${symbol})`,
          metadata: JSON.stringify({
            symbol,
            currencyType: "BASE",
          }),
        },
        transaction
      );

      await createCopyTradingTransaction(
        {
          userId: user.id,
          leaderId: subscription.leaderId,
          followerId: id,
          type: "ALLOCATION",
          amount: baseAmt, // Positive for addition
          currency: baseCurrency,
          balanceBefore: baseCtBalance,
          balanceAfter: newBaseCtBalance,
          description: `Received ${baseAmt} ${baseCurrency} in CT wallet (allocate to ${symbol})`,
          metadata: JSON.stringify({
            symbol,
            currencyType: "BASE",
          }),
        },
        transaction
      );
    }

    // Transfer quote currency from ECO to CT wallet if provided
    if (quoteAmt > 0) {
      // Get ECO wallet with lock inside transaction
      const quoteEcoWallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: quoteCurrency,
          type: "ECO",
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!quoteEcoWallet) {
        throw createError({
          statusCode: 400,
          message: `ECO wallet not found for ${quoteCurrency}`,
        });
      }

      const quoteBalance = parseFloat(quoteEcoWallet.balance?.toString() || "0");

      if (quoteBalance < quoteAmt) {
        throw createError({
          statusCode: 400,
          message: `Insufficient ${quoteCurrency} balance. Available: ${quoteBalance}`,
        });
      }

      // Get or create CT wallet
      let quoteCtWallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: quoteCurrency,
          type: "COPY_TRADING",
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!quoteCtWallet) {
        quoteCtWallet = await models.wallet.create(
          {
            userId: user.id,
            currency: quoteCurrency,
            type: "COPY_TRADING",
            balance: 0,
            inOrder: 0,
          },
          { transaction }
        );
      }

      const quoteCtBalance = parseFloat(quoteCtWallet.balance.toString());

      // Transfer from ECO to CT wallet
      const newQuoteEcoBalance = quoteBalance - quoteAmt;
      await models.wallet.update(
        { balance: newQuoteEcoBalance },
        { where: { id: quoteEcoWallet.id }, transaction }
      );

      const newQuoteCtBalance = quoteCtBalance + quoteAmt;
      await models.wallet.update(
        { balance: newQuoteCtBalance },
        { where: { id: quoteCtWallet.id }, transaction }
      );

      // Create transaction records for both wallets
      await createCopyTradingTransaction(
        {
          userId: user.id,
          leaderId: subscription.leaderId,
          followerId: id,
          type: "ALLOCATION",
          amount: -quoteAmt, // Negative for deduction
          currency: quoteCurrency,
          balanceBefore: quoteBalance,
          balanceAfter: newQuoteEcoBalance,
          description: `Transfer ${quoteAmt} ${quoteCurrency} from ECO to CT wallet (allocate to ${symbol})`,
          metadata: JSON.stringify({
            symbol,
            currencyType: "QUOTE",
          }),
        },
        transaction
      );

      await createCopyTradingTransaction(
        {
          userId: user.id,
          leaderId: subscription.leaderId,
          followerId: id,
          type: "ALLOCATION",
          amount: quoteAmt, // Positive for addition
          currency: quoteCurrency,
          balanceBefore: quoteCtBalance,
          balanceAfter: newQuoteCtBalance,
          description: `Received ${quoteAmt} ${quoteCurrency} in CT wallet (allocate to ${symbol})`,
          metadata: JSON.stringify({
            symbol,
            currencyType: "QUOTE",
          }),
        },
        transaction
      );
    }

    // Create allocation
    allocation = await models.copyTradingFollowerAllocation.create(
      {
        followerId: id,
        symbol,
        baseCurrency,
        quoteCurrency,
        baseAmount: baseAmt,
        quoteAmount: quoteAmt,
        baseUsedAmount: 0,
        quoteUsedAmount: 0,
        totalProfit: 0,
        totalTrades: 0,
        winRate: 0,
        isActive: true,
      },
      { transaction }
    );

    // Create audit log
    await createAuditLog(
      {
        entityType: "ALLOCATION",
        entityId: allocation.id,
        action: "CREATE",
        newValue: {
          symbol,
          baseAmount: baseAmt,
          quoteAmount: quoteAmt,
        },
        userId: user.id,
      },
      transaction
    );
  });

  ctx?.success(`Created allocation for ${symbol}`);
  return {
    message: `Successfully created allocation for ${symbol}`,
    allocation: allocation.toJSON(),
  };
};
