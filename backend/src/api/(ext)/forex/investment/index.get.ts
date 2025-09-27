import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { forexInvestmentSchema } from "../../admin/forex/investment/utils";

export const metadata: OperationObject = {
  summary: "Lists user's Forex Investments with pagination and optional filtering",
  operationId: "listUserForexInvestments",
  tags: ["Forex", "Investments"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of user's Forex Investments with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
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
};

export default async (data: Handler) => {
  const { query, user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  return getFiltered({
    model: models.forexInvestment,
    query,
    where: { userId: user.id },
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.forexPlan,
        as: "plan",
        attributes: [
          "id",
          "name",
          "title",
          "description",
          "profitPercentage",
          "image",
        ],
      },
      {
        model: models.forexDuration,
        as: "duration",
        attributes: ["id", "duration", "timeframe"],
      },
    ],
    numericFields: ["amount", "profit"],
  });
};
