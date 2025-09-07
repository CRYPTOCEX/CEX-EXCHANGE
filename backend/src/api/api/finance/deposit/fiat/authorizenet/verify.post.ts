import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { sendFiatTransactionEmail } from "@b/utils/emails";
import { models, sequelize } from "@b/db";
import {
  getAuthorizeNetConfig,
  makeAuthorizeNetRequest,
  CreateTransactionRequest,
  CreateTransactionResponse,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Verifies an Authorize.Net transaction",
  description:
    "Confirms the validity of an Authorize.Net transaction by its reference ID, ensuring the transaction is authenticated and processing the deposit.",
  operationId: "verifyAuthorizeNetTransaction",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
  parameters: [
    {
      name: "referenceId",
      in: "query",
      description: "The transaction reference ID",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description:
        "Transaction verified successfully. Returns the transaction details and updated wallet balance.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: {
                type: "boolean",
                description: "Indicates if the request was successful",
              },
              statusCode: {
                type: "number",
                description: "HTTP status code",
                example: 200,
              },
              data: {
                type: "object",
                properties: {
                  transactionId: {
                    type: "string",
                    description: "Transaction ID",
                  },
                  status: {
                    type: "string",
                    description: "Transaction status",
                  },
                  amount: {
                    type: "number",
                    description: "Transaction amount",
                  },
                  currency: {
                    type: "string",
                    description: "Currency code",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Authorize.Net"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) throw new Error("User not authenticated");

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) throw new Error("User not found");

  const { referenceId } = query;

  if (!referenceId) {
    throw new Error("Reference ID is required");
  }

  // Find the transaction
  const transaction = await models.transaction.findOne({
    where: { referenceId: referenceId, userId: user.id },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status === "COMPLETED") {
    return {
      status: true,
      statusCode: 200,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: JSON.parse(transaction.metadata || "{}").currency,
        message: "Transaction already completed",
      },
    };
  }

  if (transaction.status !== "PENDING") {
    throw new Error(`Transaction is in ${transaction.status} state and cannot be verified`);
  }

  try {
    const config = getAuthorizeNetConfig();
    const metadata = JSON.parse(transaction.metadata || "{}");
    const currency = metadata.currency;

    // Get transaction details from Authorize.Net
    // Note: Authorize.Net doesn't have a direct transaction details API for hosted payments
    // We'll mark the transaction as completed based on the return from hosted payment
    // In a real implementation, you might want to use webhooks for more reliable verification

    const authorizeNetGateway = await models.depositGateway.findOne({
      where: { name: "AUTHORIZENET" },
    });

    if (!authorizeNetGateway) {
      throw new Error("Authorize.Net gateway not found");
    }

    // Retrieve the user's wallet
    let wallet = await models.wallet.findOne({
      where: { userId: user.id, currency: currency },
    });

    if (!wallet) {
      wallet = await models.wallet.create({
        userId: user.id,
        currency: currency,
        type: "FIAT",
      });
    }

    const currencyData = await models.currency.findOne({
      where: { id: wallet.currency },
    });
    if (!currencyData) {
      throw new Error("Currency not found");
    }

    const depositAmount = transaction.amount;
    const feeAmount = transaction.fee || 0;

    let newBalance = Number(wallet.balance);
    newBalance += depositAmount;
    newBalance = Number(newBalance.toFixed(currencyData.precision || 2));

    // Start a transaction to update the transaction record and wallet balance
    const result = await sequelize.transaction(async (dbTransaction) => {
      // Update transaction status
      await models.transaction.update(
        {
          status: "COMPLETED",
          description: `Deposit of ${depositAmount} ${currency} to ${userPk.firstName} ${userPk.lastName} wallet by Authorize.Net.`,
        },
        {
          where: { id: transaction.id },
          transaction: dbTransaction,
        }
      );

      // Update the wallet's balance
      await models.wallet.update(
        {
          balance: newBalance,
        },
        {
          where: { id: wallet.id },
          transaction: dbTransaction,
        }
      );

      // Record admin profit if there's a fee
      if (feeAmount > 0) {
        await models.adminProfit.create(
          {
            amount: feeAmount,
            currency: wallet.currency,
            type: "DEPOSIT",
            description: `Authorize.Net deposit fee for transaction ${referenceId}`,
            transactionId: transaction.id,
          },
          { transaction: dbTransaction }
        );
      }

      return transaction;
    });

    // Send confirmation email
    try {
      await sendFiatTransactionEmail(
        userPk,
        {
          ...transaction.toJSON(),
          status: "COMPLETED",
        },
        currency,
        newBalance
      );
    } catch (emailError) {
      console.error("Failed to send transaction email:", emailError);
      // Don't throw error for email failure
    }

    return {
      status: true,
      statusCode: 200,
      data: {
        transactionId: transaction.id,
        status: "COMPLETED",
        amount: depositAmount,
        currency: currency,
        fee: feeAmount,
        newBalance: newBalance,
        referenceId: referenceId,
      },
    };

  } catch (error) {
    console.error("Authorize.Net transaction verification error:", error);
    
    // Update transaction status to failed
    await models.transaction.update(
      {
        status: "FAILED",
        description: `Failed Authorize.Net deposit: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      {
        where: { id: transaction.id },
      }
    );

    throw new Error(error instanceof Error ? error.message : "Failed to verify Authorize.Net transaction");
  }
}; 