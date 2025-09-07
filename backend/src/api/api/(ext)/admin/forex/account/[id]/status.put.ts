import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of a Forex Account",
  operationId: "updateForexAccountStatus",
  tags: ["Admin", "Forex Accounts"],
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
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("forexAccount", id, status);
};
