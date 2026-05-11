"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const utils_1 = require("../utils");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Create a refund",
    description: "Creates a refund for a completed payment. Can be a full or partial refund.",
    operationId: "createRefund",
    tags: ["Gateway", "Refund"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.createRefundSchema,
            },
        },
    },
    responses: {
        201: {
            description: "Refund created successfully",
            content: {
                "application/json": {
                    schema: utils_1.refundResponseSchema,
                },
            },
        },
        400: {
            description: "Invalid request or payment cannot be refunded",
        },
        401: {
            description: "Invalid or missing API key",
        },
        404: {
            description: "Payment not found",
        },
    },
    requiresAuth: false,
    logModule: "GATEWAY",
    logTitle: "Create Refund",
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { body, headers, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Authenticate API key");
    const apiKeyHeader = (headers === null || headers === void 0 ? void 0 : headers["x-api-key"]) || (headers === null || headers === void 0 ? void 0 : headers["X-API-Key"]);
    const clientIp = ((_b = (_a = headers === null || headers === void 0 ? void 0 : headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
        (headers === null || headers === void 0 ? void 0 : headers["x-real-ip"]) ||
        (headers === null || headers === void 0 ? void 0 : headers["cf-connecting-ip"]) ||
        null;
    const { merchant, apiKey, isTestMode, isSecretKey } = await (0, gateway_1.authenticateGatewayApi)(apiKeyHeader, clientIp);
    if (!isSecretKey) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Secret key required");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Secret key required to create refunds",
        });
    }
    (0, gateway_1.checkApiPermission)(apiKey, "refund.create");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate required fields");
    if (!body.paymentId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing paymentId");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required field: paymentId",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find payment to refund");
    const payment = await db_1.models.gatewayPayment.findOne({
        where: {
            paymentIntentId: body.paymentId,
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
    if (payment.testMode !== isTestMode) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Test mode mismatch");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Payment not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate payment can be refunded");
    if (payment.status !== "COMPLETED" &&
        payment.status !== "PARTIALLY_REFUNDED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Payment status is ${payment.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Payment with status ${payment.status} cannot be refunded`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate refund amount and validate");
    const refundAmount = body.amount
        ? parseFloat(body.amount)
        : payment.amount;
    const existingRefunds = await db_1.models.gatewayRefund.findAll({
        where: {
            paymentId: payment.id,
            status: "COMPLETED",
        },
    });
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + parseFloat(String(r.amount)), 0);
    const remainingRefundable = payment.amount - totalRefunded;
    if (refundAmount > remainingRefundable) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Refund amount exceeds remaining refundable amount");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Refund amount ${refundAmount} exceeds remaining refundable amount ${remainingRefundable}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generate refund ID and calculate fees");
    const refundId = (0, gateway_1.generateRefundId)();
    const feePercentage = payment.feeAmount / payment.amount;
    const proportionalFee = refundAmount * feePercentage;
    let result;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process refund in database transaction");
    try {
        result = await db_1.sequelize.transaction(async (t) => {
            const refund = await db_1.models.gatewayRefund.create({
                paymentId: payment.id,
                merchantId: merchant.id,
                refundId,
                amount: refundAmount,
                currency: payment.currency,
                reason: body.reason || "REQUESTED_BY_CUSTOMER",
                description: body.description || null,
                status: "COMPLETED",
                metadata: body.metadata || null,
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
                    description: `Refund for payment ${payment.paymentIntentId}`,
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
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Refund processing failed: ${error.message}`);
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
        if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("Insufficient")) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: error.message,
            });
        }
        if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes("wallet not found")) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: error.message,
            });
        }
        if (error.statusCode) {
            throw error;
        }
        console_1.logger.error("GATEWAY_REFUND", "Refund processing failed", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to process refund: ${error.message}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Send refund completion webhook");
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
                    reason: body.reason || "REQUESTED_BY_CUSTOMER",
                },
            }, merchant.webhookSecret);
        }
        catch (error) {
            console_1.logger.error("GATEWAY_REFUND", "Failed to send refund.completed webhook", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Refund created successfully");
    return {
        id: refundId,
        paymentId: payment.paymentIntentId,
        amount: refundAmount,
        currency: payment.currency,
        status: "COMPLETED",
        reason: body.reason || "REQUESTED_BY_CUSTOMER",
        description: body.description || null,
        createdAt: result.createdAt,
    };
};
