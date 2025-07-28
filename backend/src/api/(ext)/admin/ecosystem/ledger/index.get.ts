// /server/api/ecosystem/privateLedgers/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecosystemPrivateLedgerSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all ecosystem private ledger entries with pagination and optional filtering",
  operationId: "listEcosystemPrivateLedgers",
  tags: ["Admin", "Ecosystem", "Private Ledgers"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecosystem private ledger entries with details about the wallet",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecosystemPrivateLedgerSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Private Ledgers"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.private.ledger",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecosystemPrivateLedger,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["currency", "address", "balance"],
        includeModels: [
          {
            model: models.user,
            as: "user",
            attributes: ["avatar", "firstName", "lastName", "email"],
          },
        ],
      },
    ],
  });

  // TODO: custom filtering

  // return ledgers.filter(
  //   (ledger) => ledger.network === process.env[`${ledger.chain}_NETWORK`],
  // ) as unknown as EcosystemPrivateLedger[]
};
