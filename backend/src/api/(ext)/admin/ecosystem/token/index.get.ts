import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { notFoundResponse } from "@b/utils/schema/errors";
import { ecosystemTokenSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all ecosystem tokens",
  description:
    "Retrieves a paginated list of all ecosystem tokens with optional filtering and sorting. Supports filtering by token properties and searching across multiple fields.",
  operationId: "listEcosystemTokens",
  tags: ["Admin", "Ecosystem", "Token"],
  parameters: crudParameters,
  logModule: "ADMIN_ECO",
  logTitle: "List tokens",
  responses: {
    200: {
      description: "Ecosystem tokens retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
    404: notFoundResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.token",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching ecosystem tokens");
  const result = await getFiltered({
    model: models.ecosystemToken,
    query,
    sortField: query.sortField || "name",
    numericFields: ["decimals", "precision", "fee"],
  });

  ctx?.success("Tokens retrieved successfully");
  return result;
};
