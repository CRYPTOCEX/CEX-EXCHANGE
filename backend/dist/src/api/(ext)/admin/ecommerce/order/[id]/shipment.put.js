"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
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
    responses: (0, query_1.createRecordResponses)("Shipment Assignment"),
    permission: "edit.ecommerce.order",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { shipmentId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order and shipment IDs");
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding order: ${id}`);
        const order = await db_1.models.ecommerceOrder.findByPk(id);
        if (!order) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding shipment: ${shipmentId}`);
        const shipment = await db_1.models.ecommerceShipping.findByPk(shipmentId);
        if (!shipment) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Shipment not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Assigning shipment to order");
        await order.update({ shippingId: shipmentId }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Shipment assigned to order successfully");
        return { message: "Shipment assigned to order successfully" };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to assign shipment");
        await transaction.rollback();
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
