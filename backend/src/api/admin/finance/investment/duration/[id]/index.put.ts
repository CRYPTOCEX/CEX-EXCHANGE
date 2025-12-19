import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { investmentDurationUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Investment Duration",
  operationId: "updateInvestmentDuration",
  tags: ["Admin", "Investment Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Investment Duration to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Investment Duration",
    content: {
      "application/json": {
        schema: investmentDurationUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Investment Duration"),
  requiresAuth: true,
  permission: "edit.investment.duration",
  logModule: "ADMIN_FIN",
  logTitle: "Update Investment Duration",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { duration, timeframe } = body;

  ctx?.step("Validating investment duration data");

  ctx?.step("Updating investment duration record");
  const result = await updateRecord("investmentDuration", id, {
    duration,
    timeframe,
  });

  ctx?.success();
  return result
};
