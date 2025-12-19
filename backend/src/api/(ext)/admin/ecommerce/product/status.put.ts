import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecommerce products",
  operationId: "bulkUpdateEcommerceProductStatus",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Updates the active/inactive status for multiple ecommerce products at once. Use this to enable or disable products from being displayed or purchased.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecommerce product IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description: "New status to apply to the ecommerce products (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Product"),
  requiresAuth: true,
  permission: "edit.ecommerce.product",
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk Update Ecommerce Product Status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Updating E-commerce product status");
  const result = await updateStatus("ecommerceProduct", ids, status);

  ctx?.success("Successfully updated E-commerce product status");
  return result;
};
