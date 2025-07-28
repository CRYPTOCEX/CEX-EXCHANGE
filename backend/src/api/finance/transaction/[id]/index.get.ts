// /server/api/wallets/transactions/show.get.ts

import { createError } from "@b/utils/error";
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves details of a specific transaction by reference ID",
  description:
    "Fetches detailed information about a specific transaction based on its unique reference ID.",
  operationId: "getTransaction",
  tags: ["Finance", "Transactions"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The UUID of the transaction to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Transaction details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "ID of the transaction",
              },
              userId: {
                type: "string",
                description: "ID of the user who created the transaction",
              },
              walletId: {
                type: "string",
                description: "ID of the wallet associated with the transaction",
              },
              type: {
                type: "string",
                description: "Type of the transaction",
              },
              status: {
                type: "string",
                description: "Status of the transaction",
              },
              amount: {
                type: "number",
                description: "Amount of the transaction",
              },
              fee: {
                type: "number",
                description: "Fee charged for the transaction",
              },
              description: {
                type: "string",
                description: "Description of the transaction",
              },
              metadata: {
                type: "object",
                description: "Metadata of the transaction",
              },
              referenceId: {
                type: "string",
                description: "Reference ID of the transaction",
              },
              trxId: {
                type: "string",
                description: "Transaction ID from the payment processor",
              },
              createdAt: {
                type: "string",
                description: "Date and time when the transaction was created",
              },
              updatedAt: {
                type: "string",
                description:
                  "Date and time when the transaction was last updated",
              },
              wallet: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "ID of the wallet",
                  },
                  userId: {
                    type: "string",
                    description: "ID of the user who owns the wallet",
                  },
                  currency: {
                    type: "string",
                    description: "Currency of the wallet",
                  },
                  type: {
                    type: "string",
                    description: "Type of the wallet",
                  },
                  balance: {
                    type: "number",
                    description: "Current balance of the wallet",
                  },
                  createdAt: {
                    type: "string",
                    description: "Date and time when the wallet was created",
                  },
                  updatedAt: {
                    type: "string",
                    description:
                      "Date and time when the wallet was last updated",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transaction"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  return getTransaction(data.params.id);
};

export async function getTransaction(
  id: string
): Promise<transactionAttributes | null> {
  const response = await models.transaction.findByPk(id, {
    include: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["currency", "type"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  if (!response) {
    throw createError({
      statusCode: 404,
      message: "Transaction not found",
    });
  }

  return response.get({ plain: true }) as unknown as transactionAttributes;
}

export async function getTransactionByRefId(
  refId: string
): Promise<transactionAttributes | null> {
  const response = await models.transaction.findOne({
    where: { referenceId: refId },
    include: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["currency", "type"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  if (!response) {
    throw createError({
      statusCode: 404,
      message: "Transaction not found",
    });
  }

  return response.get({ plain: true }) as unknown as transactionAttributes;
}
