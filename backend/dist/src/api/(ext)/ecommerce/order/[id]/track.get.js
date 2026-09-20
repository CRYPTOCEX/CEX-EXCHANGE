"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Track an ecommerce order",
    description: "Retrieves tracking information for a specific order including shipping status and timeline.",
    operationId: "trackEcommerceOrder",
    tags: ["Ecommerce", "Orders"],
    logModule: "ECOM",
    logTitle: "Track Order",
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
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing request");
    const order = await db_1.models.ecommerceOrder.findOne({
        where: { id, userId: user.id },
        include: [
            {
                model: db_1.models.ecommerceShipping,
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
                model: db_1.models.ecommerceProduct,
                as: "products",
                attributes: ["id", "name", "type"],
                through: {
                    attributes: ["quantity"],
                },
            },
        ],
    });
    if (!order) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
    }
    const orderData = order.get({ plain: true });
    const timeline = [];
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved tracking information for order ${id}`);
    return {
        orderId: orderData.id,
        status: orderData.status,
        shipping: orderData.shipping,
        timeline: timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    };
};
