"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const utils_1 = require("../utils");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Create a payment session",
    description: "Creates a new payment session that customers can use to complete a payment. Returns a checkout URL to redirect customers to.",
    operationId: "createPayment",
    tags: ["Gateway", "Payment"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.createPaymentSchema,
            },
        },
    },
    responses: {
        201: {
            description: "Payment session created successfully",
            content: {
                "application/json": {
                    schema: utils_1.paymentResponseSchema,
                },
            },
        },
        400: {
            description: "Invalid request parameters",
        },
        401: {
            description: "Invalid or missing API key",
        },
        403: {
            description: "Insufficient permissions",
        },
    },
    requiresAuth: false,
    logModule: "GATEWAY",
    logTitle: "Create Payment Session",
};
exports.default = async (data) => {
    var _a, _b;
    const { body, headers, ctx } = data;
    console_1.logger.debug("GATEWAY_PAYMENT", `Payment create request received - Amount: ${body === null || body === void 0 ? void 0 : body.amount}, Currency: ${body === null || body === void 0 ? void 0 : body.currency}`);
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
            message: "Secret key required to create payments",
        });
    }
    (0, gateway_1.checkApiPermission)(apiKey, "payment.create");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate request fields");
    if (!body.amount || !body.currency || !body.returnUrl) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: amount, currency, returnUrl",
        });
    }
    const amount = (0, gateway_1.validateAmount)(body.amount);
    const currency = body.currency.toUpperCase();
    (0, gateway_1.validateCurrency)(currency, merchant.allowedCurrencies);
    const walletType = body.walletType || "FIAT";
    (0, gateway_1.validateWalletType)(walletType, merchant.allowedWalletTypes);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate against gateway settings and limits");
    await (0, gateway_1.validatePaymentAgainstSettings)(amount, currency, walletType);
    (0, gateway_1.validateUrl)(body.returnUrl, "returnUrl");
    if (body.cancelUrl) {
        (0, gateway_1.validateUrl)(body.cancelUrl, "cancelUrl");
    }
    if (body.webhookUrl) {
        (0, gateway_1.validateUrl)(body.webhookUrl, "webhookUrl");
    }
    if (amount > merchant.transactionLimit) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Amount exceeds transaction limit");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Amount exceeds transaction limit of ${merchant.transactionLimit} ${currency}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate fees and generate payment ID");
    const { feeAmount, netAmount } = (0, gateway_1.calculateFees)(amount, merchant.feeType, merchant.feePercentage, merchant.feeFixed);
    const paymentIntentId = (0, gateway_1.generatePaymentIntentId)();
    const gatewaySettings = await (0, gateway_1.getGatewaySettings)();
    const defaultExpirationSeconds = (gatewaySettings.gatewayPaymentExpirationMinutes || 30) * 60;
    const expiresIn = body.expiresIn || defaultExpirationSeconds;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const checkoutUrl = (0, gateway_1.generateCheckoutUrl)(paymentIntentId);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create payment record");
    const payment = await db_1.models.gatewayPayment.create({
        merchantId: merchant.id,
        paymentIntentId,
        merchantOrderId: body.merchantOrderId || null,
        amount,
        currency,
        walletType,
        feeAmount,
        netAmount,
        status: "PENDING",
        checkoutUrl,
        returnUrl: body.returnUrl,
        cancelUrl: body.cancelUrl || null,
        webhookUrl: body.webhookUrl || null,
        description: body.description || null,
        metadata: body.metadata || null,
        lineItems: body.lineItems || null,
        customerEmail: body.customerEmail || null,
        customerName: body.customerName || null,
        expiresAt,
        testMode: isTestMode,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Send payment.created webhook");
    if (body.webhookUrl) {
        try {
            await (0, gateway_1.sendWebhook)(merchant.id, payment.id, null, "payment.created", body.webhookUrl, {
                id: `evt_${paymentIntentId}`,
                type: "payment.created",
                createdAt: new Date().toISOString(),
                data: {
                    id: paymentIntentId,
                    merchantOrderId: body.merchantOrderId || null,
                    amount,
                    currency,
                    status: "PENDING",
                    checkoutUrl,
                    expiresAt: expiresAt.toISOString(),
                },
            }, merchant.webhookSecret);
        }
        catch (error) {
            console_1.logger.error("GATEWAY_PAYMENT", "Failed to send payment.created webhook", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Payment created successfully");
    console_1.logger.success("GATEWAY_PAYMENT", `Payment created successfully - ID: ${paymentIntentId}, Amount: ${amount} ${currency}`);
    return {
        id: paymentIntentId,
        status: "PENDING",
        amount,
        currency,
        walletType,
        merchantOrderId: body.merchantOrderId || null,
        description: body.description || null,
        feeAmount,
        netAmount,
        checkoutUrl,
        expiresAt: expiresAt.toISOString(),
        createdAt: payment.createdAt,
    };
};
