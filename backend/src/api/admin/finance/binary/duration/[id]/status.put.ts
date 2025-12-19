import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Update Status for a Binary Duration",
  operationId: "updateBinaryDurationStatus",
  tags: ["Admin", "Binary Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Binary Duration to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply to the Binary Duration (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Binary Duration"),
  requiresAuth: true,
  permission: "edit.binary.duration",
  logModule: "ADMIN_BINARY",
  logTitle: "Update binary duration status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Fetching binary duration record");
  ctx?.step("Updating binary duration status");
  const result = await updateStatus("binaryDuration", id, status);

  ctx?.success("Binary duration status updated successfully");
  return result;
};