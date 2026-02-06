"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates a specific ecommerce order",
    operationId: "updateEcommerceOrder",
    tags: ["Admin", "Ecommerce", "Orders"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce order to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the ecommerce order",
        content: {
            "application/json": {
                schema: utils_1.ecommerceOrderUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Order"),
    requiresAuth: true,
    permission: "edit.ecommerce.order",
    logModule: "ADMIN_ECOM",
    logTitle: "Update order",
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order status");
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating order and wallet");
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Order updated and email sent successfully");
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Order updated but failed to send email");
        console.error("Failed to send order status update email:", error);
    }
};
