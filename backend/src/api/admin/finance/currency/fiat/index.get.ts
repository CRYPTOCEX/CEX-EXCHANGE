import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseFiatCurrencySchema } from "./utils";

export const metadata = {
  summary: "Lists all currencies with pagination and optional filtering",
  operationId: "listAllCurrencies",
  tags: ["Admin", "Currencies"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "All currencies retrieved successfully with pagination",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseFiatCurrencySchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currencies"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.fiat.currency",
};

export default async (data: Handler) => {
  const { query } = data;
  const sortField = query.sortField || "id";

  return getFiltered({
    model: models.currency,
    query,
    sortField: sortField || "symbol",
    numericFields: ["price", "precision"],
    timestamps: false,
  });
};
