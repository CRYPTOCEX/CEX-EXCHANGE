import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Track an ecommerce order",
  description: "Retrieves tracking information for a specific order including shipping status and timeline.",
  operationId: "trackEcommerceOrder",
  tags: ["Ecommerce", "Orders"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Order ID to track",
    },
  ],
  responses: {
    200: {
      description: "Order tracking information retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              orderId: { type: "string" },
              status: { type: "string" },
              shipping: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  loadId: { type: "string" },
                  loadStatus: { type: "string" },
                  shipper: { type: "string" },
                  transporter: { type: "string" },
                  vehicle: { type: "string" },
                  trackingNumber: { type: "string" },
                },
              },
              timeline: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    timestamp: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Order"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  const order = await models.ecommerceOrder.findOne({
    where: { id, userId: user.id },
    include: [
      {
        model: models.ecommerceShipping,
        as: "shipping",
        attributes: [
          "id",
          "loadId", 
          "loadStatus",
          "shipper",
          "transporter",
          "vehicle",
          "createdAt",
          "updatedAt",
        ],
      },
      {
        model: models.ecommerceProduct,
        as: "products",
        attributes: ["id", "name", "type"],
        through: {
          attributes: ["quantity"],
        },
      },
    ],
  });

  if (!order) {
    throw createError({ statusCode: 404, message: "Order not found" });
  }

  const orderData = order.get({ plain: true }) as any;

  // Generate tracking timeline based on order and shipping status
  const timeline: Array<{
    status: string;
    timestamp: string | Date;
    description: string;
  }> = [];
  
  // Order placed
  timeline.push({
    status: "ORDER_PLACED",
    timestamp: orderData.createdAt,
    description: "Order has been placed successfully",
  });

  if (orderData.status !== "PENDING") {
    timeline.push({
      status: "ORDER_CONFIRMED",
      timestamp: orderData.updatedAt,
      description: "Order has been confirmed and is being processed",
    });
  }

  // Add shipping timeline if shipping exists
  if (orderData.shipping) {
    const shipping = orderData.shipping;
    
    if (shipping.loadStatus === "TRANSIT") {
      timeline.push({
        status: "IN_TRANSIT",
        timestamp: shipping.updatedAt,
        description: `Package is in transit with ${shipping.transporter}`,
      });
    }
    
    if (shipping.loadStatus === "DELIVERED") {
      timeline.push({
        status: "DELIVERED",
        timestamp: shipping.updatedAt,
        description: "Package has been delivered successfully",
      });
    }
    
    if (shipping.loadStatus === "CANCELLED") {
      timeline.push({
        status: "CANCELLED",
        timestamp: shipping.updatedAt,
        description: "Shipment has been cancelled",
      });
    }
  }

  return {
    orderId: orderData.id,
    status: orderData.status,
    shipping: orderData.shipping,
    timeline: timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  };
}; 