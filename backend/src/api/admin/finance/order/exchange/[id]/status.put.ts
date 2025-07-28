import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of an exchange order",
  operationId: "updateExchangeOrderStatus",
  tags: ["Admin", "Exchange Order"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the exchange order to update",
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
              type: "string",
              description: "New status to apply",
              enum: ["OPEN", "CLOSED", "CANCELLED", "PARTIALLY_FILLED"], // Assuming these are valid statuses for exchange orders
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Exchange Order"),
  requiresAuth: true,
  permission: "edit.exchange.order",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("exchangeOrder", id, status);
};
