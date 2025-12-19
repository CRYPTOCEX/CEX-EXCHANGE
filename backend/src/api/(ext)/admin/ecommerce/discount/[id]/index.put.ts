import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { discountUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce discount by ID",
  operationId: "updateEcommerceDiscountById",
  description:
    "Updates an existing ecommerce discount's properties including code, percentage, validity date, product association, and status. All fields are required. The discount code must remain unique and the percentage must be between 0 and 100.",
  tags: ["Admin", "Ecommerce", "Discount"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce discount to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated discount data",
    content: {
      "application/json": {
        schema: discountUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Discount"),
  requiresAuth: true,
  permission: "edit.ecommerce.discount",
  logModule: "ADMIN_ECOM",
  logTitle: "Update discount",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { code, percentage, validUntil, productId, status } = body;

  ctx?.step("Validating discount data");
  ctx?.step(`Updating discount: ${id}`);

  const result = await updateRecord("ecommerceDiscount", id, {
    code,
    percentage,
    validUntil,
    productId,
    status,
  });

  ctx?.success("Discount updated successfully");
  return result;
};
