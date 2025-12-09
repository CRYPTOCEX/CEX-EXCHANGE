import { models, sequelize } from "@b/db";
import { poolDepositSchema, aiMarketMakerPoolStoreSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";
import { calculateTVL } from "../../utils/helpers/tvl";

export const metadata: OperationObject = {
  summary: "Deposit liquidity into AI Market Maker pool from admin wallet",
  operationId: "depositAiMarketMakerPool",
  tags: ["Admin", "AI Market Maker", "Pool"],
  parameters: [
    {
      index: 0,
      name: "marketId",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: poolDepositSchema,
      },
    },
  },
  responses: {
    200: aiMarketMakerPoolStoreSchema,
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker Pool"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.pool",
};

export default async (data: Handler) => {
  const { params, body, user } = data;
  const { currency, amount } = body;

  if (!user?.id) {
    throw createError(401, "Unauthorized");
  }

  if (amount <= 0) {
    throw createError(400, "Amount must be greater than 0");
  }

  // Get market maker with pool and market info
  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId, {
    include: [
      {
        model: models.aiMarketMakerPool,
        as: "pool",
      },
      {
        model: models.ecosystemMarket,
        as: "market",
      },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const pool = marketMaker.pool as any;
  if (!pool) {
    throw createError(404, "Pool not found for this market maker");
  }

  const market = marketMaker.market as any;
  if (!market) {
    throw createError(404, "Ecosystem market not found");
  }

  // Determine which currency to use based on BASE or QUOTE
  const currencySymbol = currency === "BASE" ? market.currency : market.pair;

  // Get admin's ecosystem wallet for the currency
  const adminWallet = await getWalletByUserIdAndCurrency(user.id, currencySymbol);
  if (!adminWallet) {
    throw createError(404, `Wallet not found for ${currencySymbol}`);
  }

  // Check if admin has sufficient balance with robust null validation
  const walletBalance = (() => {
    if (adminWallet.balance === null || adminWallet.balance === undefined) {
      return 0;
    }
    const parsed = parseFloat(String(adminWallet.balance));
    return isNaN(parsed) ? 0 : parsed;
  })();

  if (walletBalance < amount) {
    throw createError(
      400,
      `Insufficient balance. You have ${walletBalance.toFixed(8)} ${currencySymbol}, but trying to deposit ${amount} ${currencySymbol}`
    );
  }

  // Execute deposit within a transaction
  const result = await sequelize.transaction(async (transaction) => {
    // 1. Deduct from admin wallet
    const newWalletBalance = walletBalance - amount;
    await models.wallet.update(
      { balance: newWalletBalance },
      { where: { id: adminWallet.id }, transaction }
    );

    // 2. Update pool balance based on currency type
    const updateData: any = {};
    let balanceField: string;

    if (currency === "BASE") {
      balanceField = "baseCurrencyBalance";
      updateData.baseCurrencyBalance = Number(pool.baseCurrencyBalance) + amount;

      // Update initial balance if this is first deposit
      if (Number(pool.initialBaseBalance) === 0) {
        updateData.initialBaseBalance = amount;
      }
    } else {
      balanceField = "quoteCurrencyBalance";
      updateData.quoteCurrencyBalance = Number(pool.quoteCurrencyBalance) + amount;

      // Update initial balance if this is first deposit
      if (Number(pool.initialQuoteBalance) === 0) {
        updateData.initialQuoteBalance = amount;
      }
    }

    // Calculate new TVL using centralized helper
    const baseBalance =
      currency === "BASE"
        ? updateData.baseCurrencyBalance
        : Number(pool.baseCurrencyBalance) || 0;
    const quoteBalance =
      currency === "QUOTE"
        ? updateData.quoteCurrencyBalance
        : Number(pool.quoteCurrencyBalance) || 0;

    const targetPrice = Number(marketMaker.targetPrice) || 0;
    updateData.totalValueLocked = calculateTVL({
      baseBalance,
      quoteBalance,
      currentPrice: targetPrice,
    });

    // 3. Update pool
    await pool.update(updateData, { transaction });

    // 4. Create transaction record
    await models.transaction.create({
      userId: user.id,
      walletId: adminWallet.id,
      type: "AI_INVESTMENT",
      status: "COMPLETED",
      amount: amount,
      fee: 0,
      description: `Deposit ${amount} ${currencySymbol} to AI Market Maker Pool`,
      metadata: JSON.stringify({
        poolId: pool.id,
        marketMakerId: marketMaker.id,
        marketSymbol: market.symbol,
        currencyType: currency,
        action: "DEPOSIT",
      }),
    }, { transaction });

    // 5. Log deposit in history
    await models.aiMarketMakerHistory.create({
      marketMakerId: marketMaker.id,
      action: "DEPOSIT",
      details: {
        currency,
        currencySymbol,
        amount,
        balanceAfter: updateData[balanceField],
        tvlAfter: updateData.totalValueLocked,
        fromWallet: adminWallet.id,
        userId: user.id,
      },
      priceAtAction: marketMaker.targetPrice,
      poolValueAtAction: updateData.totalValueLocked,
    }, { transaction });

    return {
      pool: await models.aiMarketMakerPool.findByPk(pool.id, { transaction }),
      walletBalance: newWalletBalance,
    };
  });

  // Return updated pool with wallet info
  return {
    ...result.pool?.toJSON(),
    wallet: {
      currency: currencySymbol,
      balanceAfter: result.walletBalance,
    },
  };
};
