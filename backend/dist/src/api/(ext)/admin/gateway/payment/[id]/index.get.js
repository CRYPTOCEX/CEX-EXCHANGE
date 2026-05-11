"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get gateway payment details",
    description: "Retrieves comprehensive information about a specific gateway payment including merchant details, customer information, refunds, and webhook delivery history. Supports lookup by payment UUID or payment intent ID (pi_xxx).",
    operationId: "getGatewayPayment",
    tags: ["Admin", "Gateway", "Payment"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Payment UUID or payment intent ID (pi_xxx)",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Payment details with related data",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Payment object with merchant, customer, refunds, and webhooks",
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Payment"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.gateway.payment",
    demoMask: ["customer.email", "merchant.email"],
    logModule: "ADMIN_GATEWAY",
    logTitle: "Get payment details",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching payment details for ${id}`);
    const isPaymentIntentId = id.startsWith("pi_");
    const whereClause = isPaymentIntentId ? { paymentIntentId: id } : { id };
    const payment = await db_1.models.gatewayPayment.findOne({
        where: whereClause,
        include: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "slug", "email", "logo"],
            },
            {
                model: db_1.models.user,
                as: "customer",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.gatewayRefund,
                as: "gatewayRefunds",
            },
            {
                model: db_1.models.gatewayWebhook,
                as: "gatewayWebhooks",
                separate: true,
                order: [["createdAt", "DESC"]],
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved payment ${payment.paymentIntentId}`);
    return payment;
};
