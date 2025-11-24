import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseAIInvestmentPlanSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific AI Investment Plan by ID",
  operationId: "getAIInvestmentPlanById",
  tags: ["Admin", "AI Investment Plans"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Investment Plan to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "AI Investment Plan details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseAIInvestmentPlanSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment Plan"),
    500: serverErrorResponse,
  },
  permission: "view.ai.investment.plan",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("aiInvestmentPlan", params.id, [
    {
      model: models.aiInvestment,
      as: "investments",
      attributes: ["id", "amount", "profit", "status"],
    },
    {
      model: models.aiInvestmentDuration,
      as: "durations",
      through: { attributes: [] },
      attributes: ["id", "duration", "timeframe"],
    },
  ]);
};
