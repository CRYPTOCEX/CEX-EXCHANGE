// /server/api/investment/durations/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { investmentDurationSchema } from "./utils";

export const metadata = {
  summary: "Lists Investment Durations with pagination and optional filtering",
  operationId: "listInvestmentDurations",
  tags: ["Admin", "Investment", "Durations"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Investment Durations with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: investmentDurationSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment Durations"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.investment.duration",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.investmentDuration,
    query,
    sortField: query.sortField || "duration",
    timestamps: false,
    numericFields: ["duration"],
  });
};
