// /server/api/admin/wallets/transactions/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { transactionSchema } from "../../../../finance/transaction/utils"; // Ensure the schema is adjusted to include only the fields needed.
import { models } from "@b/db";

export const metadata = {
  summary:
    "Retrieves detailed information of a specific wallet transaction by ID",
  operationId: "getWalletTransactionById",
  tags: ["Admin", "Wallets", "Transactions"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the wallet transaction to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Wallet transaction details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: transactionSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet Transaction"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.transaction",
};

export default async (data: Handler) => {
  const { params } = data;

  const exclude = [
    "type",
    "status",
    "amount",
    "fee",
    "description",
    "metadata",
    "referenceId",
  ];

  return await getRecord("transaction", params.id, [
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
  ]);
};
