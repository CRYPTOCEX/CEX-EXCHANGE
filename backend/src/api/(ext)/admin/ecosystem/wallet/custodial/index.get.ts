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
  summary:
    "Lists all ecosystem custodial wallets with pagination and optional filtering",
  operationId: "listEcosystemCustodialWallets",
  tags: ["Admin", "Ecosystem", "Custodial Wallets"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecosystem custodial wallets with details about the master wallet",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
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
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
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
};
