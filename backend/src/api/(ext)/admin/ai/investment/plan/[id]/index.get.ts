import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseAIInvestmentPlanSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a specific AI Investment Plan",
  operationId: "getAiInvestmentPlanById",
  tags: ["Admin", "AI Investment", "Plan"],
  description:
    "Fetches detailed information for a specific AI Investment Plan including all associated investments and available durations. Returns comprehensive plan data with profit ranges, investment limits, and trending status.",
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
      description: "AI Investment Plan details with associated investments and durations",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseAIInvestmentPlanSchema,
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
  logModule: "ADMIN_AI",
  logTitle: "Get investment plan",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step(`Fetching plan ${params.id}`);
  const result = await getRecord("aiInvestmentPlan", params.id, [
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

  ctx?.success("Plan retrieved");
  return result;
};
