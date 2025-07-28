import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Assigns a shipment to an order",
  description: "Assigns a specific shipment to an order.",
  operationId: "assignShipmentToOrder",
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
            shipmentId: { type: "string", description: "Shipment ID" },
          },
          required: ["shipmentId"],
        },
      },
    },
  },
  responses: createRecordResponses("Shipment Assignment"),
  permission: "edit.ecommerce.order",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { shipmentId } = body;

  const transaction = await sequelize.transaction();

  try {
    const order = await models.ecommerceOrder.findByPk(id);
    if (!order) {
      throw createError({ statusCode: 404, message: "Order not found" });
    }

    const shipment = await models.ecommerceShipping.findByPk(shipmentId);
    if (!shipment) {
      throw createError({ statusCode: 404, message: "Shipment not found" });
    }

    await order.update({ shippingId: shipmentId }, { transaction });

    await transaction.commit();
    return { message: "Shipment assigned to order successfully" };
  } catch (error) {
    await transaction.rollback();
    throw createError({ statusCode: 500, message: error.message });
  }
};
