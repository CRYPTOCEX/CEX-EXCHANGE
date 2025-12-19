import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexDurationUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a Forex duration",
  description: "Updates an existing Forex duration configuration by its ID. Changes to duration values or timeframes will affect future investments.",
  operationId: "updateForexDuration",
  tags: ["Admin", "Forex", "Duration"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Forex Duration to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Forex Duration",
    content: {
      "application/json": {
        schema: forexDurationUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Forex Duration"),
  requiresAuth: true,
  permission: "edit.forex.duration",
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex duration",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { duration, timeframe } = body;

  ctx?.step("Validating forex duration data");

  ctx?.step(`Updating forex duration ${id}`);
  const result = await updateRecord("forexDuration", id, {
    duration,
    timeframe,
  });

  ctx?.success("Forex duration updated successfully");
  return result;
};
