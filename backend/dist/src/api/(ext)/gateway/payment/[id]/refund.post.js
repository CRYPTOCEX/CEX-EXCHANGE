"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
exports.metadata = {
    summary: "Create a refund for a payment",
    description: "Creates a refund for a completed payment. Merchants can issue full or partial refunds.",
    operationId: "merchantCreateRefund",
    tags: ["Gateway", "Merchant", "Refund"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Payment intent ID (pi_xxx)",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Refund amount. If not provided, full remaining amount will be refunded.",
                        },
                        reason: {
                            type: "string",
                            enum: [
                                "REQUESTED_BY_CUSTOMER",
                                "DUPLICATE",
                                "FRAUDULENT",
                                "OTHER",
                            ],
                            description: "Reason for refund",
                        },
                        description: {
                            type: "string",
                            description: "Internal description for the refund",
                        },
                    },
                },
            },
        },
    },
    responses: {
        201: {
            description: "Refund created successfully",
        },
        400: {
            description: "Invalid request or payment cannot be refunded",
        },
        401: {
            description: "Unauthorized",
        },
        404: {
            description: "Payment not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Create Payment Refund",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized - no user ID");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find merchant account");
    const merchant = await db_1.models.gatewayMerchant.findOne({
        where: { userId: user.id },
    });
    if (!merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant account not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate merchant status");
    if (merchant.status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account is not active");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Merchant account is not active. Cannot process refunds.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find payment to refund");
    const payment = await db_1.models.gatewayPayment.findOne({
        where: {
            paymentIntentId: id,
            merchantId: merchant.id,
        },
    });
    if (!payment) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Payment not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate payment can be refunded");
    if (payment.status !== "COMPLETED" &&
        payment.status !== "PARTIALLY_REFUNDED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Payment with status ${payment.status} cannot be refunded`,
        });
    }
    if ((body === null || body === void 0 ? void 0 : body.amount) !== undefined) {
        const amount = parseFloat(body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid refund amount");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Refund amount must be a positive number",
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generate refund ID");
    const refundId = (0, gateway_1.generateRefundId)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process refund in transaction");
    const result = await db_1.sequelize.transaction(async (t) => {
        const lockedPayment = await db_1.models.gatewayPayment.findByPk(payment.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!lockedPayment) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Payment not found",
            });
        }
        if (lockedPayment.status !== "COMPLETED" &&
            lockedPayment.status !== "PARTIALLY_REFUNDED") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Payment with status ${lockedPayment.status} cannot be refunded`,
            });
        }
        const existingRefunds = await db_1.models.gatewayRefund.findAll({
            where: {
                paymentId: lockedPayment.id,
                status: "COMPLETED",
            },
            transaction: t,
        });
        const totalRefunded = existingRefunds.reduce((sum, r) => sum + parseFloat(String(r.amount)), 0);
        const remainingRefundable = lockedPayment.amount - totalRefunded;
        const refundAmount = (body === null || body === void 0 ? void 0 : body.amount)
            ? parseFloat(body.amount)
            : remainingRefundable;
        if (refundAmount <= 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Refund amount must be greater than 0",
            });
        }
        if (refundAmount > remainingRefundable) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Refund amount ${refundAmount.toFixed(2)} exceeds remaining refundable amount ${remainingRefundable.toFixed(2)}`,
            });
        }
        const feePercentage = lockedPayment.feeAmount / lockedPayment.amount;
        const proportionalFee = refundAmount * feePercentage;
        const refund = await db_1.models.gatewayRefund.create({
            paymentId: lockedPayment.id,
            merchantId: merchant.id,
            refundId,
            amount: refundAmount,
            currency: lockedPayment.currency,
            reason: (body === null || body === void 0 ? void 0 : body.reason) || "REQUESTED_BY_CUSTOMER",
            description: (body === null || body === void 0 ? void 0 : body.description) || null,
            status: "COMPLETED",
            metadata: null,
        }, { transaction: t });
        if (lockedPayment.customerId && !lockedPayment.testMode) {
            const allocations = lockedPayment.allocations || [];
            if (allocations.length === 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Payment has no allocation data for refund processing",
                });
            }
            const refundResult = await (0, gateway_1.processMultiWalletRefund)({
                userId: lockedPayment.customerId,
                merchantUserId: merchant.userId,
                merchantId: merchant.id,
                paymentCurrency: lockedPayment.currency,
                allocations,
                refundAmount,
                totalPaymentAmount: lockedPayment.amount,
                feeAmount: proportionalFee,
                refundId: refund.id,
                paymentId: lockedPayment.paymentIntentId,
                description: `Refund for payment ${lockedPayment.paymentIntentId}`,
                transaction: t,
            });
            await refund.update({ transactionId: refundResult.userTransaction.id }, { transaction: t });
        }
        const newTotalRefunded = totalRefunded + refundAmount;
        const newStatus = newTotalRefunded >= lockedPayment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
        await lockedPayment.update({ status: newStatus }, { transaction: t });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Refund created successfully");
        return { refund, refundAmount, lockedPayment };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Send refund completion webhook");
    if (result.lockedPayment.webhookUrl) {
        try {
            await (0, gateway_1.sendWebhook)(merchant.id, result.lockedPayment.id, result.refund.id, "refund.completed", result.lockedPayment.webhookUrl, {
                id: `evt_${refundId}`,
                type: "refund.completed",
                createdAt: new Date().toISOString(),
                data: {
                    id: refundId,
                    paymentId: result.lockedPayment.paymentIntentId,
                    merchantOrderId: result.lockedPayment.merchantOrderId,
                    amount: result.refundAmount,
                    currency: result.lockedPayment.currency,
                    status: "COMPLETED",
                    reason: (body === null || body === void 0 ? void 0 : body.reason) || "REQUESTED_BY_CUSTOMER",
                },
            }, merchant.webhookSecret);
        }
        catch (error) {
            console.error("Failed to send refund.completed webhook:", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Refund created successfully");
    return {
        id: refundId,
        paymentId: result.lockedPayment.paymentIntentId,
        amount: result.refundAmount,
        currency: result.lockedPayment.currency,
        status: "COMPLETED",
        reason: (body === null || body === void 0 ? void 0 : body.reason) || "REQUESTED_BY_CUSTOMER",
        description: (body === null || body === void 0 ? void 0 : body.description) || null,
        createdAt: result.refund.createdAt,
    };
};
