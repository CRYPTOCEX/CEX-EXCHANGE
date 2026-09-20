"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const console_1 = require("@b/utils/console");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create refund for gateway payment",
    description: "Admin creates a full or partial refund for a completed gateway payment. Processes fund transfer from merchant gateway balance back to customer wallet(s), returns proportional fees, updates payment status, and sends webhook notification. Supports multi-wallet refunds distributed proportionally to original payment allocations.",
    operationId: "createGatewayPaymentRefund",
    tags: ["Admin", "Gateway", "Refund"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Payment UUID or payment intent ID (pi_xxx)",
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
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "Refund ID (ref_xxx)" },
                            paymentId: { type: "string", description: "Payment intent ID" },
                            amount: { type: "number", description: "Refund amount" },
                            currency: { type: "string", description: "Currency code" },
                            status: { type: "string", description: "Refund status" },
                            reason: { type: "string", description: "Refund reason" },
                            description: { type: "string", description: "Refund description" },
                            createdAt: { type: "string", format: "date-time" },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Payment"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "manage.gateway.payment",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Create payment refund",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up payment ${id}`);
    const isPaymentIntentId = id.startsWith("pi_");
    const whereClause = isPaymentIntentId ? { paymentIntentId: id } : { id };
    const payment = await db_1.models.gatewayPayment.findOne({
        where: whereClause,
        include: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
            },
        ],
    });
    if (!payment) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Payment not found",
        });
    }
    const merchant = payment.merchant;
    if (!merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant not found for payment");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant not found for payment",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating payment status");
    if (payment.status !== "COMPLETED" &&
        payment.status !== "PARTIALLY_REFUNDED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Payment status ${payment.status} cannot be refunded`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Payment with status ${payment.status} cannot be refunded`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating refundable amount");
    const existingRefunds = await db_1.models.gatewayRefund.findAll({
        where: {
            paymentId: payment.id,
            status: "COMPLETED",
        },
    });
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + parseFloat(String(r.amount)), 0);
    const remainingRefundable = payment.amount - totalRefunded;
    const refundAmount = (body === null || body === void 0 ? void 0 : body.amount)
        ? parseFloat(body.amount)
        : remainingRefundable;
    if (refundAmount <= 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Refund amount must be greater than 0");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Refund amount must be greater than 0",
        });
    }
    if (refundAmount > remainingRefundable) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Refund amount exceeds remaining refundable amount`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Refund amount ${refundAmount.toFixed(2)} exceeds remaining refundable amount ${remainingRefundable.toFixed(2)}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing refund of ${refundAmount} ${payment.currency}`);
    const refundId = (0, gateway_1.generateRefundId)();
    const feePercentage = payment.feeAmount / payment.amount;
    const proportionalFee = refundAmount * feePercentage;
    let result;
    try {
        result = await db_1.sequelize.transaction(async (t) => {
            const refund = await db_1.models.gatewayRefund.create({
                paymentId: payment.id,
                merchantId: merchant.id,
                refundId,
                amount: refundAmount,
                currency: payment.currency,
                reason: (body === null || body === void 0 ? void 0 : body.reason) || "REQUESTED_BY_CUSTOMER",
                description: (body === null || body === void 0 ? void 0 : body.description) || null,
                status: "COMPLETED",
                metadata: null,
            }, { transaction: t });
            if (payment.customerId && !payment.testMode) {
                const allocations = payment.allocations || [];
                if (allocations.length === 0) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Payment has no allocation data for refund processing",
                    });
                }
                const refundResult = await (0, gateway_1.processMultiWalletRefund)({
                    userId: payment.customerId,
                    merchantUserId: merchant.userId,
                    merchantId: merchant.id,
                    paymentCurrency: payment.currency,
                    allocations,
                    refundAmount,
                    totalPaymentAmount: payment.amount,
                    feeAmount: proportionalFee,
                    refundId,
                    paymentId: payment.paymentIntentId,
                    description: `Refund for payment ${payment.paymentIntentId} (by admin)`,
                    transaction: t,
                });
                await refund.update({ transactionId: refundResult.userTransaction.id }, { transaction: t });
            }
            const newTotalRefunded = totalRefunded + refundAmount;
            const newStatus = newTotalRefunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
            await payment.update({ status: newStatus }, { transaction: t });
            return refund;
        });
    }
    catch (error) {
        if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
            const errorMessages = [];
            if (error.errors && Array.isArray(error.errors)) {
                error.errors.forEach((err) => {
                    errorMessages.push(err.message);
                });
            }
            const message = errorMessages.length > 0
                ? errorMessages.join("; ")
                : error.message || "Validation failed";
            throw (0, error_1.createError)({
                statusCode: 400,
                message,
            });
        }
        if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("Insufficient")) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: error.message,
            });
        }
        if ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("wallet not found")) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: error.message,
            });
        }
        if (error.statusCode) {
            throw error;
        }
        console_1.logger.error("ADMIN_GATEWAY_REFUND", "Refund processing failed", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to process refund: ${error.message}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending webhook notification");
    if (payment.webhookUrl) {
        try {
            await (0, gateway_1.sendWebhook)(merchant.id, payment.id, result.id, "refund.completed", payment.webhookUrl, {
                id: `evt_${refundId}`,
                type: "refund.completed",
                createdAt: new Date().toISOString(),
                data: {
                    id: refundId,
                    paymentId: payment.paymentIntentId,
                    merchantOrderId: payment.merchantOrderId,
                    amount: refundAmount,
                    currency: payment.currency,
                    status: "COMPLETED",
                    reason: (body === null || body === void 0 ? void 0 : body.reason) || "REQUESTED_BY_CUSTOMER",
                },
            }, merchant.webhookSecret);
        }
        catch (error) {
            console_1.logger.error("ADMIN_GATEWAY_REFUND", "Failed to send refund.completed webhook", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Refund ${refundId} created successfully for ${refundAmount} ${payment.currency}`);
    return {
        id: refundId,
        paymentId: payment.paymentIntentId,
        amount: refundAmount,
        currency: payment.currency,
        status: "COMPLETED",
        reason: (body === null || body === void 0 ? void 0 : body.reason) || "REQUESTED_BY_CUSTOMER",
        description: (body === null || body === void 0 ? void 0 : body.description) || null,
        createdAt: result.createdAt,
    };
};
