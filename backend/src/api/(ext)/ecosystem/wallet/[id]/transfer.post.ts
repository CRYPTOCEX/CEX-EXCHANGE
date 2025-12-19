import { models, sequelize } from "@b/db";
import {
  getWalletByUserIdAndCurrency,
  storeWallet,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Transfers funds between user wallets",
  description: "Allows a user to transfer funds to another user's wallet.",
  operationId: "transferFunds",
  tags: ["Wallet", "Transfer"],
  logModule: "ECO_TRANSFER",
  logTitle: "Transfer funds between wallets",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: {
        type: "string",
        description: "UUID of the recipient's wallet or user",
      },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Amount to transfer" },
            currency: {
              type: "string",
              description: "Currency for the transfer",
            },
          },
          required: ["amount", "currency"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Transfer completed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Success message indicating the transfer has been processed.",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, body, user, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const { id } = params;
    const { currency, amount } = body;

    ctx?.step("Validating transfer request");
    if (!id || !currency || !amount) {
      throw createError({
        statusCode: 400,
        message: "Missing required parameters",
      });
    }

    ctx?.step("Retrieving sender wallet");
    const senderWallet = await getWalletByUserIdAndCurrency(user.id, currency);
    if (!senderWallet) {
      ctx?.fail(`Sender wallet not found for currency ${currency}`);
      throw createError({ statusCode: 404, message: "User wallet not found" });
    }

    ctx?.step("Verifying recipient user");
    const recipientAccount = await models.user.findOne({
      where: { id },
    });
    if (!recipientAccount) {
      ctx?.fail("Recipient user not found");
      throw createError({
        statusCode: 404,
        message: "Recipient user not found",
      });
    }

    ctx?.step("Retrieving or creating recipient wallet");
    let recipientWallet = (await getWalletByUserIdAndCurrency(
      recipientAccount.id,
      currency
    )) as any;

    if (!recipientWallet) {
      recipientWallet = await storeWallet(recipientAccount, currency);
    }

    ctx?.step("Verifying sender balance");
    if (senderWallet.balance < amount) {
      ctx?.fail(`Insufficient funds: ${senderWallet.balance} < ${amount}`);
      throw createError({ statusCode: 400, message: "Insufficient funds" });
    }

    ctx?.step("Processing transfer transaction");
    await sequelize.transaction(async (transaction) => {
      await models.wallet.update(
        {
          balance: senderWallet.balance - amount,
        },
        {
          where: { id: senderWallet.id },
          transaction,
        }
      );

      await models.wallet.update(
        {
          balance: recipientWallet.balance + amount,
        },
        {
          where: { id: recipientWallet.id },
          transaction,
        }
      );

      await models.transaction.create(
        {
          userId: user.id,
          walletId: senderWallet.id,
          type: "OUTGOING_TRANSFER",
          status: "COMPLETED",
          amount,
          description: `Transferred out ${amount} ${currency}`,
          fee: 0,
        },
        { transaction }
      );

      await models.transaction.create(
        {
          userId: recipientAccount.id,
          walletId: recipientWallet.id,
          type: "INCOMING_TRANSFER",
          status: "COMPLETED",
          amount,
          description: `Transferred in ${amount} ${currency}`,
          fee: 0,
        },
        { transaction }
      );
    });

    ctx?.success(`Transferred ${amount} ${currency} to user ${id}`);
    return { message: "Transfer successful" };
  } catch (error) {
    console.log(`Failed to transfer: ${error.message}`);
    ctx?.fail(`Transfer failed: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to transfer: ${error.message}`,
    });
  }
};
