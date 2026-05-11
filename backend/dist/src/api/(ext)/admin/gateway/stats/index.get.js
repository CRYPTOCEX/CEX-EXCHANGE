"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get gateway dashboard statistics",
    description: "Retrieves comprehensive overview statistics for the payment gateway admin dashboard including merchant counts, payment statistics (volume, counts by status), refund data, pending payouts, and recent payment activity. Supports filtering by mode (LIVE/TEST).",
    operationId: "getGatewayStats",
    tags: ["Admin", "Gateway", "Stats"],
    parameters: [
        {
            name: "mode",
            in: "query",
            description: "Filter payments by mode (LIVE or TEST)",
            schema: {
                type: "string",
                enum: ["LIVE", "TEST"],
            },
        },
    ],
    responses: {
        200: {
            description: "Gateway dashboard statistics",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            mode: { type: "string", description: "Current mode (LIVE or TEST)" },
                            merchants: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    active: { type: "number" },
                                    pending: { type: "number" },
                                },
                            },
                            payments: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    completed: { type: "number" },
                                    pending: { type: "number" },
                                    failed: { type: "number" },
                                    refunded: { type: "number" },
                                    partiallyRefunded: { type: "number" },
                                    totalVolume: { type: "number", description: "Total payment volume" },
                                    totalRefunded: { type: "number", description: "Total refunded amount" },
                                    netVolume: { type: "number", description: "Net volume (total - refunded)" },
                                    totalFees: { type: "number", description: "Total fees collected" },
                                },
                            },
                            payouts: {
                                type: "object",
                                properties: {
                                    pending: { type: "number", description: "Number of pending payouts" },
                                    pendingAmount: { type: "number", description: "Total pending payout amount" },
                                },
                            },
                            recentPayments: {
                                type: "array",
                                items: {
                                    type: "object",
                                    description: "Recent payment with merchant and customer info",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.gateway.merchant",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Get gateway statistics",
    demoMask: ["recentPayments.customer.email"],
};
exports.default = async (data) => {
    var _a, _b;
    const { query, ctx } = data;
    const mode = (query === null || query === void 0 ? void 0 : query.mode) || "LIVE";
    const isTestMode = mode === "TEST";
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Calculating gateway statistics (mode: ${mode})`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching merchant statistics");
    const [totalMerchants, activeMerchants, pendingMerchants] = await Promise.all([
        db_1.models.gatewayMerchant.count(),
        db_1.models.gatewayMerchant.count({ where: { status: "ACTIVE" } }),
        db_1.models.gatewayMerchant.count({ where: { status: "PENDING" } }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment statistics");
    const paymentWhere = { testMode: isTestMode };
    const [totalPayments, completedPayments, pendingPayments, failedPayments] = await Promise.all([
        db_1.models.gatewayPayment.count({ where: paymentWhere }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "COMPLETED" } }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "PENDING" } }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "FAILED" } }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating volume and refund statistics");
    const volumeStats = await db_1.models.gatewayPayment.findOne({
        where: {
            status: "COMPLETED",
            testMode: isTestMode
        },
        attributes: [
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalVolume"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("feeAmount")), "totalFees"],
        ],
        raw: true,
    });
    const refundStats = await db_1.models.gatewayRefund.findOne({
        where: {
            status: "COMPLETED",
        },
        attributes: [
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("gatewayRefund.amount")), "totalRefunded"],
        ],
        include: [
            {
                model: db_1.models.gatewayPayment,
                as: "payment",
                where: { testMode: isTestMode },
                attributes: [],
            },
        ],
        raw: true,
    });
    const [refundedPayments, partiallyRefundedPayments] = await Promise.all([
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "REFUNDED" } }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "PARTIALLY_REFUNDED" } }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payout statistics");
    const pendingPayouts = await db_1.models.gatewayPayout.findAll({
        where: { status: "PENDING" },
        attributes: [
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "amount"],
        ],
        raw: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent payments");
    const recentPayments = await db_1.models.gatewayPayment.findAll({
        where: { testMode: isTestMode },
        limit: 10,
        order: [["createdAt", "DESC"]],
        include: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "logo"],
            },
            {
                model: db_1.models.user,
                as: "customer",
                attributes: ["firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    const totalVolume = parseFloat(volumeStats === null || volumeStats === void 0 ? void 0 : volumeStats.totalVolume) || 0;
    const totalFees = parseFloat(volumeStats === null || volumeStats === void 0 ? void 0 : volumeStats.totalFees) || 0;
    const totalRefunded = parseFloat(refundStats === null || refundStats === void 0 ? void 0 : refundStats.totalRefunded) || 0;
    const netVolume = totalVolume - totalRefunded;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Gateway statistics calculated: ${totalPayments} payments, ${totalMerchants} merchants`);
    return {
        mode,
        merchants: {
            total: totalMerchants,
            active: activeMerchants,
            pending: pendingMerchants,
        },
        payments: {
            total: totalPayments,
            completed: completedPayments,
            pending: pendingPayments,
            failed: failedPayments,
            refunded: refundedPayments,
            partiallyRefunded: partiallyRefundedPayments,
            totalVolume,
            totalRefunded,
            netVolume,
            totalFees,
        },
        payouts: {
            pending: parseInt((_a = pendingPayouts === null || pendingPayouts === void 0 ? void 0 : pendingPayouts[0]) === null || _a === void 0 ? void 0 : _a.count) || 0,
            pendingAmount: parseFloat((_b = pendingPayouts === null || pendingPayouts === void 0 ? void 0 : pendingPayouts[0]) === null || _b === void 0 ? void 0 : _b.amount) || 0,
        },
        recentPayments: recentPayments.map((p) => {
            var _a, _b, _c;
            return ({
                id: p.paymentIntentId,
                amount: p.amount,
                currency: p.currency,
                walletType: p.walletType,
                status: p.status,
                feeAmount: p.feeAmount,
                description: p.description,
                merchantId: (_a = p.merchant) === null || _a === void 0 ? void 0 : _a.id,
                merchantName: ((_b = p.merchant) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
                merchantLogo: (_c = p.merchant) === null || _c === void 0 ? void 0 : _c.logo,
                customer: p.customer
                    ? {
                        name: `${p.customer.firstName || ""} ${p.customer.lastName || ""}`.trim() || p.customer.email,
                        email: p.customer.email,
                        avatar: p.customer.avatar,
                    }
                    : null,
                createdAt: p.createdAt,
            });
        }),
    };
};
