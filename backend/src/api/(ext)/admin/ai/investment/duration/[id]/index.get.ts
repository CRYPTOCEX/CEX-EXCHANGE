import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseAIInvestmentDurationSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Get an AI investment duration by ID",
  operationId: "getAiInvestmentDurationById",
  tags: ["Admin", "AI Investment", "Duration"],
  description:
    "Retrieves detailed information of a specific AI investment duration by its ID. Returns the duration value and timeframe type.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Investment Duration to retrieve",
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "AI Investment Duration details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseAIInvestmentDurationSchema,
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
  logModule: "ADMIN_AI",
  logTitle: "Get investment duration",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step(`Fetching duration ${params.id}`);
  const result = await getRecord("aiInvestmentDuration", params.id);

  ctx?.success("Duration retrieved");
  return result;
};
