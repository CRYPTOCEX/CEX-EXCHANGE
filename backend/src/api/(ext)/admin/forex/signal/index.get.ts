// /server/api/forex/signals/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { forexSignalSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all Forex Signals with pagination and optional filtering",
  operationId: "listForexSignals",
  tags: ["Admin", "Forex", "Signals"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Forex Signals with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: forexSignalSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Signals"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.forex.signal",
};

export default async (data: Handler) => {
  const { query } = data;

  // Using the getFiltered function which processes all CRUD parameters, including sorting and filtering
  return getFiltered({
    model: models.forexSignal,
    query,
    sortField: query.sortField || "createdAt",
    // Assuming deletedAt should not be shown
  });
};
