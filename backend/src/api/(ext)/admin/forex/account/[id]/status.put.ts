import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates Forex account status",
  operationId: "updateForexAccountStatus",
  tags: ["Admin", "Forex", "Account"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex account to update",
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
  responses: updateRecordResponses("Forex Account"),
  requiresAuth: true,
  permission: "edit.forex.account",
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex account status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Validating forex account ${id}`);

  ctx?.step(`Updating forex account status to ${status ? "active" : "inactive"}`);
  const result = await updateStatus("forexAccount", id, status);

  ctx?.success("Forex account status updated successfully");
  return result;
};
