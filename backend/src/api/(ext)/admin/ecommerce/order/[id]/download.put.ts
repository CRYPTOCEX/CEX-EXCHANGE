import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Adds download details to an order item",
  description:
    "Adds or updates the download details for a specific order item.",
  operationId: "addDownloadDetails",
  tags: ["Admin", "Ecommerce Orders"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            orderItemId: { type: "string", description: "Order Item ID" },
            key: { type: "string", description: "License Key", nullable: true },
            filePath: {
              type: "string",
              description: "Download File Path",
              nullable: true,
            },
            instructions: {
              type: "string",
              description: "Instructions for the download",
              nullable: true,
            },
          },
          required: ["orderItemId"],
        },
      },
    },
  },
  responses: createRecordResponses("Order Item"),
  permission: "view.ecommerce.order",
};

export default async (data: Handler) => {
  const { body } = data;
  const { orderItemId, key, filePath, instructions } = body;

  const transaction = await sequelize.transaction();

  try {
    const orderItem = await models.ecommerceOrderItem.findByPk(orderItemId);
    if (!orderItem) {
      throw createError({ statusCode: 404, message: "Order item not found" });
    }

    await orderItem.update({ key, filePath, instructions }, { transaction });

    await transaction.commit();
    return { message: "Download details added/updated successfully" };
  } catch (error) {
    await transaction.rollback();
    throw createError({ statusCode: 500, message: error.message });
  }
};
