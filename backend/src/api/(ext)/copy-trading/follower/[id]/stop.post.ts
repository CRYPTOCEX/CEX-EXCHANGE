// Stop subscription and return funds from all allocations
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  createCopyTradingTransaction,
  createAuditLog,
  updateLeaderStats,
  notifyFollowerSubscriptionEvent,
  notifyLeaderFollowerStopped,
} from "@b/api/(ext)/copy-trading/utils";
import { isValidUUID } from "@b/api/(ext)/copy-trading/utils/security";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";

export const metadata = {
  summary: "Stop Subscription",
  description:
    "Stops a subscription permanently and returns all allocated funds to wallet.",
  operationId: "stopCopyTradingSubscription",
  tags: ["Copy Trading", "Followers"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Stop following",
  middleware: ["copyTradingFollowerAction"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Subscription ID",
    },
  ],
  responses: {
    200: {
      description: "Subscription stopped successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              returnedFunds: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    currency: { type: "string" },
                    amount: { type: "number" },
                  },
                },
              },
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
  const { user, params, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!isValidUUID(id)) {
    throw createError({ statusCode: 400, message: "Invalid subscription ID" });
  }

  ctx?.step("Fetching subscription");
  const subscription = await models.copyTradingFollower.findByPk(id, {
    include: [
      {
        model: models.copyTradingFollowerAllocation,
        as: "allocations",
        where: { isActive: true },
        required: false,
      },
    ],
  });

  if (!subscription) {
    throw createError({ statusCode: 404, message: "Subscription not found" });
  }

  if (subscription.userId !== user.id) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  if (subscription.status === "STOPPED") {
    throw createError({
      statusCode: 400,
      message: "Subscription is already stopped",
    });
  }

  // Check for active trades
  const activeTrades = await models.copyTradingTrade.count({
    where: { followerId: id, status: "OPEN" },
  });

  if (activeTrades > 0) {
    throw createError({
      statusCode: 400,
      message: `Cannot stop subscription with ${activeTrades} active trades. Please close all positions first.`,
    });
  }

  const leaderId = subscription.leaderId;
  const oldStatus = subscription.status;
  const allocations = (subscription as any).allocations || [];
  const returnedFunds: Array<{ currency: string; amount: number }> = [];

  ctx?.step("Stopping subscription and returning funds");
  await sequelize.transaction(async (transaction) => {
    // Return funds from each allocation - Transfer from CT wallet back to ECO wallet
    for (const allocation of allocations) {
      const allocationData = allocation as any;
      const [baseCurrency, quoteCurrency] = allocationData.symbol.split("/");

      // Return base currency (unused amount) - Transfer CT → ECO
      const baseToReturn =
        allocationData.baseAmount - allocationData.baseUsedAmount;
      if (baseToReturn > 0) {
        // Get CT wallet
        const ctWallet = await getWalletByUserIdAndCurrency(
          user.id,
          baseCurrency,
          "COPY_TRADING"
        );
        if (ctWallet) {
          const ctBalance = parseFloat(ctWallet.balance.toString());

          // Get ECO wallet
          const ecoWallet = await getWalletByUserIdAndCurrency(
            user.id,
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
          const newCtBalance = ctBalance - baseToReturn;
          await models.wallet.update(
            { balance: newCtBalance },
            { where: { id: ctWallet.id }, transaction }
          );

          // Add to ECO wallet
          const newEcoBalance = ecoBalance + baseToReturn;
          await models.wallet.update(
            { balance: newEcoBalance },
            { where: { id: ecoWallet.id }, transaction }
          );

          returnedFunds.push({ currency: baseCurrency, amount: baseToReturn });

          // Create transaction records for both wallets
          await createCopyTradingTransaction(
            {
              userId: user.id,
              leaderId: subscription.leaderId,
              followerId: id,
              type: "DEALLOCATION",
              amount: -baseToReturn, // Negative for deduction
              currency: baseCurrency,
              balanceBefore: ctBalance,
              balanceAfter: newCtBalance,
              description: `Transfer ${baseToReturn} ${baseCurrency} from CT to ECO wallet (stop subscription for ${allocationData.symbol})`,
            },
            transaction
          );

          await createCopyTradingTransaction(
            {
              userId: user.id,
              leaderId: subscription.leaderId,
              followerId: id,
              type: "DEALLOCATION",
              amount: baseToReturn, // Positive for addition
              currency: baseCurrency,
              balanceBefore: ecoBalance,
              balanceAfter: newEcoBalance,
              description: `Received ${baseToReturn} ${baseCurrency} in ECO wallet (stop subscription for ${allocationData.symbol})`,
            },
            transaction
          );
        }
      }

      // Return quote currency (unused amount) - Transfer CT → ECO
      const quoteToReturn =
        allocationData.quoteAmount - allocationData.quoteUsedAmount;
      if (quoteToReturn > 0) {
        // Get CT wallet
        const ctWallet = await getWalletByUserIdAndCurrency(
          user.id,
          quoteCurrency,
          "COPY_TRADING"
        );
        if (ctWallet) {
          const ctBalance = parseFloat(ctWallet.balance.toString());

          // Get ECO wallet
          const ecoWallet = await getWalletByUserIdAndCurrency(
            user.id,
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
          const newCtBalance = ctBalance - quoteToReturn;
          await models.wallet.update(
            { balance: newCtBalance },
            { where: { id: ctWallet.id }, transaction }
          );

          // Add to ECO wallet
          const newEcoBalance = ecoBalance + quoteToReturn;
          await models.wallet.update(
            { balance: newEcoBalance },
            { where: { id: ecoWallet.id }, transaction }
          );

          returnedFunds.push({
            currency: quoteCurrency,
            amount: quoteToReturn,
          });

          // Create transaction records for both wallets
          await createCopyTradingTransaction(
            {
              userId: user.id,
              leaderId: subscription.leaderId,
              followerId: id,
              type: "DEALLOCATION",
              amount: -quoteToReturn, // Negative for deduction
              currency: quoteCurrency,
              balanceBefore: ctBalance,
              balanceAfter: newCtBalance,
              description: `Transfer ${quoteToReturn} ${quoteCurrency} from CT to ECO wallet (stop subscription for ${allocationData.symbol})`,
            },
            transaction
          );

          await createCopyTradingTransaction(
            {
              userId: user.id,
              leaderId: subscription.leaderId,
              followerId: id,
              type: "DEALLOCATION",
              amount: quoteToReturn, // Positive for addition
              currency: quoteCurrency,
              balanceBefore: ecoBalance,
              balanceAfter: newEcoBalance,
              description: `Received ${quoteToReturn} ${quoteCurrency} in ECO wallet (stop subscription for ${allocationData.symbol})`,
            },
            transaction
          );
        }
      }

      // Deactivate allocation
      await allocationData.update({ isActive: false }, { transaction });
    }

    // Update subscription status
    await subscription.update({ status: "STOPPED" }, { transaction });

    // Create audit log
    await createAuditLog(
      {
        entityType: "FOLLOWER",
        entityId: id,
        action: "UNFOLLOW",
        oldValue: { status: oldStatus },
        newValue: { status: "STOPPED", returnedFunds },
        userId: user.id,
      },
      transaction
    );
  });

  ctx?.step("Updating leader stats");
  await updateLeaderStats(leaderId);

  // Notify follower about subscription stop
  ctx?.step("Sending follower notification");
  await notifyFollowerSubscriptionEvent(id, "STOPPED", undefined, ctx);

  // Notify leader about follower stop
  ctx?.step("Sending leader notification");
  await notifyLeaderFollowerStopped(leaderId, user.id, undefined, ctx);

  ctx?.success("Subscription stopped");
  return {
    message: "Subscription stopped successfully",
    returnedFunds,
  };
};
