// /server/api/investment/user.get.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  baseInvestmentPlanSchema,
  baseInvestmentSchema,
  baseUserSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves investments for the logged-in user",
  description:
    "Fetches all active investments associated with the currently authenticated user, including details about the investment plan and user information.",
  operationId: "getUserInvestments",
  tags: ["Finance", "Investment"],
  responses: {
    200: {
      description: "Investments retrieved successfully",
      content: {
        "application/json": {
          schema: {
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
  if (!data.user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });
  return getUserInvestment(data.user.id);
};

export async function getUserInvestment(
  userId: string
): Promise<investmentAttributes[] | null> {
  const response = await models.investment.findAll({
    where: {
      userId: userId,
      status: "ACTIVE",
    },
    include: [
      {
        model: models.investmentPlan,
        as: "plan",
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  if (!response || response.length === 0) {
    throw new Error("No active investments found");
  }

  return response.map(inv => inv.get({ plain: true })) as unknown as investmentAttributes[];
}
