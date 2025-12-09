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

  const ledgers = await getFiltered({
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

  // Filter by network environment if the ledger has a network field
  // Only show ledgers matching the configured network for each chain
  if (Array.isArray(ledgers.items)) {
    const filteredItems = ledgers.items.filter((ledger: any) => {
      const envNetworkKey = `${ledger.chain.toUpperCase()}_NETWORK`;
      const configuredNetwork = process.env[envNetworkKey];

      // If network is configured for this chain, filter by it
      if (configuredNetwork && ledger.network) {
        return ledger.network === configuredNetwork;
      }

      // If no network config or ledger network, include the ledger
      return true;
    });

    return {
      data: filteredItems,
      pagination: ledgers.pagination
    };
  }

  return {
    data: ledgers.items,
    pagination: ledgers.pagination
  };
};
