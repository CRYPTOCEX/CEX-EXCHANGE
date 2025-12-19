import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { investmentUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Investment",
  operationId: "updateInvestment",
  tags: ["Admin", "Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Investment to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Investment",
    content: {
      "application/json": {
        schema: investmentUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Investment"),
  requiresAuth: true,
  permission: "edit.investment",
  logModule: "ADMIN_FIN",
  logTitle: "Update Investment History",
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

  ctx?.step("Validating investment data");

  ctx?.step("Updating investment record");
  const record = await updateRecord("investment", id, {
    userId,
    planId,
    durationId,
    amount,
    profit,
    result,
    status,
    endDate,
  });

  ctx?.success();
  return record
};
