import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { aiInvestmentDurationUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific AI Investment Duration",
  operationId: "updateAiInvestmentDuration",
  tags: ["Admin", "AI Investment Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the AI Investment Duration to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the AI Investment Duration",
    content: {
      "application/json": {
        schema: aiInvestmentDurationUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("AI Investment Duration"),
  requiresAuth: true,
  permission: "edit.ai.investment.duration",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { duration, timeframe } = body;

  return await updateRecord("aiInvestmentDuration", id, {
    duration,
    timeframe,
  });
};
