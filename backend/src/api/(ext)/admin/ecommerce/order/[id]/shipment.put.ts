import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Assigns a shipment to an order",
  description: "Assigns a specific shipment to an order.",
  operationId: "assignShipmentToOrder",
  tags: ["Admin", "Ecommerce Orders"],
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Assign shipment to order",
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
  const { body, params, ctx } = data;
  const { id } = params;
  const { shipmentId } = body;

  ctx?.step("Validating order and shipment IDs");
  const transaction = await sequelize.transaction();

  try {
    ctx?.step(`Finding order: ${id}`);
    const order = await models.ecommerceOrder.findByPk(id);
    if (!order) {
      throw createError({ statusCode: 404, message: "Order not found" });
    }

    ctx?.step(`Finding shipment: ${shipmentId}`);
    const shipment = await models.ecommerceShipping.findByPk(shipmentId);
    if (!shipment) {
      throw createError({ statusCode: 404, message: "Shipment not found" });
    }

    ctx?.step("Assigning shipment to order");
    await order.update({ shippingId: shipmentId }, { transaction });

    await transaction.commit();
    ctx?.success("Shipment assigned to order successfully");
    return { message: "Shipment assigned to order successfully" };
  } catch (error) {
    ctx?.fail("Failed to assign shipment");
    await transaction.rollback();
    throw createError({ statusCode: 500, message: error.message });
  }
};
