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
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { duration, timeframe } = body;

  return await updateRecord("investmentDuration", id, {
    duration,
    timeframe,
  });
};
