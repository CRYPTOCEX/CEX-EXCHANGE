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
};

export default async (data: Handler) => {
  const { params, body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const { id } = params;
    const { currency, amount } = body;

    const senderWallet = await getWalletByUserIdAndCurrency(user.id, currency);
    if (!senderWallet) {
      throw createError({ statusCode: 404, message: "User wallet not found" });
    }

    const recipientAccount = await models.user.findOne({
      where: { id },
    });
    if (!recipientAccount) {
      throw createError({
        statusCode: 404,
        message: "Recipient user not found",
      });
    }

    let recipientWallet = (await getWalletByUserIdAndCurrency(
      recipientAccount.id,
      currency
    )) as any;

    if (!recipientWallet) {
      recipientWallet = await storeWallet(recipientAccount, currency);
    }

    if (senderWallet.balance < amount) {
      throw createError({ statusCode: 400, message: "Insufficient funds" });
    }

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

    return { message: "Transfer successful" };
  } catch (error) {
    console.log(`Failed to transfer: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to transfer: ${error.message}`,
    });
  }
};
