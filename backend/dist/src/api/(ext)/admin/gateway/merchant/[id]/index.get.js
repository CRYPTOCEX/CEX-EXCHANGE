"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/currency/utils");
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
    const [paymentCount, volumeRows, refundCount, payoutCount, paidOutRows] = await Promise.all([
        db_1.models.gatewayPayment.count({
            where: { merchantId: id, status: "COMPLETED", testMode: isTestMode },
        }),
        db_1.models.gatewayPayment.findAll({
            where: { merchantId: id, status: "COMPLETED", testMode: isTestMode },
            attributes: ["currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
            group: ["currency"],
            raw: true,
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
        db_1.models.gatewayPayout.findAll({
            where: { merchantId: id, status: "COMPLETED" },
            attributes: ["currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("netAmount")), "total"]],
            group: ["currency"],
            raw: true,
        }),
    ]);
    const byCurrency = (rows) => {
        const out = {};
        for (const r of rows || []) {
            const currency = r === null || r === void 0 ? void 0 : r.currency;
            if (!currency)
                continue;
            out[currency] = (out[currency] || 0) + (parseFloat(r.total || "0") || 0);
        }
        return out;
    };
    const volumeByCurrency = byCurrency(volumeRows);
    const paidOutByCurrency = byCurrency(paidOutRows);
    const [volumeUSD, paidOutUSD] = await Promise.all([
        (0, utils_1.sumInUSD)(volumeByCurrency),
        (0, utils_1.sumInUSD)(paidOutByCurrency),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved merchant details with ${paymentCount} payments`);
    return {
        ...merchant.toJSON(),
        stats: {
            paymentCount,
            refundCount,
            payoutCount,
            totalVolumeUSD: parseFloat(volumeUSD.total.toFixed(2)),
            totalPaidOutUSD: parseFloat(paidOutUSD.total.toFixed(2)),
            volumeByCurrency,
            paidOutByCurrency,
            unpricedCurrencies: [...new Set([...volumeUSD.unpriced, ...paidOutUSD.unpriced])],
        },
    };
};
