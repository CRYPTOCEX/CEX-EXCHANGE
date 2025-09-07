import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Fetch ICO Launch Plans",
  description: "Retrieves all available ICO launch plans.",
  operationId: "getIcoLaunchPlans",
  tags: ["ICO", "Launch Plans"],
  responses: {
    200: {
      description: "ICO launch plans fetched successfully.",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                currency: { type: "string" },
                walletType: { type: "string" },
                features: { type: "object" },
                recommended: { type: "boolean" },
                status: { type: "boolean" },
                sortOrder: { type: "number" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  try {
    const plans = await models.icoLaunchPlan.findAll({
      where: { status: true },
    });
    return plans;
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message });
  }
};
