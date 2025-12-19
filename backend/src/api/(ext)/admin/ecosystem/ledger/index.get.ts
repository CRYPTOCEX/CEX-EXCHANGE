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
  summary: "List ecosystem private ledger entries",
  operationId: "listEcosystemPrivateLedgers",
  tags: ["Admin", "Ecosystem", "Ledger"],
  description:
    "Retrieves a paginated list of ecosystem private ledger entries. Each ledger entry tracks the offchain balance difference for a specific wallet, currency, and blockchain network combination. The response includes associated wallet information and user details.",
  parameters: crudParameters,
  logModule: "ADMIN_ECO",
  logTitle: "List private ledgers",
  responses: {
    200: {
      description:
        "Successfully retrieved list of ecosystem private ledger entries with associated wallet and user information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
  demoMask: ["items.wallet.user.email"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching private ledger entries");
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
  const items = ledgers.items as any[];
  const filteredItems = items.filter((ledger: any) => {
    const envNetworkKey = `${ledger.chain.toUpperCase()}_NETWORK`;
    const configuredNetwork = process.env[envNetworkKey];

    // If network is configured for this chain, filter by it
    if (configuredNetwork && ledger.network) {
      return ledger.network === configuredNetwork;
    }

    // If no network config or ledger network, include the ledger
    return true;
  });

  ctx?.success(`Retrieved ${filteredItems.length} private ledgers`);
  return {
    items: filteredItems,
    pagination: ledgers.pagination
  };
};
