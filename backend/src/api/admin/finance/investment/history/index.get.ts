// /server/api/investment/investments/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { investmentSchema } from "./utils";

export const metadata = {
  summary: "Lists all Investments with pagination and optional filtering",
  operationId: "listInvestments",
  tags: ["Admin", "General", "Investments"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Investments with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: investmentSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investments"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.investment",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.investment,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.investmentPlan,
        as: "plan",
        attributes: ["id", "title"],
      },
      {
        model: models.investmentDuration,
        as: "duration",
        attributes: ["id", "duration", "timeframe"],
      },
    ],
    numericFields: ["amount", "profit"],
  });
};
