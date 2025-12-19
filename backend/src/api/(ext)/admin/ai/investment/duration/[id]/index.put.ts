import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { aiInvestmentDurationUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Update an AI investment duration",
  operationId: "updateAiInvestmentDuration",
  tags: ["Admin", "AI Investment", "Duration"],
  description:
    "Updates a specific AI investment duration by ID. Allows modification of the duration value and timeframe type.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the AI Investment Duration to update",
      required: true,
      schema: {
        type: "string",
        format: "uuid",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated duration data",
    content: {
      "application/json": {
        schema: aiInvestmentDurationUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("AI Investment Duration"),
  requiresAuth: true,
  permission: "edit.ai.investment.duration",
  logModule: "ADMIN_AI",
  logTitle: "Update investment duration",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { duration, timeframe } = body;

  ctx?.step(`Updating duration ${id}`);
  const result = await updateRecord("aiInvestmentDuration", id, {
    duration,
    timeframe,
  });

  ctx?.success("Duration updated successfully");
  return result;
};
