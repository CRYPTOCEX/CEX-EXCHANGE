import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of exchange orders",
  operationId: "bulkUpdateExchangeOrderStatus",
  tags: ["Admin", "Exchange Orders"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of exchange order IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              description: "New status to apply to the exchange orders",
              enum: ["OPEN", "CLOSED", "CANCELLED"],
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Exchange Order"),
  requiresAuth: true,
  permission: "edit.exchange.order",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("exchangeOrder", ids, status);
};
