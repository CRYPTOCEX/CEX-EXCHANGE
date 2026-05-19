"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get gateway merchant details",
    description: "Retrieves comprehensive information about a specific gateway merchant including user details, balances, API keys (filtered by mode), and statistics such as payment count, total volume, refunds, and payouts.",
    operationId: "getGatewayMerchant",
    tags: ["Admin", "Gateway", "Merchant"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Merchant UUID",
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "mode",
            in: "query",
            description: "Filter API keys by mode (LIVE or TEST)",
            schema: {
                type: "string",
                enum: ["LIVE", "TEST"],
            },
        },
    ],
    responses: {
        200: {
            description: "Merchant details with statistics",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Merchant object with associated user, balances, API keys, and statistics",
                        properties: {
                            stats: {
                                type: "object",
                                properties: {
                                    paymentCount: { type: "number", description: "Total number of completed payments" },
                                    totalVolume: { type: "number", description: "Total payment volume" },
                                    refundCount: { type: "number", description: "Total number of refunds" },
                                    payoutCount: { type: "number", description: "Total number of completed payouts" },
                                    totalPaidOut: { type: "number", description: "Total amount paid out to merchant" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Merchant"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.gateway.merchant",
    demoMask: ["user.email", "email", "phone", "webhookSecret"],
    logModule: "ADMIN_GATEWAY",
    logTitle: "Get merchant details",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { id } = params;
    const mode = (query === null || query === void 0 ? void 0 : query.mode) || "LIVE";
    const isTestMode = mode === "TEST";
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching merchant ${id} details (mode: ${mode})`);
    const merchant = await db_1.models.gatewayMerchant.findByPk(id, {
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.gatewayMerchantBalance,
                as: "gatewayMerchantBalances",
            },
            {
                model: db_1.models.gatewayApiKey,
                as: "gatewayApiKeys",
                where: { mode },
                required: false,
                attributes: [
                    "id",
                    "name",
                    "keyPrefix",
                    "lastFourChars",
                    "type",
                    "mode",
                    "permissions",
                    "ipWhitelist",
                    "allowedWalletTypes",
                    "successUrl",
                    "cancelUrl",
                    "webhookUrl",
                    "lastUsedAt",
                    "lastUsedIp",
                    "status",
                    "expiresAt",
                    "createdAt",
                ],
            },
        ],
    });
    if (!merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating merchant statistics");
    const [paymentCount, totalVolume, refundCount, payoutCount, totalPaidOut] = await Promise.all([
        db_1.models.gatewayPayment.count({
            where: { merchantId: id, status: "COMPLETED", testMode: isTestMode },
        }),
        db_1.models.gatewayPayment.sum("amount", {
            where: { merchantId: id, status: "COMPLETED", testMode: isTestMode },
        }),
        db_1.models.gatewayRefund.count({
            where: { merchantId: id },
            include: [
                {
                    model: db_1.models.gatewayPayment,
                    as: "payment",
                    where: { testMode: isTestMode },
                    required: true,
                    attributes: [],
                },
            ],
        }),
        db_1.models.gatewayPayout.count({
            where: { merchantId: id, status: "COMPLETED" },
        }),
        db_1.models.gatewayPayout.sum("netAmount", {
            where: { merchantId: id, status: "COMPLETED" },
        }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved merchant details with ${paymentCount} payments`);
    return {
        ...merchant.toJSON(),
        stats: {
            paymentCount,
            totalVolume: totalVolume || 0,
            refundCount,
            payoutCount,
            totalPaidOut: totalPaidOut || 0,
        },
    };
};
