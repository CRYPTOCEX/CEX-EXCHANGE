// /server/api/ecommerce/Shipping/[id]/status.put.ts

import { models } from "@b/db";
import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of an E-commerce Shipping",
  operationId: "updateEcommerceShippingtatus",
  tags: ["Admin", "Ecommerce Shipping"],
  parameters: [
    {
      index: 0, // Ensuring the parameter index is specified as requested
      name: "id",
      in: "path",
      required: true,
      description: "ID of the E-commerce shipping to update",
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
              enum: ["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
              description: "New status to apply",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("E-commerce Shipping"),
  requiresAuth: true,
  permission: "edit.ecommerce.shipping",
  logModule: "ADMIN_ECOM",
  logTitle: "Update E-commerce Shipping Status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating shipping record");
  const shipping = await models.ecommerceShipping.findByPk(id);
  if (!shipping) {
    throw new Error("Shipping record not found");
  }

  ctx?.step("Updating E-commerce shipping status");
  const result = await updateStatus(
    "ecommerceShipping",
    id,
    status,
    "loadStatus",
    "Shipping",
    async () => {
      try {
        // Add any additional operations to be performed after status update
      } catch (error) {
        console.error(
          "Failed to perform post status update operations:",
          error
        );
      }
    }
  );

  ctx?.success("Successfully updated E-commerce shipping status");
  return result;
};
