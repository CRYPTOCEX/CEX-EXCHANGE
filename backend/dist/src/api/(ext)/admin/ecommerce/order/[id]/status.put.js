"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
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
                        allowRefundFromCompleted: {
                            type: "boolean",
                            description: "Explicit admin override to allow refund-triggering transitions (CANCELLED/REJECTED) from a COMPLETED order. Required for return-after-delivery flows; defaults to false so refunds from COMPLETED are not a silent side effect.",
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
const VALID_TRANSITIONS = {
    PENDING: ["COMPLETED", "CANCELLED", "REJECTED"],
    COMPLETED: [],
    CANCELLED: [],
    REJECTED: [],
};
const OVERRIDE_TRANSITIONS = {
    COMPLETED: ["CANCELLED", "REJECTED"],
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, allowRefundFromCompleted } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding order: ${id}`);
    const order = await db_1.models.ecommerceOrder.findByPk(id);
    if (!order) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Order not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating status transition");
    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    const overrideTransitions = OVERRIDE_TRANSITIONS[order.status] || [];
    const isOverride = allowRefundFromCompleted === true && overrideTransitions.includes(status);
    if (!allowedTransitions.includes(status) && !isOverride) {
        const hint = overrideTransitions.includes(status)
            ? ` Pass allowRefundFromCompleted=true to deliberately refund a COMPLETED order (return-after-delivery flow).`
            : "";
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot transition from ${order.status} to ${status}.${hint}`,
        });
    }
    const needsRefund = (status === "CANCELLED" || status === "REJECTED") &&
        (order.status === "PENDING" || order.status === "COMPLETED");
    let walletRecord = null;
    let transactionRecord = null;
    if (needsRefund) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding related transaction");
        transactionRecord = await db_1.models.transaction.findOne({
            where: { referenceId: order.id, type: "ECOMMERCE_PURCHASE" },
        });
        if (!transactionRecord) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding wallet");
        walletRecord = await db_1.models.wallet.findByPk(transactionRecord.walletId);
        if (!walletRecord) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating order status to ${status}`);
    await db_1.sequelize.transaction(async (t) => {
        var _a, _b, _c;
        order.status = status;
        await order.save({ transaction: t });
        if (needsRefund && walletRecord && transactionRecord) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Reversing platform revenue before refund");
            const platformRevenue = ((_a = order.subtotal) !== null && _a !== void 0 ? _a : 0) - ((_b = order.discount) !== null && _b !== void 0 ? _b : 0);
            if (platformRevenue > 0) {
                const superAdmin = await (0, fees_1.getSuperAdmin)();
                if (!superAdmin) {
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: "Super Admin wallet not configured for refund.",
                    });
                }
                const adminWallet = await wallet_1.walletCreationService.getOrCreateWallet(superAdmin.id, walletRecord.type, walletRecord.currency, t);
                try {
                    await wallet_1.walletService.debit({
                        idempotencyKey: `ecommerce_refund_platform_fee_${order.id}`,
                        userId: superAdmin.id,
                        walletId: adminWallet.id,
                        walletType: walletRecord.type,
                        currency: walletRecord.currency,
                        amount: platformRevenue,
                        operationType: "REFUND",
                        referenceId: order.id,
                        description: `Platform revenue reversal for ${status.toLowerCase()} order ${order.id}`,
                        metadata: {
                            orderId: order.id,
                            transactionId: transactionRecord.id,
                            status,
                            direction: "platform_fee_reversal",
                        },
                        transaction: t,
                    });
                }
                catch (feeErr) {
                    if ((feeErr === null || feeErr === void 0 ? void 0 : feeErr.name) !== "DuplicateOperationError")
                        throw feeErr;
                    console_1.logger.warn("ADMIN_ECOM_REFUND", `Platform fee already reversed for order ${order.id}; continuing.`);
                }
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding buyer via wallet service");
            try {
                await wallet_1.walletService.credit({
                    idempotencyKey: `ecommerce_refund_buyer_${order.id}`,
                    userId: order.userId,
                    walletId: walletRecord.id,
                    walletType: walletRecord.type,
                    currency: walletRecord.currency,
                    amount: transactionRecord.amount,
                    operationType: "REFUND",
                    referenceId: order.id,
                    description: `Refund for ${status.toLowerCase()} order ${order.id}`,
                    metadata: {
                        orderId: order.id,
                        transactionId: transactionRecord.id,
                        status,
                    },
                    transaction: t,
                });
            }
            catch (refundErr) {
                if ((refundErr === null || refundErr === void 0 ? void 0 : refundErr.name) !== "DuplicateOperationError")
                    throw refundErr;
                console_1.logger.warn("ADMIN_ECOM_REFUND", `Buyer already refunded for order ${order.id}; continuing.`);
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Restoring inventory for cancelled/rejected order");
            const orderItems = await db_1.models.ecommerceOrderItem.findAll({
                where: { orderId: order.id },
                include: [
                    {
                        model: db_1.models.ecommerceProduct,
                        as: "product",
                        attributes: ["id", "type"],
                    },
                ],
                transaction: t,
            });
            for (const item of orderItems) {
                const itemData = item.get({ plain: true });
                if (((_c = itemData.product) === null || _c === void 0 ? void 0 : _c.type) === "PHYSICAL") {
                    await db_1.models.ecommerceProduct.update({ inventoryQuantity: (0, sequelize_1.literal)(`inventoryQuantity + ${item.quantity}`) }, {
                        where: { id: item.productId },
                        transaction: t,
                    });
                }
            }
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
