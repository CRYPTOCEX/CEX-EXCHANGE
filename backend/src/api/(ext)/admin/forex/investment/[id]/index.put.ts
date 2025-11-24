import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexInvestmentUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific Forex Investment",
  operationId: "updateForexInvestment",
  tags: ["Admin", "Forex Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Forex Investment to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Forex Investment",
    content: {
      "application/json": {
        schema: forexInvestmentUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Forex Investment"),
  requiresAuth: true,
  permission: "edit.forex.investment",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const {
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
  } = body;

  return await updateRecord("forexInvestment", id, {
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
  });
};
