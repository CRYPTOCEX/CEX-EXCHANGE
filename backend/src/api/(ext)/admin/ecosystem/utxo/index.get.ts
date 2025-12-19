// /server/api/ecosystem/utxos/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecosystemUtxoSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List ecosystem UTXOs",
  operationId: "listEcosystemUtxos",
  tags: ["Admin", "Ecosystem", "UTXO"],
  description:
    "Retrieves a paginated list of ecosystem Unspent Transaction Outputs (UTXOs). Each UTXO represents an unspent output from a blockchain transaction that can be used as input for new transactions. The response includes associated wallet information.",
  parameters: crudParameters,
  logModule: "ADMIN_ECO",
  logTitle: "List UTXOs",
  responses: {
    200: {
      description:
        "Successfully retrieved list of ecosystem UTXOs with associated wallet currency information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecosystemUtxoSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem UTXOs"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.utxo",
  demoMask: ["items.transactionId", "items.script"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching ecosystem UTXOs");
  const result = await getFiltered({
    model: models.ecosystemUtxo,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["currency"],
      },
    ],
  });

  ctx?.success("UTXOs retrieved successfully");
  return result;
};
