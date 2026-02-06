"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates the status of an E-commerce Order",
    operationId: "updateEcommerceOrderStatus",
    tags: ["Admin", "Ecommerce Orders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the E-commerce order to update",
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
                        status: {
                            type: "string",
                            enum: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("E-commerce Order"),
    requiresAuth: true,
    permission: "edit.ecommerce.order",
    logModule: "ADMIN_ECOM",
    logTitle: "Update order status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding order: ${id}`);
    const order = await db_1.models.ecommerceOrder.findByPk(id);
    if (!order) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating current order status");
    if (order.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Order status is not PENDING" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding related transaction");
    const transaction = await db_1.models.transaction.findOne({
        where: { referenceId: order.id },
    });
    if (!transaction) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding wallet");
    const wallet = await db_1.models.wallet.findByPk(transaction.walletId);
    if (!wallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating order status to ${status}`);
    await db_1.sequelize.transaction(async (t) => {
        order.status = status;
        await order.save({ transaction: t });
        if (status === "CANCELLED" || status === "REJECTED") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding order amount via wallet service");
            const idempotencyKey = `ecom_order_refund_${id}`;
            await wallet_1.walletService.credit({
                idempotencyKey,
                userId: order.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount: transaction.amount,
                operationType: "REFUND",
                referenceId: order.id,
                description: `Refund for ${status.toLowerCase()} order ${order.id}`,
                metadata: {
                    orderId: order.id,
                    transactionId: transaction.id,
                    status,
                },
                transaction: t,
            });
        }
        return order;
    });
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending status update email");
        const user = await db_1.models.user.findByPk(order.userId);
        await (0, utils_1.sendOrderStatusUpdateEmail)(user, order, status, ctx);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Order status updated and email sent");
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Order status updated but email failed");
        console.error("Failed to send order status update email:", error);
    }
};
