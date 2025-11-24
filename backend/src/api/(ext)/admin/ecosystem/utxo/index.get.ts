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
  summary: "Lists all ecosystem UTXOs with pagination and optional filtering",
  operationId: "listEcosystemUtxos",
  tags: ["Admin", "Ecosystem", "UTXOs"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecosystem UTXOs with details about the associated wallet",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
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
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
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
};
