import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates a Forex signal status",
  description: "Updates the active/inactive status of a specific Forex signal. Active signals are available for user subscriptions.",
  operationId: "updateForexSignalStatus",
  tags: ["Admin", "Forex", "Signal"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex signal to update",
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
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Forex Signal"),
  requiresAuth: true,
  permission: "edit.forex.signal",
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex signal status",
};

export default async (data) => {
  const { body, params , ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Validating record ${id}`);

  ctx?.step("Updating status");
  const result = await updateStatus("forexSignal", id, status);

  ctx?.success("Status updated successfully");
  return result;
};
