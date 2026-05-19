"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Gateway Landing Page Data",
    description: "Retrieves optimized data for the gateway landing page including stats, supported currencies, fee structure, and recent activity.",
    operationId: "getGatewayLandingData",
    tags: ["Gateway", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Gateway landing data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            supportedPayments: { type: "object" },
                            feeStructure: { type: "object" },
                            payoutOptions: { type: "array" },
                            recentActivity: { type: "array" },
                            integrations: { type: "array" },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const [totalMerchants, activeMerchants, totalTransactions, completedPayments, volumeResult, currencyStats, countryStats, processingTimeResult, refundCount, recentPayments,] = await Promise.all([
        db_1.models.gatewayMerchant.count(),
        db_1.models.gatewayMerchant.count({ where: { status: "ACTIVE" } }),
        db_1.models.gatewayPayment.count(),
        db_1.models.gatewayPayment.count({ where: { status: "COMPLETED" } }),
        db_1.models.gatewayPayment.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalVolume"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("amount")), "avgAmount"],
            ],
            where: { status: "COMPLETED" },
            raw: true,
        }),
        db_1.models.gatewayPayment.findAll({
            attributes: [[(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("currency")), "currency"]],
            where: { status: "COMPLETED" },
            raw: true,
        }),
        db_1.models.gatewayMerchant.findAll({
            attributes: [[(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("country")), "country"]],
            where: { status: "ACTIVE", country: { [sequelize_1.Op.ne]: null } },
            raw: true,
        }),
        db_1.models.gatewayPayment.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("TIMESTAMPDIFF(SECOND, createdAt, completedAt)")),
                    "avgSeconds",
                ],
            ],
            where: {
                status: "COMPLETED",
                completedAt: { [sequelize_1.Op.ne]: null },
            },
            raw: true,
        }),
        db_1.models.gatewayRefund.count({ where: { status: "COMPLETED" } }),
        db_1.models.gatewayPayment.findAll({
            where: { status: "COMPLETED", testMode: false },
            include: [
                {
                    model: db_1.models.gatewayMerchant,
                    as: "merchant",
                    attributes: ["name", "country"],
                },
            ],
            order: [["completedAt", "DESC"]],
            limit: 10,
        }),
    ]);
    const totalVolume = parseFloat(volumeResult === null || volumeResult === void 0 ? void 0 : volumeResult.totalVolume) || 0;
    const avgAmount = parseFloat(volumeResult === null || volumeResult === void 0 ? void 0 : volumeResult.avgAmount) || 0;
    const avgSeconds = parseFloat(processingTimeResult === null || processingTimeResult === void 0 ? void 0 : processingTimeResult.avgSeconds) || 2;
    const successRate = totalTransactions > 0
        ? Math.round((completedPayments / totalTransactions) * 100)
        : 99;
    const refundRate = completedPayments > 0
        ? Math.round((refundCount / completedPayments) * 100 * 100) / 100
        : 0;
    const allCurrencies = currencyStats
        .map((c) => c.currency)
        .filter(Boolean);
    const cryptoCurrencies = allCurrencies.filter((c) => ["BTC", "ETH", "USDT", "USDC", "LTC", "XRP", "BNB", "SOL", "DOGE"].includes(c));
    const fiatCurrencies = allCurrencies.filter((c) => ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"].includes(c));
    const recentActivity = recentPayments.slice(0, 8).map((p) => {
        var _a;
        return ({
            type: "payment_completed",
            amount: p.amount,
            currency: p.currency,
            timeAgo: getTimeAgo(p.completedAt),
            merchantCategory: ((_a = p.merchant) === null || _a === void 0 ? void 0 : _a.country) || "Global",
        });
    });
    const integrations = [
        {
            name: "Node.js SDK",
            type: "SDK",
            languages: ["JavaScript", "TypeScript"],
            icon: "nodejs",
        },
        {
            name: "Python SDK",
            type: "SDK",
            languages: ["Python"],
            icon: "python",
        },
        { name: "PHP SDK", type: "SDK", languages: ["PHP"], icon: "php" },
        { name: "REST API", type: "API", languages: ["Any"], icon: "api" },
        {
            name: "WooCommerce",
            type: "PLUGIN",
            platforms: ["WordPress"],
            icon: "woocommerce",
        },
        {
            name: "Shopify",
            type: "PLUGIN",
            platforms: ["Shopify"],
            icon: "shopify",
        },
    ];
    const feeStructure = {
        type: "BOTH",
        percentage: 2.9,
        fixed: 0.3,
        example: {
            amount: 100,
            fee: 100 * 0.029 + 0.3,
            netAmount: 100 - (100 * 0.029 + 0.3),
        },
    };
    const payoutOptions = [
        {
            schedule: "INSTANT",
            description: "Get paid immediately after each transaction",
            minThreshold: 0,
            icon: "zap",
        },
        {
            schedule: "DAILY",
            description: "Automatic daily settlements at midnight UTC",
            minThreshold: 100,
            icon: "calendar",
        },
        {
            schedule: "WEEKLY",
            description: "Weekly payouts every Monday",
            minThreshold: 100,
            icon: "calendar-week",
        },
        {
            schedule: "MONTHLY",
            description: "Monthly payouts on the 1st",
            minThreshold: 100,
            icon: "calendar-month",
        },
    ];
    return {
        stats: {
            totalMerchants: activeMerchants || totalMerchants,
            totalTransactions,
            totalVolume: Math.round((totalVolume / 1000000) * 100) / 100,
            successRate,
            avgProcessingTime: Math.max(Math.round(avgSeconds), 1),
            currenciesSupported: allCurrencies.length || 15,
            countriesServed: countryStats.length || 50,
            avgTransactionValue: Math.round(avgAmount * 100) / 100,
            refundRate,
            uptime: 99.99,
        },
        supportedPayments: {
            fiat: fiatCurrencies.length > 0
                ? fiatCurrencies
                : ["USD", "EUR", "GBP", "CAD", "AUD"],
            crypto: cryptoCurrencies.length > 0
                ? cryptoCurrencies
                : ["BTC", "ETH", "USDT", "USDC", "LTC"],
            walletTypes: ["FIAT", "SPOT", "ECO"],
        },
        feeStructure,
        payoutOptions,
        recentActivity,
        integrations,
    };
};
function getTimeAgo(date) {
    if (!date)
        return "just now";
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60)
        return "just now";
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
