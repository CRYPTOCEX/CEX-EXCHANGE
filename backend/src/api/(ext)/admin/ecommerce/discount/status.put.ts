import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecommerce discounts",
  operationId: "bulkUpdateEcommerceDiscountStatus",
  description:
    "Updates the active/inactive status of multiple ecommerce discounts simultaneously. This allows enabling or disabling multiple discount codes in a single operation. Inactive discounts cannot be used by customers during checkout.",
  tags: ["Admin", "Ecommerce", "Discount"],
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
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk update discount status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Validating ${ids.length} discount IDs`);
  ctx?.step(`Updating status to ${status} for ${ids.length} discounts`);

  const result = await updateStatus("ecommerceDiscount", ids, status);

  ctx?.success(`Successfully updated status for ${ids.length} discounts`);
  return result;
};
