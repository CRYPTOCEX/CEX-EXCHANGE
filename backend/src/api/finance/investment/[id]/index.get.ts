// /server/api/investment/show.get.ts

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  baseInvestmentPlanSchema,
  baseInvestmentSchema,
  baseUserSchema,
} from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a single investment by UUID",
  description:
    "Fetches detailed information about a specific investment identified by its UUID, including associated plan and user details.",
  operationId: "getInvestment",
  tags: ["Finance", "Investment"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The Id of the investment to retrieve",
      schema: { type: "string" },
    },
    {
      name: "type",
      in: "query",
      description: "The type of investment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Investment retrieved successfully",
      content: {
        "application/json": {
          schema: {
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
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params, query } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });
  const { id } = params;
  const { type } = query;

  if (!type || typeof type !== "string") {
    throw new Error("Invalid investment type");
  }
  let model, planModel, durationModel;
  switch (type.toLowerCase()) {
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
  }

  const response = await model.findOne({
    where: { id, userId: user.id },
    include: [
      {
        model: planModel,
        as: "plan",
      },
      {
        model: durationModel,
        as: "duration",
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  if (!response) {
    throw new Error("Investment not found");
  }

  return response.get({ plain: true });
};
