import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Payment Intents by IDs",
  operationId: "bulkDeletePaymentIntents",
  tags: ["Admin", "Payment"],
  parameters: commonBulkDeleteParams("Payment Intents"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of Payment Intent IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Payment Intents"),
  requiresAuth: true,
  permission: "delete.payment.intent",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;

  return handleBulkDelete({
    model: "paymentIntent",
    ids,
    query,
  });
};
