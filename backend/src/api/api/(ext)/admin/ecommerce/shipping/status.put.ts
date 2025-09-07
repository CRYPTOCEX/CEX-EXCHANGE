// /server/api/ecommerce/Shipping/status.put.ts

import { models } from "@b/db";
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecommerce Shipping",
  operationId: "bulkUpdateEcommerceShippingtatus",
  tags: ["Admin", "Ecommerce Shipping"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecommerce shipping IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["PENDING", "TRANSIT", "DELIVERED", "CANCELLED"],
              description: "New status to apply to the ecommerce Shipping",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Shipping"),
  requiresAuth: true,
  permission: "edit.ecommerce.shipping",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;

  const Shipping = await models.ecommerceShipping.findAll({
    where: { id: ids },
  });

  if (!Shipping.length) {
    throw new Error("Shipping not found");
  }

  return updateStatus(
    "ecommerceShipping",
    ids,
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
};
