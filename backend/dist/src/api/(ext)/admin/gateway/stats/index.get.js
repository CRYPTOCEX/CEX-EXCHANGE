"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const errors_1 = require("@b/utils/schema/errors");
const sla_1 = require("@b/utils/sla");
const PAYOUT_SLA_HOURS = sla_1.SLA_HOURS.withdrawal;
const HEALTH_WINDOW_DAYS = 7;
const HEALTH_MIN_ATTEMPTS = 10;
const HEALTH_DROP_POINTS = 5;
const SUCCEEDED = ["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED"];
const FAILED = ["FAILED", "CANCELLED", "EXPIRED"];
function priceBucket(byCurrency, rates, unpriced) {
    let total = 0;
    for (const [currency, amount] of byCurrency) {
        if (!Number.isFinite(amount) || amount === 0)
            continue;
        const rate = rates.get(currency);
        if (rate === undefined) {
            unpriced.add(currency);
            continue;
        }
        total += amount * rate;
    }
    return Number(total.toFixed(2));
}
const ageBucketSchema = {
    type: "object",
    properties: {
        count: { type: "number" },
        amount: { type: "number", description: "Bucket value in USD" },
        currencies: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    currency: { type: "string" },
                    count: { type: "number" },
                    amount: { type: "number" },
                },
            },
        },
    },
};
exports.metadata = {
    summary: "Get gateway dashboard statistics",
    description: "Retrieves comprehensive overview statistics for the payment gateway admin dashboard including merchant counts, payment statistics (volume, counts by status), refund data, pending payouts, and recent payment activity. Every money total is grouped by currency and priced into USD before it is summed, and anything that could not be priced is named in an `unpriced` list rather than folded in as zero. Supports filtering by mode (LIVE/TEST).",
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
                                    currency: {
                                        type: "string",
                                        description: "The unit the four totals below carry. Always \"USD\": each is priced per currency and then summed.",
                                    },
                                    totalVolume: { type: "number", description: "Completed payment volume, in USD" },
                                    totalRefunded: { type: "number", description: "Completed refunds, in USD" },
                                    netVolume: { type: "number", description: "totalVolume - totalRefunded, in USD" },
                                    totalFees: { type: "number", description: "Fees collected, in USD" },
                                    unpriced: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Currencies with no USD rate, left OUT of the four totals rather than added as zero. Non-empty means every total above is a LOWER BOUND and the UI must say so.",
                                    },
                                    currencies: {
                                        type: "array",
                                        description: "Completed volume broken out BY CURRENCY, in each currency's own units. This is the unconverted truth behind `totalVolume`; the totals above are the USD-priced sum of it.",
                                        items: {
                                            type: "object",
                                            properties: {
                                                currency: { type: "string" },
                                                volume: { type: "number" },
                                                fees: { type: "number" },
                                                count: { type: "number" },
                                            },
                                        },
                                    },
                                },
                            },
                            payouts: {
                                type: "object",
                                properties: {
                                    pending: { type: "number", description: "Number of pending payouts" },
                                    currency: {
                                        type: "string",
                                        description: "The unit `pendingAmount` and every `aging.*.amount` carries. Always \"USD\".",
                                    },
                                    pendingAmount: { type: "number", description: "Pending payout value, in USD" },
                                    unpriced: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Payout currencies with no USD rate, left OUT of `pendingAmount` and the aging amounts rather than added as zero. Non-empty means those figures are LOWER BOUNDS.",
                                    },
                                    slaHours: {
                                        type: "number",
                                        description: "Hours a payout may wait before it is late (shared SLA table)",
                                    },
                                    oldestPendingAt: {
                                        type: "string",
                                        nullable: true,
                                        description: "createdAt of the oldest PENDING payout, or null",
                                    },
                                    aging: {
                                        type: "object",
                                        description: "PENDING payouts bucketed against the SLA: fresh (<half budget), due (>=half), breached (>=budget). `amount` is USD; `currencies` is the same bucket unconverted.",
                                        properties: {
                                            fresh: ageBucketSchema,
                                            due: ageBucketSchema,
                                            breached: ageBucketSchema,
                                        },
                                    },
                                    currencies: {
                                        type: "array",
                                        description: "ALL pending payouts broken out by currency, in each currency's own units — the unconverted truth behind `pendingAmount`.",
                                        items: {
                                            type: "object",
                                            properties: {
                                                currency: { type: "string" },
                                                count: { type: "number" },
                                                amount: { type: "number" },
                                            },
                                        },
                                    },
                                },
                            },
                            merchantHealth: {
                                type: "object",
                                description: "Merchants whose payment success rate fell between the previous window and this one.",
                                properties: {
                                    windowDays: { type: "number" },
                                    minAttempts: { type: "number" },
                                    dropPoints: { type: "number" },
                                    evaluated: {
                                        type: "number",
                                        description: "Merchants with enough decided payments in BOTH windows to compare",
                                    },
                                    merchants: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                logo: { type: "string", nullable: true },
                                                attempts: { type: "number" },
                                                succeeded: { type: "number" },
                                                failed: { type: "number" },
                                                successRate: { type: "number" },
                                                priorAttempts: { type: "number" },
                                                priorSuccessRate: { type: "number" },
                                                delta: { type: "number", description: "successRate - priorSuccessRate, in points" },
                                            },
                                        },
                                    },
                                },
                            },
                            generatedAt: { type: "string", description: "ISO timestamp these figures were computed" },
                            recentPayments: {
                                type: "array",
                                description: "The ten most recent payments. A CAPPED LIST, not a population — nothing on this payload is totalled from it.",
                                items: {
                                    type: "object",
                                    description: "Recent payment with merchant and customer info. `customer.name` is NULLABLE: it is the person's name or nothing, never their email address — see the mapper.",
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
    var _a;
    const { query, ctx } = data;
    const mode = (query === null || query === void 0 ? void 0 : query.mode) || "LIVE";
    const isTestMode = mode === "TEST";
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Calculating gateway statistics (mode: ${mode})`);
    const paymentWhere = { testMode: isTestMode };
    const now = Date.now();
    const breachedCutoff = new Date(now - PAYOUT_SLA_HOURS * 3600000);
    const dueCutoff = new Date(now - (PAYOUT_SLA_HOURS / 2) * 3600000);
    const bucketAttributes = [
        "currency",
        [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
        [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "amount"],
    ];
    const windowMs = HEALTH_WINDOW_DAYS * 24 * 3600000;
    const windowStart = new Date(now - windowMs);
    const priorStart = new Date(now - windowMs * 2);
    const countByMerchantStatus = (from, to) => db_1.models.gatewayPayment.findAll({
        where: {
            testMode: isTestMode,
            createdAt: { [sequelize_1.Op.gte]: from, [sequelize_1.Op.lt]: to },
        },
        attributes: ["merchantId", "status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
        group: ["merchantId", "status"],
        raw: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching gateway aggregates");
    const [totalMerchants, activeMerchants, pendingMerchants, totalPayments, completedPayments, pendingPayments, failedPayments, volumeByCurrency, refundStats, refundedPayments, partiallyRefundedPayments, pendingPayouts, breachedPayouts, duePayouts, oldestPending, payoutsByCurrency, recentRows, priorRows, recentPayments,] = await Promise.all([
        db_1.models.gatewayMerchant.count(),
        db_1.models.gatewayMerchant.count({ where: { status: "ACTIVE" } }),
        db_1.models.gatewayMerchant.count({ where: { status: "PENDING" } }),
        db_1.models.gatewayPayment.count({ where: paymentWhere }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "COMPLETED" } }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "PENDING" } }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "FAILED" } }),
        db_1.models.gatewayPayment.findAll({
            where: {
                status: "COMPLETED",
                testMode: isTestMode,
            },
            attributes: [
                "currency",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "volume"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("feeAmount")), "fees"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
            ],
            group: ["currency"],
            raw: true,
        }),
        db_1.models.gatewayRefund.findAll({
            where: {
                status: "COMPLETED",
            },
            attributes: [
                [(0, sequelize_1.col)("gatewayRefund.currency"), "currency"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("gatewayRefund.amount")), "amount"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("gatewayRefund.id")), "count"],
            ],
            include: [
                {
                    model: db_1.models.gatewayPayment,
                    as: "payment",
                    where: { testMode: isTestMode },
                    attributes: [],
                },
            ],
            group: ["gatewayRefund.currency"],
            raw: true,
        }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "REFUNDED" } }),
        db_1.models.gatewayPayment.count({ where: { ...paymentWhere, status: "PARTIALLY_REFUNDED" } }),
        db_1.models.gatewayPayout.findOne({
            where: { status: "PENDING" },
            attributes: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            raw: true,
        }),
        db_1.models.gatewayPayout.findAll({
            where: { status: "PENDING", createdAt: { [sequelize_1.Op.lt]: breachedCutoff } },
            attributes: bucketAttributes,
            group: ["currency"],
            raw: true,
        }),
        db_1.models.gatewayPayout.findAll({
            where: {
                status: "PENDING",
                createdAt: { [sequelize_1.Op.gte]: breachedCutoff, [sequelize_1.Op.lt]: dueCutoff },
            },
            attributes: bucketAttributes,
            group: ["currency"],
            raw: true,
        }),
        db_1.models.gatewayPayout.findOne({
            where: { status: "PENDING" },
            attributes: ["createdAt"],
            order: [["createdAt", "ASC"]],
            raw: true,
        }),
        db_1.models.gatewayPayout.findAll({
            where: { status: "PENDING" },
            attributes: bucketAttributes,
            group: ["currency"],
            raw: true,
        }),
        countByMerchantStatus(windowStart, new Date(now)),
        countByMerchantStatus(priorStart, windowStart),
        db_1.models.gatewayPayment.findAll({
            where: { testMode: isTestMode },
            attributes: [
                "id",
                "paymentIntentId",
                "amount",
                "currency",
                "walletType",
                "status",
                "feeAmount",
                "description",
                "createdAt",
                "merchantId",
                "customerId",
            ],
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
        }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Comparing merchant success rates across windows");
    const fold = (rows) => {
        const out = new Map();
        for (const row of rows) {
            const merchantId = row.merchantId;
            if (!merchantId)
                continue;
            const count = Number(row.count) || 0;
            const entry = out.get(merchantId) || { attempts: 0, succeeded: 0, failed: 0 };
            if (SUCCEEDED.includes(row.status)) {
                entry.attempts += count;
                entry.succeeded += count;
            }
            else if (FAILED.includes(row.status)) {
                entry.attempts += count;
                entry.failed += count;
            }
            out.set(merchantId, entry);
        }
        return out;
    };
    const recentByMerchant = fold(recentRows);
    const priorByMerchant = fold(priorRows);
    const comparable = [];
    for (const [merchantId, recent] of recentByMerchant) {
        const prior = priorByMerchant.get(merchantId);
        if (recent.attempts < HEALTH_MIN_ATTEMPTS)
            continue;
        if (!prior || prior.attempts < HEALTH_MIN_ATTEMPTS)
            continue;
        const successRate = (recent.succeeded / recent.attempts) * 100;
        const priorSuccessRate = (prior.succeeded / prior.attempts) * 100;
        comparable.push({
            id: merchantId,
            attempts: recent.attempts,
            succeeded: recent.succeeded,
            failed: recent.failed,
            successRate,
            priorAttempts: prior.attempts,
            priorSuccessRate,
            delta: successRate - priorSuccessRate,
        });
    }
    const declining = comparable
        .filter((entry) => entry.delta <= -HEALTH_DROP_POINTS)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 5);
    const currencies = volumeByCurrency.map((row) => ({
        currency: row.currency,
        volume: Number(row.volume) || 0,
        fees: Number(row.fees) || 0,
        count: Number(row.count) || 0,
    }));
    const splitRows = (rows) => { var _a; return ((_a = rows) !== null && _a !== void 0 ? _a : []).map((row) => ({
        currency: row.currency,
        count: Number(row.count) || 0,
        amount: Number(row.amount) || 0,
    })); };
    const refundCurrencies = splitRows(refundStats);
    const pendingRows = splitRows(payoutsByCurrency);
    const breachedRows = splitRows(breachedPayouts);
    const dueRows = splitRows(duePayouts);
    const rateCurrencies = new Set();
    for (const row of currencies)
        if (row.currency)
            rateCurrencies.add(row.currency);
    for (const rows of [refundCurrencies, pendingRows, breachedRows, dueRows]) {
        for (const row of rows)
            if (row.currency)
                rateCurrencies.add(row.currency);
    }
    const [decliningMerchants, rates] = await Promise.all([
        declining.length
            ? db_1.models.gatewayMerchant.findAll({
                where: { id: { [sequelize_1.Op.in]: declining.map((entry) => entry.id) } },
                attributes: ["id", "name", "logo"],
                raw: true,
            })
            : Promise.resolve([]),
        (0, utils_1.getUsdRates)([...rateCurrencies]),
    ]);
    const merchantById = new Map(decliningMerchants.map((m) => [m.id, m]));
    const amountMap = (rows, pick) => {
        const out = new Map();
        for (const row of rows)
            out.set(row.currency, pick(row));
        return out;
    };
    const unpricedPayments = new Set();
    const totalVolume = priceBucket(amountMap(currencies, (row) => row.volume), rates, unpricedPayments);
    const totalFees = priceBucket(amountMap(currencies, (row) => row.fees), rates, unpricedPayments);
    const totalRefunded = priceBucket(amountMap(refundCurrencies, (row) => row.amount), rates, unpricedPayments);
    const netVolume = Number((totalVolume - totalRefunded).toFixed(2));
    const unpricedPayouts = new Set();
    const priceRows = (rows) => priceBucket(amountMap(rows, (row) => row.amount), rates, unpricedPayouts);
    const pendingCount = Number(pendingPayouts === null || pendingPayouts === void 0 ? void 0 : pendingPayouts.count) || 0;
    const pendingAmount = priceRows(pendingRows);
    const indexByCurrency = (rows) => {
        const out = new Map();
        for (const row of rows)
            out.set(row.currency, row);
        return out;
    };
    const breachedByCurrency = indexByCurrency(breachedRows);
    const dueByCurrency = indexByCurrency(dueRows);
    const freshRows = pendingRows
        .map((row) => {
        var _a, _b, _c, _d;
        const breached = breachedByCurrency.get(row.currency);
        const due = dueByCurrency.get(row.currency);
        return {
            currency: row.currency,
            count: Math.max(0, row.count - ((_a = breached === null || breached === void 0 ? void 0 : breached.count) !== null && _a !== void 0 ? _a : 0) - ((_b = due === null || due === void 0 ? void 0 : due.count) !== null && _b !== void 0 ? _b : 0)),
            amount: Math.max(0, row.amount - ((_c = breached === null || breached === void 0 ? void 0 : breached.amount) !== null && _c !== void 0 ? _c : 0) - ((_d = due === null || due === void 0 ? void 0 : due.amount) !== null && _d !== void 0 ? _d : 0)),
        };
    })
        .filter((row) => row.count > 0 || row.amount > 0);
    const sumCounts = (rows) => rows.reduce((sum, row) => sum + row.count, 0);
    const breachedCount = sumCounts(breachedRows);
    const dueCount = sumCounts(dueRows);
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
            currency: "USD",
            totalVolume,
            totalRefunded,
            netVolume,
            totalFees,
            unpriced: [...unpricedPayments],
            currencies,
        },
        payouts: {
            pending: pendingCount,
            currency: "USD",
            pendingAmount,
            unpriced: [...unpricedPayouts],
            slaHours: PAYOUT_SLA_HOURS,
            oldestPendingAt: (_a = oldestPending === null || oldestPending === void 0 ? void 0 : oldestPending.createdAt) !== null && _a !== void 0 ? _a : null,
            aging: {
                breached: {
                    count: breachedCount,
                    amount: priceRows(breachedRows),
                    currencies: breachedRows,
                },
                due: {
                    count: dueCount,
                    amount: priceRows(dueRows),
                    currencies: dueRows,
                },
                fresh: {
                    count: Math.max(0, pendingCount - breachedCount - dueCount),
                    amount: priceRows(freshRows),
                    currencies: freshRows,
                },
            },
            currencies: pendingRows,
        },
        merchantHealth: {
            windowDays: HEALTH_WINDOW_DAYS,
            minAttempts: HEALTH_MIN_ATTEMPTS,
            dropPoints: HEALTH_DROP_POINTS,
            evaluated: comparable.length,
            merchants: declining.map((entry) => { var _a, _b; var _c; return ({
                ...entry,
                name: ((_a = merchantById.get(entry.id)) === null || _a === void 0 ? void 0 : _a.name) || "Unknown",
                logo: (_c = (_b = merchantById.get(entry.id)) === null || _b === void 0 ? void 0 : _b.logo) !== null && _c !== void 0 ? _c : null,
            }); }),
        },
        generatedAt: new Date().toISOString(),
        recentPayments: recentPayments.map((p) => { var _a, _b, _c; return ({
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
                    name: `${p.customer.firstName || ""} ${p.customer.lastName || ""}`.trim() ||
                        null,
                    email: p.customer.email,
                    avatar: p.customer.avatar,
                }
                : null,
            createdAt: p.createdAt,
        }); }),
    };
};
