import { models, sequelize } from "@b/db";
import { poolWithdrawSchema, aiMarketMakerPoolStoreSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";

export const metadata: OperationObject = {
  summary: "Withdraw liquidity from AI Market Maker pool to admin wallet",
  operationId: "withdrawAiMarketMakerPool",
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
        schema: poolWithdrawSchema,
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

  // Check if market maker is active
  if (marketMaker.status === "ACTIVE") {
    throw createError(
      400,
      "Cannot withdraw from active market maker. Please pause or stop it first."
    );
  }

  // Check available balance in pool
  const currentPoolBalance =
    currency === "BASE"
      ? Number(pool.baseCurrencyBalance)
      : Number(pool.quoteCurrencyBalance);

  if (amount > currentPoolBalance) {
    throw createError(
      400,
      `Insufficient pool balance. Available: ${currentPoolBalance}, Requested: ${amount}`
    );
  }

  // Determine which currency to use based on BASE or QUOTE
  const currencySymbol = currency === "BASE" ? market.currency : market.pair;

  // Get admin's ecosystem wallet for the currency
  const adminWallet = await getWalletByUserIdAndCurrency(user.id, currencySymbol);
  if (!adminWallet) {
    throw createError(404, `Wallet not found for ${currencySymbol}`);
  }

  // Execute withdrawal within a transaction
  const result = await sequelize.transaction(async (transaction) => {
    // 1. Update pool balance
    const updateData: any = {};
    let balanceField: string;

    if (currency === "BASE") {
      balanceField = "baseCurrencyBalance";
      updateData.baseCurrencyBalance = currentPoolBalance - amount;
    } else {
      balanceField = "quoteCurrencyBalance";
      updateData.quoteCurrencyBalance = currentPoolBalance - amount;
    }

    // Calculate new TVL with proper null checks
    const baseBalance =
      currency === "BASE"
        ? updateData.baseCurrencyBalance
        : Number(pool.baseCurrencyBalance) || 0;
    const quoteBalance =
      currency === "QUOTE"
        ? updateData.quoteCurrencyBalance
        : Number(pool.quoteCurrencyBalance) || 0;

    const targetPrice = Number(marketMaker.targetPrice) || 0;
    updateData.totalValueLocked = baseBalance * targetPrice + quoteBalance;

    // 2. Update pool
    await pool.update(updateData, { transaction });

    // 3. Add to admin wallet
    const currentWalletBalance = Number(adminWallet.balance || 0);
    const newWalletBalance = currentWalletBalance + amount;
    await models.wallet.update(
      { balance: newWalletBalance },
      { where: { id: adminWallet.id }, transaction }
    );

    // 4. Create transaction record
    await models.transaction.create({
      userId: user.id,
      walletId: adminWallet.id,
      type: "AI_INVESTMENT_ROI",
      status: "COMPLETED",
      amount: amount,
      fee: 0,
      description: `Withdraw ${amount} ${currencySymbol} from AI Market Maker Pool`,
      metadata: JSON.stringify({
        poolId: pool.id,
        marketMakerId: marketMaker.id,
        marketSymbol: market.symbol,
        currencyType: currency,
        action: "WITHDRAW",
      }),
    }, { transaction });

    // 5. Log withdrawal in history
    await models.aiMarketMakerHistory.create({
      marketMakerId: marketMaker.id,
      action: "WITHDRAW",
      details: {
        currency,
        currencySymbol,
        amount,
        balanceBefore: currentPoolBalance,
        balanceAfter: updateData[balanceField],
        tvlAfter: updateData.totalValueLocked,
        toWallet: adminWallet.id,
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
