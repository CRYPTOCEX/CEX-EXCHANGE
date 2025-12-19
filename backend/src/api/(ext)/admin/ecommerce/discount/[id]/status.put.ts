import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of a specific ecommerce discount",
  operationId: "updateEcommerceDiscountStatusById",
  description:
    "Toggles the active/inactive status of a single ecommerce discount. When set to inactive, the discount code cannot be used by customers during checkout. This is useful for temporarily disabling discounts without deleting them.",
  tags: ["Admin", "Ecommerce", "Discount"],
  parameters: [
    {
      index: 0, // Ensuring the parameter index is specified as requested
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecommerce discount to update",
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
                "New status to apply to the ecommerce discount (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("E-commerce Discount"),
  requiresAuth: true,
  permission: "edit.ecommerce.discount",
  logModule: "ADMIN_ECOM",
  logTitle: "Update discount status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating status data");
  ctx?.step(`Updating discount status: ${id} to ${status}`);

  const result = await updateStatus("ecommerceDiscount", id, status);

  ctx?.success("Discount status updated successfully");
  return result;
};
