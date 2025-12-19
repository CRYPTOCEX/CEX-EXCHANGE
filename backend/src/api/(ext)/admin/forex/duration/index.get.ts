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
  summary: "Lists all Forex durations",
  description: "Retrieves a paginated list of all Forex durations with optional filtering and sorting. Durations define the time periods available for Forex investments.",
  operationId: "listForexDurations",
  tags: ["Admin", "Forex", "Duration"],
  parameters: crudParameters,
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Durations",
  responses: {
    200: {
      description: "List of Forex Durations with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
  const { query, ctx } = data;

  ctx?.step("Fetching forex durations");
  const result = await getFiltered({
    model: models.forexDuration,
    query,
    sortField: query.sortField || "duration",
    timestamps: false,
    numericFields: ["duration"],
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} forex durations`);
  return result;
};
