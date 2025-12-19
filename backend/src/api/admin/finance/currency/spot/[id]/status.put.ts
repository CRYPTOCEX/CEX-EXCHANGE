// /server/api/admin/exchange/currencies/[id]/status.put.ts

import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of an exchange currency",
  operationId: "updateExchangeCurrencyStatus",
  tags: ["Admin", "Exchange Currencies"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the exchange currency to update",
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
  responses: updateRecordResponses("Exchange Currency"),
  requiresAuth: true,
  permission: "edit.spot.currency",
  logModule: "ADMIN_FIN",
  logTitle: "Update spot currency status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Fetching spot currency record");
  ctx?.step("Updating spot currency status");
  const result = await updateStatus("exchangeCurrency", id, status);

  ctx?.success("Spot currency status updated successfully");
  return result;
};
