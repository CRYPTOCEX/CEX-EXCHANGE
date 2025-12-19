// Admin delete/deactivate leader
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";
import {
  getWalletByUserIdAndCurrency,
  updateWalletBalance,
} from "@b/api/(ext)/ecosystem/utils/wallet";

export const metadata = {
  summary: "Delete Leader (Admin)",
  description:
    "Deactivates a leader and optionally returns funds to followers from all their allocations.",
  operationId: "adminDeleteCopyTradingLeader",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Delete copy trading leader",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            refundFollowers: {
              type: "boolean",
              default: true,
              description: "Return allocated funds to followers",
            },
            reason: {
              type: "string",
              description: "Reason for deletion",
            },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Leader deleted successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Leader not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const { refundFollowers = true, reason = "Admin deleted" } = body || {};

  ctx?.step("Fetching leader");
  const leader = await models.copyTradingLeader.findByPk(id);

  if (!leader) {
    ctx?.fail("Leader not found");
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Checking for open positions");
  const openTrades = await models.copyTradingTrade.count({
    where: {
      leaderId: id,
      status: { [models.sequelize.Op.in]: ["OPEN", "PENDING", "PARTIALLY_FILLED"] },
    },
  });

  if (openTrades > 0) {
    throw createError({
      statusCode: 400,
      message: `Cannot delete leader with ${openTrades} open positions. Please close all positions first.`,
    });
  }

  ctx?.step("Fetching active followers");
  const followers = await models.copyTradingFollower.findAll({
    where: { leaderId: id, status: { [models.sequelize.Op.ne]: "STOPPED" } },
    include: [
      {
        model: models.copyTradingFollowerAllocation,
        as: "allocations",
        where: { isActive: true },
        required: false,
      },
    ],
  });

  let totalRefundedFollowers = 0;
  let totalRefundedAllocations = 0;

  await sequelize.transaction(async (transaction) => {
    if (refundFollowers) {
      ctx?.step(`Processing ${followers.length} followers`);

      for (const follower of followers) {
        const followerData = follower as any;
        const allocations = followerData.allocations || [];

        if (allocations.length > 0) {
          ctx?.step(`Refunding ${allocations.length} allocations for follower ${followerData.userId}`);

          for (const allocation of allocations) {
            const alloc = allocation as any;
            const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");

            // Calculate available amounts to refund (total - used)
            const baseToRefund = Math.max(0, alloc.baseAmount - alloc.baseUsedAmount);
            const quoteToRefund = Math.max(0, alloc.quoteAmount - alloc.quoteUsedAmount);

            // Refund base currency if any
            if (baseToRefund > 0) {
              const baseWallet = await getWalletByUserIdAndCurrency(
                followerData.userId,
                baseCurrency
              );
              if (baseWallet) {
                const balanceBefore = parseFloat(baseWallet.balance.toString());
                await updateWalletBalance(baseWallet, baseToRefund, "add");

                await models.copyTradingTransaction.create(
                  {
                    userId: followerData.userId,
                    leaderId: id,
                    followerId: followerData.id,
                    type: "REFUND",
                    amount: baseToRefund,
                    currency: baseCurrency,
                    balanceBefore,
                    balanceAfter: balanceBefore + baseToRefund,
                    description: `Refund: Leader deleted by admin - ${baseToRefund} ${baseCurrency} from ${alloc.symbol}`,
                    metadata: JSON.stringify({
                      allocationId: alloc.id,
                      symbol: alloc.symbol,
                      reason: "ADMIN_LEADER_DELETED",
                    }),
                  },
                  { transaction }
                );
              }
            }

            // Refund quote currency if any
            if (quoteToRefund > 0) {
              const quoteWallet = await getWalletByUserIdAndCurrency(
                followerData.userId,
                quoteCurrency
              );
              if (quoteWallet) {
                const balanceBefore = parseFloat(quoteWallet.balance.toString());
                await updateWalletBalance(quoteWallet, quoteToRefund, "add");

                await models.copyTradingTransaction.create(
                  {
                    userId: followerData.userId,
                    leaderId: id,
                    followerId: followerData.id,
                    type: "REFUND",
                    amount: quoteToRefund,
                    currency: quoteCurrency,
                    balanceBefore,
                    balanceAfter: balanceBefore + quoteToRefund,
                    description: `Refund: Leader deleted by admin - ${quoteToRefund} ${quoteCurrency} from ${alloc.symbol}`,
                    metadata: JSON.stringify({
                      allocationId: alloc.id,
                      symbol: alloc.symbol,
                      reason: "ADMIN_LEADER_DELETED",
                    }),
                  },
                  { transaction }
                );
              }
            }

            // Deactivate the allocation
            if (baseToRefund > 0 || quoteToRefund > 0) {
              await alloc.update(
                {
                  isActive: false,
                  baseAmount: alloc.baseUsedAmount,
                  quoteAmount: alloc.quoteUsedAmount,
                },
                { transaction }
              );
              totalRefundedAllocations++;
            }
          }

          totalRefundedFollowers++;
        }

        // Stop the subscription
        await follower.update({ status: "STOPPED" }, { transaction });
      }
    } else {
      // Just stop followers without refunding
      for (const follower of followers) {
        await follower.update({ status: "STOPPED" }, { transaction });
      }
    }

    ctx?.step("Soft deleting leader");
    await leader.update({ status: "INACTIVE" }, { transaction });
    await leader.destroy({ transaction });

    ctx?.step("Creating audit log");
    await createAuditLog(
      {
        entityType: "LEADER",
        entityId: id,
        action: "DELETE",
        oldValue: { status: leader.status },
        newValue: {
          status: "DELETED",
          refundedFollowers: totalRefundedFollowers,
          refundedAllocations: totalRefundedAllocations,
        },
        adminId: user?.id,
        reason,
      },
      transaction
    );
  });

  ctx?.success(
    `Leader deleted successfully. Processed ${followers.length} followers, refunded ${totalRefundedAllocations} allocations`
  );
  return {
    message: "Leader deleted successfully",
    totalFollowers: followers.length,
    refundedFollowers: totalRefundedFollowers,
    refundedAllocations: totalRefundedAllocations,
  };
};
