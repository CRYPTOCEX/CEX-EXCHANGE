"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Cancel a payment",
    description: "Cancels a pending payment. Only payments with status PENDING can be cancelled.",
    operationId: "cancelPayment",
    tags: ["Gateway", "Payment"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Payment intent ID (e.g., pi_xxx)",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Payment cancelled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            status: { type: "string" },
                            cancelledAt: { type: "string" },
                        },
                    },
                },
            },
        },
        400: {
            description: "Payment cannot be cancelled",
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
    logTitle: "Cancel Payment",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, headers, ctx } = data;
    const { id } = params;
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
            message: "Secret key required to cancel payments",
        });
    }
    (0, gateway_1.checkApiPermission)(apiKey, "payment.cancel");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find payment to cancel");
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
    if (payment.testMode !== isTestMode) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Test mode mismatch");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Payment not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate payment can be cancelled");
    if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Payment status is ${payment.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Payment with status ${payment.status} cannot be cancelled`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update payment status");
    await payment.update({
        status: "CANCELLED",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Send cancellation webhook");
    if (payment.webhookUrl) {
        try {
            await (0, gateway_1.sendWebhook)(merchant.id, payment.id, null, "payment.cancelled", payment.webhookUrl, {
                id: `evt_${payment.paymentIntentId}`,
                type: "payment.cancelled",
                createdAt: new Date().toISOString(),
                data: {
                    id: payment.paymentIntentId,
                    merchantOrderId: payment.merchantOrderId,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: "CANCELLED",
                },
            }, merchant.webhookSecret);
        }
        catch (error) {
            console_1.logger.error("GATEWAY_PAYMENT", "Failed to send payment.cancelled webhook", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Payment cancelled successfully");
    return {
        id: payment.paymentIntentId,
        status: "CANCELLED",
        cancelledAt: new Date().toISOString(),
    };
};
