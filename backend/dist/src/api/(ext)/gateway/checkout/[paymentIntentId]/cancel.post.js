"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Cancel checkout",
    description: "Cancels the checkout session and redirects to cancel URL.",
    operationId: "cancelCheckout",
    tags: ["Gateway", "Checkout"],
    parameters: [
        {
            name: "paymentIntentId",
            in: "path",
            required: true,
            description: "Payment intent ID",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Checkout cancelled",
        },
        400: {
            description: "Checkout cannot be cancelled",
        },
    },
    requiresAuth: false,
    logModule: "GATEWAY",
    logTitle: "Cancel Checkout Session",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { paymentIntentId } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find payment session");
    const payment = await db_1.models.gatewayPayment.findOne({
        where: {
            paymentIntentId,
        },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate payment can be cancelled");
    if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Payment is already ${payment.status.toLowerCase()}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Payment is already ${payment.status.toLowerCase()}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update payment status to cancelled");
    await payment.update({ status: "CANCELLED" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Send cancellation webhook");
    if (payment.webhookUrl) {
        try {
            await (0, gateway_1.sendWebhook)(payment.merchant.id, payment.id, null, "payment.cancelled", payment.webhookUrl, {
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
            }, payment.merchant.webhookSecret);
        }
        catch (error) {
            console_1.logger.error("GATEWAY_CHECKOUT", "Failed to send payment.cancelled webhook", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Build redirect URL");
    const redirectUrl = payment.cancelUrl || payment.returnUrl;
    const url = new URL(redirectUrl);
    url.searchParams.set("payment_id", payment.paymentIntentId);
    url.searchParams.set("status", "cancelled");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Checkout cancelled successfully");
    return {
        success: true,
        paymentId: payment.paymentIntentId,
        status: "CANCELLED",
        redirectUrl: url.toString(),
    };
};
