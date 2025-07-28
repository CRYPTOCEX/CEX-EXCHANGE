import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseInvestmentPlanSchema } from "../utils";
import { models } from "@b/db";

export const metadata = {
  summary: "Retrieves detailed information of a specific investment plan by ID",
  operationId: "getInvestmentPlanById",
  tags: ["Admin", "Investment Plans"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the investment plan to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Investment plan details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseInvestmentPlanSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment Plan"),
    500: serverErrorResponse,
  },
  permission: "view.investment.plan",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("investmentPlan", params.id, [
    {
      model: models.investmentDuration,
      as: "durations",
      through: { attributes: [] },
      attributes: ["id", "duration", "timeframe"],
    },
  ]);
};
