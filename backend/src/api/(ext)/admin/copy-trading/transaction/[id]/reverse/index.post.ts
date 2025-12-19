// Admin reverse a copy trading transaction
import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";
import { createAuditLog, createCopyTradingTransaction } from "@b/api/(ext)/copy-trading/utils";
import {
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Reverse copy trading transaction",
  description:
    "Creates a reversing transaction to undo a previous copy trading transaction. Determines the appropriate reversal type based on the original transaction type, adjusts wallet balances, updates follower statistics, and creates an audit log. Validates that the transaction has not already been reversed and ensures wallet balance remains positive after reversal.",
  operationId: "adminReverseCopyTradingTransaction",
  tags: ["Admin", "Copy Trading", "Transactions"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Reverse copy trading transaction",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Transaction ID to reverse",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for reversal",
            },
          },
          required: ["reason"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Transaction reversed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              originalTransaction: {
                type: "object",
                description: "The original transaction that was reversed",
              },
              reversalTransaction: {
                type: "object",
                description: "The new reversing transaction",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse("Transaction"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  const { id } = params;
  const { reason } = body || {};

  if (!user?.id) {
    ctx?.fail("Unauthorized");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating reversal reason");
  if (!reason) {
    ctx?.fail("Reason is required");
    throw createError({ statusCode: 400, message: "Reason is required" });
  }

  ctx?.step("Fetching original transaction");
  const originalTx = await models.copyTradingTransaction.findByPk(id, {
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName"],
      },
    ],
  });

  if (!originalTx) {
    ctx?.fail("Transaction not found");
    throw createError({ statusCode: 404, message: "Transaction not found" });
  }

  ctx?.step("Checking for existing reversal");
  const existingReversal = await models.copyTradingTransaction.findOne({
    where: {
      description: { [Op.like]: `%Reversal of transaction ${id}%` },
    },
  });

  if (existingReversal) {
    ctx?.fail("Transaction has already been reversed");
    throw createError({ statusCode: 400, message: "Transaction has already been reversed" });
  }

  ctx?.step("Determining reversal type");
  let reversalType: string;
  let walletAdjustment: number;

  switch (originalTx.type) {
    case "ALLOCATION":
      reversalType = "DEALLOCATION";
      walletAdjustment = originalTx.amount; // Return to wallet
      break;
    case "DEALLOCATION":
      reversalType = "ALLOCATION";
      walletAdjustment = -originalTx.amount; // Take from wallet
      break;
    case "PROFIT":
      reversalType = "LOSS";
      walletAdjustment = -originalTx.amount;
      break;
    case "LOSS":
      reversalType = "PROFIT";
      walletAdjustment = originalTx.amount;
      break;
    case "PROFIT_SHARE":
    case "PLATFORM_FEE":
      reversalType = "REFUND";
      walletAdjustment = originalTx.amount;
      break;
    case "REFUND":
      ctx?.fail("Cannot reverse a refund transaction");
      throw createError({ statusCode: 400, message: "Cannot reverse a refund transaction" });
    default:
      ctx?.fail(`Cannot reverse transaction type: ${originalTx.type}`);
      throw createError({ statusCode: 400, message: `Cannot reverse transaction type: ${originalTx.type}` });
  }

  let reversalTx: any;

  ctx?.step("Processing reversal transaction");
  await sequelize.transaction(async (transaction) => {
    if (walletAdjustment !== 0) {
      ctx?.step("Adjusting wallet balance");
      const wallet = await models.wallet.findOne({
        where: {
          userId: originalTx.userId,
          currency: originalTx.currency || "USDT",
          type: "SPOT",
        },
        lock: true,
        transaction,
      });

      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + walletAdjustment;
        if (newBalance < 0) {
          ctx?.fail("Reversal would result in negative wallet balance");
          throw createError({
            statusCode: 400,
            message: "Reversal would result in negative wallet balance",
          });
        }
        await wallet.update({ balance: newBalance }, { transaction });
      }
    }

    ctx?.step("Creating reversal transaction");
    reversalTx = await createCopyTradingTransaction({
      userId: originalTx.userId,
      leaderId: originalTx.leaderId,
      followerId: originalTx.followerId,
      tradeId: originalTx.tradeId,
      type: reversalType,
      amount: originalTx.amount,
      currency: originalTx.currency,
      fee: 0,
      balanceBefore: originalTx.balanceAfter,
      balanceAfter: originalTx.balanceAfter + walletAdjustment,
      description: `Reversal of transaction ${id}: ${reason}`,
      metadata: {
        originalTransactionId: id,
        reversedBy: user.id,
        reason,
      },
    });

    if (originalTx.followerId) {
      ctx?.step("Updating follower statistics");
      const follower = await models.copyTradingFollower.findByPk(originalTx.followerId, {
        transaction,
      });
      if (follower) {
        let newAllocated = follower.allocatedAmount;
        let newProfit = follower.totalProfit;

        if (reversalType === "ALLOCATION") {
          newAllocated += originalTx.amount;
        } else if (reversalType === "DEALLOCATION") {
          newAllocated -= originalTx.amount;
        } else if (reversalType === "PROFIT") {
          newProfit += originalTx.amount;
        } else if (reversalType === "LOSS") {
          newProfit -= originalTx.amount;
        }

        await follower.update(
          {
            allocatedAmount: Math.max(0, newAllocated),
            totalProfit: newProfit,
          },
          { transaction }
        );
      }
    }

    ctx?.step("Creating audit log");
    await createAuditLog({
      entityType: "TRANSACTION",
      entityId: id,
      action: "REVERSE",
      oldValue: originalTx.toJSON(),
      newValue: { reversalTransactionId: reversalTx.id, reason },
      adminId: user.id,
      reason,
    });
  });

  ctx?.success("Transaction reversed successfully");
  return {
    message: "Transaction reversed successfully",
    originalTransaction: originalTx.toJSON(),
    reversalTransaction: reversalTx,
  };
};
