import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of active investment plans",
  description:
    "This endpoint retrieves all active investment plans available for selection.",
  operationId: "getInvestmentPlans",
  tags: ["Investment", "Plan"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Investment plans retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("InvestmentPlan"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const investmentPlans = await models.investmentPlan.findAll({
      where: { status: true },
    });
    // Return an empty array if no active plans are found
    const formatted = investmentPlans.map((plan) => ({
      id: plan.id,
      name: plan.title,
    }));
    return formatted;
  } catch (error) {
    throw createError(500, "An error occurred while fetching investment plans");
  }
};
