import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of exchange currencies",
  operationId: "bulkUpdateExchangeCurrencyStatus",
  tags: ["Admin", "Exchange Currencies"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of exchange currency IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the exchange currencies (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("ExchangeCurrency"),
  requiresAuth: true,
  permission: "edit.spot.currency",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk update spot currency status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} spot currency(ies)`);
  const result = await updateStatus("exchangeCurrency", ids, status);

  ctx?.success("Spot currency status updated successfully");
  return result;
};
