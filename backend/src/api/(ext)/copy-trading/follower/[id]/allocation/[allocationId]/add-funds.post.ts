// Add funds to a specific market allocation
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  createCopyTradingTransaction,
  createAuditLog,
} from "@b/api/(ext)/copy-trading/utils";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";
import {
  validateFundOperation,
  throwValidationError,
  isValidUUID,
} from "@b/api/(ext)/copy-trading/utils/security";
import { literal } from "sequelize";

export const metadata = {
  summary: "Add Funds to Market Allocation",
  description: "Adds funds to a specific market allocation within a subscription.",
  operationId: "addFundsToAllocation",
  tags: ["Copy Trading", "Followers", "Allocations"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Add funds to allocation",
  middleware: ["copyTradingFunds"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Subscription (follower) ID",
    },
    {
      name: "allocationId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Allocation ID",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: {
              type: "number",
              minimum: 0.00000001,
              maximum: 10000000,
              description: "Amount to add",
            },
            currency: {
              type: "string",
              enum: ["BASE", "QUOTE"],
              description: "Which currency to add (BASE for selling, QUOTE for buying)",
            },
          },
          required: ["amount", "currency"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Funds added successfully",
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
    404: { description: "Allocation not found" },
    429: { description: "Too Many Requests" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  const { id, allocationId } = params;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  if (!isValidUUID(id) || !isValidUUID(allocationId)) {
    throw createError({ statusCode: 400, message: "Invalid ID format" });
  }

  ctx?.step("Validating request");
  const validation = validateFundOperation(body);
  if (!validation.valid) {
    throwValidationError(validation);
  }

  const { amount } = validation.sanitized;
  const currencyType = body.currency;

  if (!currencyType || !["BASE", "QUOTE"].includes(currencyType)) {
    throw createError({
      statusCode: 400,
      message: "Currency type must be BASE or QUOTE",
    });
  }

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
      message: "Cannot add funds to a stopped subscription",
    });
  }

  ctx?.step("Fetching allocation");
  const allocation = await models.copyTradingFollowerAllocation.findOne({
    where: { id: allocationId, followerId: id },
  });

  if (!allocation) {
    throw createError({ statusCode: 404, message: "Allocation not found" });
  }

  const allocationData = allocation as any;
  const [baseCurrency, quoteCurrency] = allocationData.symbol.split("/");
  const targetCurrency = currencyType === "BASE" ? baseCurrency : quoteCurrency;

  ctx?.step("Adding funds to allocation");
  await sequelize.transaction(async (transaction) => {
    // Get ECO wallet with lock inside transaction
    const ecoWallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency: targetCurrency,
        type: "ECO",
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!ecoWallet) {
      throw createError({
        statusCode: 400,
        message: `ECO wallet not found for ${targetCurrency}`,
      });
    }

    const ecoBalance = parseFloat(ecoWallet.balance?.toString() || "0");

    if (ecoBalance < amount) {
      throw createError({
        statusCode: 400,
        message: `Insufficient ${targetCurrency} balance in ECO wallet. Available: ${ecoBalance}`,
      });
    }

    // Get or create CT wallet with lock
    let ctWallet = await models.wallet.findOne({
      where: {
        userId: user.id,
        currency: targetCurrency,
        type: "COPY_TRADING",
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!ctWallet) {
      ctWallet = await models.wallet.create(
        {
          userId: user.id,
          currency: targetCurrency,
          type: "COPY_TRADING",
          balance: 0,
          inOrder: 0,
        },
        { transaction }
      );
    }

    const ctBalance = parseFloat(ctWallet.balance.toString());

    // Transfer funds from ECO to CT wallet
    const newEcoBalance = ecoBalance - amount;
    await models.wallet.update(
      { balance: newEcoBalance },
      { where: { id: ecoWallet.id }, transaction }
    );

    const newCtBalance = ctBalance + amount;
    await models.wallet.update(
      { balance: newCtBalance },
      { where: { id: ctWallet.id }, transaction }
    );

    // Update allocation
    if (currencyType === "BASE") {
      await allocation.update(
        { baseAmount: literal(`"baseAmount" + ${amount}`) },
        { transaction }
      );
    } else {
      await allocation.update(
        { quoteAmount: literal(`"quoteAmount" + ${amount}`) },
        { transaction }
      );
    }

    // Create transaction records for both wallets
    await createCopyTradingTransaction(
      {
        userId: user.id,
        leaderId: subscription.leaderId,
        followerId: id,
        type: "ALLOCATION",
        amount: -amount, // Negative for deduction
        currency: targetCurrency,
        balanceBefore: ecoBalance,
        balanceAfter: newEcoBalance,
        description: `Transfer ${amount} ${targetCurrency} from ECO to CT wallet (add funds to ${allocationData.symbol})`,
        metadata: JSON.stringify({
          allocationId,
          symbol: allocationData.symbol,
          currencyType,
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
        amount, // Positive for addition
        currency: targetCurrency,
        balanceBefore: ctBalance,
        balanceAfter: newCtBalance,
        description: `Received ${amount} ${targetCurrency} in CT wallet (add funds to ${allocationData.symbol})`,
        metadata: JSON.stringify({
          allocationId,
          symbol: allocationData.symbol,
          currencyType,
        }),
      },
      transaction
    );

    // Create audit log
    await createAuditLog(
      {
        entityType: "ALLOCATION",
        entityId: allocationId,
        action: "ALLOCATE",
        oldValue: {
          baseAmount: allocationData.baseAmount,
          quoteAmount: allocationData.quoteAmount,
        },
        newValue: {
          baseAmount:
            currencyType === "BASE"
              ? allocationData.baseAmount + amount
              : allocationData.baseAmount,
          quoteAmount:
            currencyType === "QUOTE"
              ? allocationData.quoteAmount + amount
              : allocationData.quoteAmount,
        },
        userId: user.id,
      },
      transaction
    );
  });

  // Reload allocation
  await allocation.reload();

  ctx?.success(`Added ${amount} ${targetCurrency} to ${allocationData.symbol}`);
  return {
    message: `Successfully added ${amount} ${targetCurrency} to ${allocationData.symbol}`,
    allocation: allocation.toJSON(),
  };
};
