// /server/api/forex/durations/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { forexDurationSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists Forex Durations with pagination and optional filtering",
  operationId: "listForexDurations",
  tags: ["Admin", "Forex", "Durations"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Forex Durations with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: forexDurationSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Durations"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.forex.duration",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.forexDuration,
    query,
    sortField: query.sortField || "duration",
    timestamps: false,
    numericFields: ["duration"],
  });
};
