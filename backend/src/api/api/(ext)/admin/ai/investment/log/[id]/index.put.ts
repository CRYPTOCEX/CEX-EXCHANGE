import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { aiInvestmentUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific AI Investment",
  operationId: "updateAiInvestment",
  tags: ["Admin", "AI Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the AI Investment to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the AI Investment",
    content: {
      "application/json": {
        schema: aiInvestmentUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("AI Investment"),
  requiresAuth: true,
  permission: "edit.ai.investment",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { userId, planId, durationId, symbol, amount, profit, result, status } =
    body;

  return await updateRecord("aiInvestment", id, {
    userId,
    planId,
    durationId,
    symbol,
    amount,
    profit,
    result,
    status,
  });
};
