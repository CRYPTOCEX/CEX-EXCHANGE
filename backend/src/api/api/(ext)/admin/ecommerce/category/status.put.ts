import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecommerce categories",
  operationId: "bulkUpdateEcommerceCategoryStatus",
  tags: ["Admin", "Ecommerce Categories"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecommerce category IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecommerce categories (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Category"),
  requiresAuth: true,
  permission: "edit.ecommerce.category",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("ecommerceCategory", ids, status);
};
