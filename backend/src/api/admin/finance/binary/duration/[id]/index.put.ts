import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { BinaryDurationUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific binary duration",
  operationId: "updateBinaryDuration",
  tags: ["Admin", "Binary", "Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the binary duration to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the binary duration",
    content: {
      "application/json": {
        schema: BinaryDurationUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Binary Duration"),
  requiresAuth: true,
  permission: "edit.binary.duration",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { duration, profitPercentage, status } = body;

  return await updateRecord("binaryDuration", id, {
    duration,
    profitPercentage,
    status,
  });
};