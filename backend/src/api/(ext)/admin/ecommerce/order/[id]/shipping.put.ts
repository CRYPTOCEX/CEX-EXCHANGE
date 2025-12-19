import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Adds a shipping address to an order",
  description: "Adds or updates the shipping address for a specific order.",
  operationId: "addShippingAddress",
  tags: ["Admin", "Ecommerce Orders"],
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Add shipping address",
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
  const { body, params, ctx } = data;
  const { id } = params;
  const { shippingAddress } = body;

  ctx?.step("Validating order ID");
  const transaction = await sequelize.transaction();

  try {
    ctx?.step(`Finding order: ${id}`);
    const order = await models.ecommerceOrder.findByPk(id);
    if (!order) {
      throw createError({ statusCode: 404, message: "Order not found" });
    }

    ctx?.step("Checking for existing shipping address");
    const existingAddress = await models.ecommerceShippingAddress.findOne({
      where: { orderId: id },
    });

    if (existingAddress) {
      ctx?.step("Updating existing shipping address");
      await existingAddress.update(shippingAddress, { transaction });
    } else {
      ctx?.step("Creating new shipping address");
      await models.ecommerceShippingAddress.create(
        { orderId: id, ...shippingAddress },
        { transaction }
      );
    }

    await transaction.commit();
    ctx?.success("Shipping address added/updated successfully");
    return { message: "Shipping address added/updated successfully" };
  } catch (error) {
    ctx?.fail("Failed to add/update shipping address");
    await transaction.rollback();
    throw createError({ statusCode: 500, message: error.message });
  }
};
