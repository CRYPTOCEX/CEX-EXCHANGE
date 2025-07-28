// /server/api/ecosystem/masterWallets/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecosystemMasterWalletSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all ecosystem master wallets with pagination and optional filtering",
  operationId: "listEcosystemMasterWallets",
  tags: ["Admin", "Ecosystem", "Master Wallets"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecosystem master wallets with optional details on custodial wallets",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecosystemMasterWalletSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Master Wallets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.master.wallet",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecosystemMasterWallet,
    query,
    sortField: query.sortField || "chain",
    timestamps: false,
    includeModels: [
      {
        model: models.ecosystemCustodialWallet,
        as: "ecosystemCustodialWallets",
        attributes: ["id", "address", "status"],
      },
    ],
  });
};
