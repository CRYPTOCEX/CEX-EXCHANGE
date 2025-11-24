// /server/api/admin/wallets/show.get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { walletSchema } from "../utils"; // Assuming the schema is in a separate file.
import { models } from "@b/db";

export const metadata = {
  summary: "Retrieves a specific wallet by UUID",
  operationId: "getWalletByUuid",
  tags: ["Admin", "Wallets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the wallet to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Wallet information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: walletSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.wallet",
};

export default async (data: Handler) => {
  const { params } = data;
  return await getRecord("wallet", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
    {
      model: models.transaction,
      as: "transactions",
      attributes: [
        "id",
        "type",
        "amount",
        "fee",
        "status",
        "createdAt",
        "metadata",
      ],
    },
  ]);
};
