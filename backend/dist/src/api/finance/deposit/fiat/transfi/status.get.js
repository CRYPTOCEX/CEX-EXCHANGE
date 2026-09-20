"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "TransFi corridor discovery and order status",
    description: "With `order_id`, polls a single order. With `currency`, returns the payment methods and effective limits for that corridor. With neither, lists supported deposit currencies.",
    operationId: "getTransfiStatus",
    tags: ["Finance", "Deposit", "TransFi"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "order_id",
            in: "query",
            description: "TransFi order id to poll",
            required: false,
            schema: { type: "string" },
        },
        {
            index: 1,
            name: "currency",
            in: "query",
            description: "Currency to describe (methods + effective limits)",
            required: false,
            schema: { type: "string" },
        },
        {
            index: 2,
            name: "amount",
            in: "query",
            description: "Optional amount, to quote fees for the corridor",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Status or corridor description",
            content: { "application/json": { schema: { type: "object" } } },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const orderId = String((query === null || query === void 0 ? void 0 : query.order_id) || "").trim();
    if (orderId) {
        const confirmed = await (0, utils_1.getOrder)(orderId);
        return {
            success: true,
            data: {
                orderId: confirmed.orderId,
                status: confirmed.status,
                mappedStatus: confirmed.mapped,
                onHold: confirmed.onHold,
                currency: confirmed.destinationCurrency,
                amount: confirmed.destinationAmount,
                failureCode: confirmed.failureCode,
                failureMessage: confirmed.failureMessage,
            },
        };
    }
    const currency = String((query === null || query === void 0 ? void 0 : query.currency) || "").trim().toUpperCase();
    if (currency) {
        const methods = await (0, utils_1.listPaymentMethods)(currency, "deposit");
        const amount = Number(query === null || query === void 0 ? void 0 : query.amount);
        const described = await Promise.all(methods.map(async (m) => {
            const { min, max, quote } = await (0, utils_1.resolveCorridorLimits)(currency, m, amount);
            const limits = { min, max };
            return {
                paymentCode: m.paymentCode,
                paymentType: m.paymentType,
                name: m.name,
                logoUrl: m.logoUrl,
                minAmount: limits.min,
                maxAmount: limits.max,
                providerFee: quote === null || quote === void 0 ? void 0 : quote.totalFee,
                netAmount: quote === null || quote === void 0 ? void 0 : quote.destinationAmount,
            };
        }));
        return { success: true, data: { currency, methods: described } };
    }
    const gateway = await db_1.models.depositGateway.findOne({
        where: { alias: "transfi", status: true },
    });
    if (!gateway) {
        return { success: true, data: { currencies: [], enabled: false } };
    }
    const remote = await (0, utils_1.listSupportedCurrencies)("deposit");
    const allowed = (0, utils_1.parseGatewayCurrencies)(gateway.currencies);
    const platformCurrencies = await db_1.models.currency.findAll({ attributes: ["id"] });
    const platformSet = new Set(platformCurrencies.map((c) => c.id));
    const currencies = remote
        .filter((c) => (allowed.length ? allowed.includes(c.currency) : true))
        .filter((c) => platformSet.has(c.currency))
        .map((c) => ({
        currency: c.currency,
        logoUrl: c.logoUrl,
        decimalPrecision: c.decimalPrecision,
    }));
    return { success: true, data: { currencies, enabled: true } };
};
