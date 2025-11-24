import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseAIInvestmentDurationSchema } from "../utils";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific AI Investment Duration by ID",
  operationId: "getAIInvestmentDurationById",
  tags: ["Admin", "AI Investment Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Investment Duration to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "AI Investment Duration details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseAIInvestmentDurationSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Investment Duration"),
    500: serverErrorResponse,
  },
  permission: "view.ai.investment.duration",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("aiInvestmentDuration", params.id);
};
