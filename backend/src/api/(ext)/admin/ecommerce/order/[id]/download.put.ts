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
  logModule: "ADMIN_ECOM",
  logTitle: "Add order download details",
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
  const { body, ctx } = data;
  const { orderItemId, key, filePath, instructions } = body;

  ctx?.step("Validating order item ID");
  const transaction = await sequelize.transaction();

  try {
    ctx?.step(`Finding order item: ${orderItemId}`);
    const orderItem = await models.ecommerceOrderItem.findByPk(orderItemId);
    if (!orderItem) {
      throw createError({ statusCode: 404, message: "Order item not found" });
    }

    ctx?.step("Updating download details");
    await orderItem.update({ key, filePath, instructions }, { transaction });

    await transaction.commit();
    ctx?.success("Download details added/updated successfully");
    return { message: "Download details added/updated successfully" };
  } catch (error) {
    ctx?.fail("Failed to update download details");
    await transaction.rollback();
    throw createError({ statusCode: 500, message: error.message });
  }
};
