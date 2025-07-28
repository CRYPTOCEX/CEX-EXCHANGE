import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseAIInvestmentSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific AI Investment by ID",
  operationId: "getAIInvestmentById",
  tags: ["Admin", "AI Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Investment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "AI Investment details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseAIInvestmentSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment"),
    500: serverErrorResponse,
  },
  permission: "view.ai.investment",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("aiInvestment", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
    {
      model: models.aiInvestmentPlan,
      as: "plan",
      attributes: ["title", "image"],
    },
    {
      model: models.aiInvestmentDuration,
      as: "duration",
      attributes: ["duration", "timeframe"],
    },
  ]);
};
