// /server/api/admin/currencies/[id]/status.put.ts

import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a fiat currency",
  operationId: "updateFiatCurrencyStatus",
  tags: ["Admin", "Currencies"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the currency to update",
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
  responses: updateRecordResponses("Fiat Currency"),
  requiresAuth: true,
  permission: "edit.fiat.currency",
  logModule: "ADMIN_FIN",
  logTitle: "Update fiat currency status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Fetching fiat currency record");
  ctx?.step("Updating fiat currency status");
  const result = await updateStatus("currency", id, status);

  ctx?.success("Fiat currency status updated successfully");
  return result;
};
