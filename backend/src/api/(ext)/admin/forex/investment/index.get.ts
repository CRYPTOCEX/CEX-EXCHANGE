// /server/api/forex/investments/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { forexInvestmentSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all Forex investments",
  description: "Retrieves a paginated list of all Forex investments with filtering and sorting options. Includes user, plan, and duration details for each investment.",
  operationId: "listForexInvestments",
  tags: ["Admin", "Forex", "Investment"],
  parameters: crudParameters,
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Investments",
  responses: {
    200: {
      description: "List of Forex Investments with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: forexInvestmentSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Investments"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.forex.investment",
  demoMask: ["items.user.email"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching forex investments");
  const result = await getFiltered({
    model: models.forexInvestment,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.forexPlan,
        as: "plan",
        attributes: ["id", "title"],
      },
      {
        model: models.forexDuration,
        as: "duration",
        attributes: ["id", "duration", "timeframe"],
      },
    ],
    numericFields: ["amount", "profit"],
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} forex investments`);
  return result;
};
