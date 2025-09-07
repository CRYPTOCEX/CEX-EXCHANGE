import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecommerce discounts",
  operationId: "bulkUpdateEcommerceDiscountStatus",
  tags: ["Admin", "Ecommerce Discounts"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecommerce discount IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecommerce discounts (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Discount"),
  requiresAuth: true,
  permission: "edit.ecommerce.discount",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("ecommerceDiscount", ids, status);
};
