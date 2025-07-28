// /server/api/investment/index.get.ts

import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";
import {
  baseInvestmentPlanSchema,
  baseInvestmentSchema,
  baseUserSchema,
} from "./utils";
import { createError } from "@b/utils/error";
import { crudParameters, paginationSchema } from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "Lists all investments",
  description:
    "Fetches a comprehensive list of all investments made by users, including details of the investment plan and user information.",
  operationId: "listAllInvestments",
  tags: ["Finance", "Investment"],
  parameters: [
    ...crudParameters,
    {
      name: "type",
      in: "query",
      description: "The type of investment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Investments retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ...baseInvestmentSchema,
                    user: {
                      type: "object",
                      properties: baseUserSchema,
                    },
                    plan: {
                      type: "object",
                      properties: baseInvestmentPlanSchema,
                    },
                  },
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const { type, ...query } = data.query;
  if (type && !query.page) {
    return await getActiveInvestment(user.id, type);
  }

  let model, planModel, durationModel;
  switch (type?.toLowerCase()) {
    case "general":
      model = models.investment;
      planModel = models.investmentPlan;
      durationModel = models.investmentDuration;
      break;
    case "forex":
      model = models.forexInvestment;
      planModel = models.forexPlan;
      durationModel = models.forexDuration;
      break;
    default:
      throw createError({
        statusCode: 400,
        message: "Invalid investment type",
      });
  }

  return getFiltered({
    model,
    query,
    where: { userId: user.id },
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: planModel,
        as: "plan",
        attributes: ["id", "title", "image", "currency"],
      },
      {
        model: durationModel,
        as: "duration",
        attributes: ["id", "duration", "timeframe"],
      },
    ],
    numericFields: ["amount", "profit"],
  });
};

async function getActiveInvestment(userId, type) {
  let model, durationModel;
  switch (type.toLowerCase()) {
    case "general":
      model = models.investment;
      durationModel = models.investmentDuration;
      break;
    case "forex":
      model = models.forexInvestment;
      durationModel = models.forexDuration;
      break;
  }

  const response = await model.findOne({
    where: { userId, status: "ACTIVE" },
    include: [
      {
        model: durationModel,
        as: "duration",
      },
    ],
    attributes: { exclude: ["userId"] },
  });

  if (!response) {
    throw new Error("No active investment found");
  }

  return response.get({ plain: true });
}
