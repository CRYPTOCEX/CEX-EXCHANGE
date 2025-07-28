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
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("exchangeCurrency", ids, status);
};
