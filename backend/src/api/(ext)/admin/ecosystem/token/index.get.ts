// /server/api/ecosystem/tokens/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecosystemTokenSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all ecosystem tokens with pagination and optional filtering",
  operationId: "listEcosystemTokens",
  tags: ["Admin", "Ecosystem", "Tokens"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of ecosystem tokens with optional details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecosystemTokenSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Tokens"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.token",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecosystemToken,
    query,
    sortField: query.sortField || "name",
    numericFields: ["decimals", "precision", "fee"],
  });
};
