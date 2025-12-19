import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexInvestmentUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a Forex investment",
  description: "Updates an existing Forex investment record by its ID. Can modify user, plan, duration, amount, profit, result, status, and end date.",
  operationId: "updateForexInvestment",
  tags: ["Admin", "Forex", "Investment"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex investment",
};

export default async (data) => {
  const { body, params, ctx } = data;
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

  ctx?.step("Validating forex investment data");

  ctx?.step(`Updating forex investment ${id}`);
  const investmentResult = await updateRecord("forexInvestment", id, {
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
  });

  ctx?.success("Forex investment updated successfully");
  return investmentResult;
};
