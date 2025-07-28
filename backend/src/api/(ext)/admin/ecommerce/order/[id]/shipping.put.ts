import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Adds a shipping address to an order",
  description: "Adds or updates the shipping address for a specific order.",
  operationId: "addShippingAddress",
  tags: ["Admin", "Ecommerce Orders"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      in: "path",
      name: "id",
      required: true,
      description: "Order ID",
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
            shippingAddress: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                street: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                postalCode: { type: "string" },
                country: { type: "string" },
              },
              required: [
                "name",
                "email",
                "phone",
                "street",
                "city",
                "state",
                "postalCode",
                "country",
              ],
            },
          },
          required: ["shippingAddress"],
        },
      },
    },
  },
  responses: createRecordResponses("Shipping Address"),
  permission: "edit.ecommerce.order",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { shippingAddress } = body;

  const transaction = await sequelize.transaction();

  try {
    const order = await models.ecommerceOrder.findByPk(id);
    if (!order) {
      throw createError({ statusCode: 404, message: "Order not found" });
    }

    const existingAddress = await models.ecommerceShippingAddress.findOne({
      where: { orderId: id },
    });

    if (existingAddress) {
      await existingAddress.update(shippingAddress, { transaction });
    } else {
      await models.ecommerceShippingAddress.create(
        { orderId: id, ...shippingAddress },
        { transaction }
      );
    }

    await transaction.commit();
    return { message: "Shipping address added/updated successfully" };
  } catch (error) {
    await transaction.rollback();
    throw createError({ statusCode: 500, message: error.message });
  }
};
