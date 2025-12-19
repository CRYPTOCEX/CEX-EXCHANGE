// /server/api/ecosystem/custodialWallets/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecosystemCustodialWalletSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List all ecosystem custodial wallets",
  description: "Retrieves a paginated list of ecosystem custodial wallets with optional filtering and sorting. Each wallet includes its address, chain, network, status, and associated master wallet information.",
  operationId: "listEcosystemCustodialWallets",
  tags: ["Admin", "Ecosystem", "Wallet"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Ecosystem custodial wallets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecosystemCustodialWalletSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Custodial Wallets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.custodial.wallet",
  demoMask: ["items.address", "items.masterWallet.address"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching custodial wallets list");

  const result = await getFiltered({
    model: models.ecosystemCustodialWallet,
    query,
    sortField: query.sortField || "chain",
    includeModels: [
      {
        model: models.ecosystemMasterWallet,
        as: "masterWallet",
        attributes: ["id", "chain", "address"],
      },
    ],
  });

  ctx?.success(`Retrieved ${result.items.length} custodial wallets`);
  return result;
};
