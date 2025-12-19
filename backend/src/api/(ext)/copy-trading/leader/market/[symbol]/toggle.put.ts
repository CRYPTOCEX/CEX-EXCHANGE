// Toggle market enable/disable with follower allocation refund
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  createAuditLog,
  createCopyTradingTransaction,
} from "@b/api/(ext)/copy-trading/utils";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Toggle leader market status",
  description:
    "Enables or disables a market for the leader. When disabling a market with follower allocations, refunds are automatically processed.",
  operationId: "toggleLeaderMarket",
  tags: ["Copy Trading", "Leader"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Toggle leader market",
  parameters: [
    {
      name: "symbol",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Market symbol (URL encoded, e.g., BTC%2FUSDT)",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            isActive: {
              type: "boolean",
              description: "Whether to enable (true) or disable (false) the market",
            },
          },
          required: ["isActive"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Market status toggled successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              market: { type: "object" },
              refundedAllocations: { type: "number" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request - Has open positions" },
    401: { description: "Unauthorized" },
    404: { description: "Leader or Market not found" },
  },
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const symbol = decodeURIComponent(params.symbol);
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    throw createError({ statusCode: 400, message: "isActive must be a boolean" });
  }

  ctx?.step("Finding leader profile");
  const leader = await models.copyTradingLeader.findOne({
    where: { userId: user.id },
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  const leaderId = (leader as any).id;

  // Parse symbol
  const parts = symbol.split("/");
  if (parts.length !== 2) {
    throw createError({
      statusCode: 400,
      message: "Invalid symbol format. Use BASE/QUOTE (e.g., BTC/USDT)",
    });
  }
  const [baseCurrency, quoteCurrency] = parts;

  ctx?.step("Finding market");
  let leaderMarket = await models.copyTradingLeaderMarket.findOne({
    where: { leaderId, symbol },
  });

  // If enabling and market doesn't exist, create it
  if (isActive && !leaderMarket) {
    ctx?.step("Validating market exists in ecosystem");
    const ecoMarket = await models.ecosystemMarket.findOne({
      where: { currency: baseCurrency, pair: quoteCurrency, status: true },
    });

    if (!ecoMarket) {
      throw createError({
        statusCode: 400,
        message: `Market ${symbol} not found or inactive in ecosystem`,
      });
    }

    ctx?.step("Creating new market entry");
    leaderMarket = await models.copyTradingLeaderMarket.create({
      leaderId,
      symbol,
      baseCurrency,
      quoteCurrency,
      isActive: true,
    });

    await createAuditLog({
      entityType: "LEADER",
      entityId: leaderId,
      action: "UPDATE",
      newValue: { symbol, baseCurrency, quoteCurrency, isActive: true },
      userId: user.id,
      reason: "Market enabled",
    });

    ctx?.success("Market enabled");
    return {
      success: true,
      message: `Market ${symbol} enabled`,
      market: leaderMarket,
      refundedAllocations: 0,
    };
  }

  if (!leaderMarket) {
    throw createError({ statusCode: 404, message: "Market not found" });
  }

  const currentStatus = (leaderMarket as any).isActive;

  // If status is already the same, no action needed
  if (currentStatus === isActive) {
    return {
      success: true,
      message: `Market ${symbol} is already ${isActive ? "enabled" : "disabled"}`,
      market: leaderMarket,
      refundedAllocations: 0,
    };
  }

  // If disabling, check for open positions and refund allocations
  if (!isActive) {
    ctx?.step("Checking for open positions");
    const openTrades = await models.copyTradingTrade.count({
      where: {
        leaderId,
        symbol,
        status: { [Op.in]: ["OPEN", "PENDING", "PARTIALLY_FILLED"] },
      },
    });

    if (openTrades > 0) {
      throw createError({
        statusCode: 400,
        message: `Cannot disable market with ${openTrades} open positions. Please close all positions first.`,
      });
    }

    ctx?.step("Finding follower allocations to refund");
    // Find all follower allocations for this market
    const allocations = await models.copyTradingFollowerAllocation.findAll({
      where: { symbol, isActive: true },
      include: [
        {
          model: models.copyTradingFollower,
          as: "follower",
          where: { leaderId },
          attributes: ["id", "userId"],
        },
      ],
    });

    let refundedCount = 0;

    if (allocations.length > 0) {
      ctx?.step(`Refunding ${allocations.length} follower allocations`);

      await sequelize.transaction(async (transaction) => {
        for (const allocation of allocations) {
          const alloc = allocation as any;
          const follower = alloc.follower;

          // Calculate available amounts to refund (total - used)
          const baseToRefund = Math.max(0, alloc.baseAmount - alloc.baseUsedAmount);
          const quoteToRefund = Math.max(0, alloc.quoteAmount - alloc.quoteUsedAmount);

          // Refund base currency if any - Transfer CT → ECO
          if (baseToRefund > 0) {
            // Get CT wallet
            const ctWallet = await getWalletByUserIdAndCurrency(
              follower.userId,
              baseCurrency,
              "COPY_TRADING"
            );
            if (ctWallet) {
              const ctBalance = parseFloat(ctWallet.balance.toString());

              // Get ECO wallet
              const ecoWallet = await getWalletByUserIdAndCurrency(
                follower.userId,
                baseCurrency,
                "ECO"
              );
              if (!ecoWallet) {
                throw createError({
                  statusCode: 500,
                  message: `ECO wallet not found for ${baseCurrency}`,
                });
              }
              const ecoBalance = parseFloat(ecoWallet.balance.toString());

              // Deduct from CT wallet
              const newCtBalance = ctBalance - baseToRefund;
              await models.wallet.update(
                { balance: newCtBalance },
                { where: { id: ctWallet.id }, transaction }
              );

              // Add to ECO wallet
              const newEcoBalance = ecoBalance + baseToRefund;
              await models.wallet.update(
                { balance: newEcoBalance },
                { where: { id: ecoWallet.id }, transaction }
              );

              // Create transaction records for both wallets
              await createCopyTradingTransaction(
                {
                  userId: follower.userId,
                  leaderId,
                  followerId: follower.id,
                  type: "DEALLOCATION",
                  amount: -baseToRefund, // Negative for deduction
                  currency: baseCurrency,
                  balanceBefore: ctBalance,
                  balanceAfter: newCtBalance,
                  description: `Transfer ${baseToRefund} ${baseCurrency} from CT to ECO wallet (leader disabled ${symbol})`,
                  metadata: JSON.stringify({
                    allocationId: alloc.id,
                    symbol,
                    reason: "LEADER_MARKET_DISABLED",
                  }),
                },
                transaction
              );

              await createCopyTradingTransaction(
                {
                  userId: follower.userId,
                  leaderId,
                  followerId: follower.id,
                  type: "DEALLOCATION",
                  amount: baseToRefund, // Positive for addition
                  currency: baseCurrency,
                  balanceBefore: ecoBalance,
                  balanceAfter: newEcoBalance,
                  description: `Received ${baseToRefund} ${baseCurrency} in ECO wallet (leader disabled ${symbol})`,
                  metadata: JSON.stringify({
                    allocationId: alloc.id,
                    symbol,
                    reason: "LEADER_MARKET_DISABLED",
                  }),
                },
                transaction
              );
            }
          }

          // Refund quote currency if any - Transfer CT → ECO
          if (quoteToRefund > 0) {
            // Get CT wallet
            const ctWallet = await getWalletByUserIdAndCurrency(
              follower.userId,
              quoteCurrency,
              "COPY_TRADING"
            );
            if (ctWallet) {
              const ctBalance = parseFloat(ctWallet.balance.toString());

              // Get ECO wallet
              const ecoWallet = await getWalletByUserIdAndCurrency(
                follower.userId,
                quoteCurrency,
                "ECO"
              );
              if (!ecoWallet) {
                throw createError({
                  statusCode: 500,
                  message: `ECO wallet not found for ${quoteCurrency}`,
                });
              }
              const ecoBalance = parseFloat(ecoWallet.balance.toString());

              // Deduct from CT wallet
              const newCtBalance = ctBalance - quoteToRefund;
              await models.wallet.update(
                { balance: newCtBalance },
                { where: { id: ctWallet.id }, transaction }
              );

              // Add to ECO wallet
              const newEcoBalance = ecoBalance + quoteToRefund;
              await models.wallet.update(
                { balance: newEcoBalance },
                { where: { id: ecoWallet.id }, transaction }
              );

              // Create transaction records for both wallets
              await createCopyTradingTransaction(
                {
                  userId: follower.userId,
                  leaderId,
                  followerId: follower.id,
                  type: "DEALLOCATION",
                  amount: -quoteToRefund, // Negative for deduction
                  currency: quoteCurrency,
                  balanceBefore: ctBalance,
                  balanceAfter: newCtBalance,
                  description: `Transfer ${quoteToRefund} ${quoteCurrency} from CT to ECO wallet (leader disabled ${symbol})`,
                  metadata: JSON.stringify({
                    allocationId: alloc.id,
                    symbol,
                    reason: "LEADER_MARKET_DISABLED",
                  }),
                },
                transaction
              );

              await createCopyTradingTransaction(
                {
                  userId: follower.userId,
                  leaderId,
                  followerId: follower.id,
                  type: "DEALLOCATION",
                  amount: quoteToRefund, // Positive for addition
                  currency: quoteCurrency,
                  balanceBefore: ecoBalance,
                  balanceAfter: newEcoBalance,
                  description: `Received ${quoteToRefund} ${quoteCurrency} in ECO wallet (leader disabled ${symbol})`,
                  metadata: JSON.stringify({
                    allocationId: alloc.id,
                    symbol,
                    reason: "LEADER_MARKET_DISABLED",
                  }),
                },
                transaction
              );
            }
          }

          // Deactivate the allocation
          await alloc.update(
            {
              isActive: false,
              baseAmount: alloc.baseUsedAmount, // Keep only the used amounts
              quoteAmount: alloc.quoteUsedAmount,
            },
            { transaction }
          );

          refundedCount++;
        }

        // Disable the market
        await leaderMarket.update({ isActive: false }, { transaction });
      });

      await createAuditLog({
        entityType: "LEADER",
        entityId: leaderId,
        action: "UPDATE",
        oldValue: { symbol, isActive: true },
        newValue: { symbol, isActive: false, refundedAllocations: refundedCount },
        userId: user.id,
        reason: `Market disabled, ${refundedCount} allocations refunded`,
      });

      ctx?.success(`Market disabled, ${refundedCount} allocations refunded`);
      return {
        success: true,
        message: `Market ${symbol} disabled. ${refundedCount} follower allocation(s) refunded.`,
        market: await leaderMarket.reload(),
        refundedAllocations: refundedCount,
      };
    }

    // No allocations to refund, just disable
    await leaderMarket.update({ isActive: false });

    await createAuditLog({
      entityType: "LEADER",
      entityId: leaderId,
      action: "UPDATE",
      oldValue: { symbol, isActive: true },
      newValue: { symbol, isActive: false },
      userId: user.id,
      reason: "Market disabled",
    });

    ctx?.success("Market disabled");
    return {
      success: true,
      message: `Market ${symbol} disabled`,
      market: leaderMarket,
      refundedAllocations: 0,
    };
  }

  // Enabling the market
  ctx?.step("Enabling market");
  await leaderMarket.update({ isActive: true });

  await createAuditLog({
    entityType: "LEADER",
    entityId: leaderId,
    action: "UPDATE",
    oldValue: { symbol, isActive: false },
    newValue: { symbol, isActive: true },
    userId: user.id,
    reason: "Market enabled",
  });

  ctx?.success("Market enabled");
  return {
    success: true,
    message: `Market ${symbol} enabled`,
    market: leaderMarket,
    refundedAllocations: 0,
  };
};
