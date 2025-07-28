import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexDurationUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific Forex Duration",
  operationId: "updateForexDuration",
  tags: ["Admin", "Forex Durations"],
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
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { duration, timeframe } = body;

  return await updateRecord("forexDuration", id, {
    duration,
    timeframe,
  });
};
