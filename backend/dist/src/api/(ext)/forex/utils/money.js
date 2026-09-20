"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNED_PROFIT_SQL_QUALIFIED = exports.SIGNED_PROFIT_SQL = void 0;
exports.investedByCurrency = investedByCurrency;
exports.summarise = summarise;
exports.toReportingValue = toReportingValue;
exports.toUsdTotal = toUsdTotal;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.SIGNED_PROFIT_SQL = "CASE WHEN result = 'LOSS' THEN -ABS(profit) ELSE profit END";
exports.SIGNED_PROFIT_SQL_QUALIFIED = "CASE WHEN forexInvestment.result = 'LOSS' " +
    "THEN -ABS(forexInvestment.profit) ELSE forexInvestment.profit END";
async function investedByCurrency(where = {}) {
    const rows = (await db_1.models.forexInvestment.findAll({
        attributes: [
            [(0, sequelize_1.col)("plan.currency"), "currency"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("forexInvestment.amount")), "totalInvested"],
            [
                (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(exports.SIGNED_PROFIT_SQL_QUALIFIED)), 0),
                "totalProfit",
            ],
        ],
        include: [
            {
                model: db_1.models.forexPlan,
                as: "plan",
                attributes: [],
                required: true,
            },
        ],
        where,
        group: [(0, sequelize_1.col)("plan.currency")],
        raw: true,
    }));
    return rows
        .filter((r) => r.currency)
        .map((r) => ({
        currency: r.currency,
        totalInvested: parseFloat(r.totalInvested) || 0,
        totalProfit: parseFloat(r.totalProfit) || 0,
    }))
        .sort((a, b) => b.totalInvested - a.totalInvested);
}
function summarise(rows) {
    var _a;
    return {
        investedByCurrency: rows,
        primaryInvested: (_a = rows[0]) !== null && _a !== void 0 ? _a : null,
        mixedCurrencies: rows.length > 1,
    };
}
async function toReportingValue(amount, currency, logTag = "FOREX") {
    var _a, _b;
    const value = Number(amount);
    if (!Number.isFinite(value))
        return 0;
    if (!currency)
        return value;
    try {
        const spot = await db_1.models.exchangeCurrency.findOne({
            where: { currency },
            attributes: ["price"],
        });
        const spotPrice = Number((_a = spot === null || spot === void 0 ? void 0 : spot.price) !== null && _a !== void 0 ? _a : 0);
        if (spotPrice > 0)
            return value * spotPrice;
        const fiat = await db_1.models.currency.findOne({
            where: { id: currency },
            attributes: ["price"],
        });
        const fiatPrice = Number((_b = fiat === null || fiat === void 0 ? void 0 : fiat.price) !== null && _b !== void 0 ? _b : 0);
        if (fiatPrice > 0)
            return value / fiatPrice;
    }
    catch (error) {
        console_1.logger.warn(logTag, `Could not price ${currency}; comparing raw units instead`);
    }
    return value;
}
async function toUsdTotal(rows, field = "totalInvested") {
    const converted = await Promise.all(rows.map((r) => toReportingValue(r[field], r.currency)));
    return converted.reduce((sum, v) => sum + v, 0);
}
