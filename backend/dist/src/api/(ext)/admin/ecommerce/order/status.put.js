"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk updates the status of ecommerce orders",
    operationId: "bulkUpdateEcommerceOrderStatus",
    tags: ["Admin", "Ecommerce Orders"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of ecommerce order IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["PENDING", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply to the ecommerce orders",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Order"),
    requiresAuth: true,
    permission: "edit.ecommerce.order",
    logModule: "ADMIN_ECOM",
    logTitle: "Bulk update order status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding ${ids.length} orders`);
    const orders = await db_1.models.ecommerceOrder.findAll({
        where: { id: ids },
    });
    if (!orders.length) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Orders not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating order statuses and updating");
    await db_1.sequelize.transaction(async (t) => {
        for (const order of orders) {
            if (order.status !== "PENDING") {
                throw (0, error_1.createError)({ statusCode: 400, message: `Order ${order.id} status is not PENDING` });
            }
            const transaction = await db_1.models.transaction.findOne({
                where: { referenceId: order.id },
            });
            if (!transaction) {
                throw (0, error_1.createError)({ statusCode: 404, message: `Transaction not found for order ${order.id}` });
            }
            const wallet = await db_1.models.wallet.findByPk(transaction.walletId);
            if (!wallet) {
                throw (0, error_1.createError)({ statusCode: 404, message: `Wallet not found for transaction ${transaction.id}` });
            }
            order.status = status;
            await order.save({ transaction: t });
            if (status === "CANCELLED" || status === "REJECTED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Refunding order ${order.id} amount via wallet service`);
                const idempotencyKey = `ecom_order_refund_${order.id}`;
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
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending status update emails");
        await Promise.all(orders.map(async (order) => {
            const user = await db_1.models.user.findByPk(order.userId);
            await (0, utils_1.sendOrderStatusUpdateEmail)(user, order, status, ctx);
        }));
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} orders`);
};
