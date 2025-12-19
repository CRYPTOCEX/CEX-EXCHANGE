import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Update Status for a Binary Market",
  operationId: "updateBinaryMarketStatus",
  tags: ["Admin", "Binary Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Binary Market to update",
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
                "New status to apply to the Binary Market (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Binary Market"),
  requiresAuth: true,
  permission: "edit.binary.market",
  logModule: "ADMIN_BINARY",
  logTitle: "Update binary market status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Fetching binary market record");
  ctx?.step("Updating binary market status");
  const result = await updateStatus("binaryMarket", id, status);

  ctx?.success("Binary market status updated successfully");
  return result;
};