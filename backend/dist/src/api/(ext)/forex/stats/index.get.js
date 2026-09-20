"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = getForexStats;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/currency/utils");
const sequelize_1 = require("sequelize");
const money_1 = require("../utils/money");
const ACTIVE_INVESTMENT_STATUS = ["ACTIVE"];
const COMPLETED_INVESTMENT_STATUS = ["COMPLETED"];
exports.metadata = {
    summary: "Get Forex Platform Statistics",
    description: "Retrieves platform-wide forex stats: number of active investors, invested " +
        "totals broken down by the plan's currency (and their USD-priced sum), and " +
        "the average return on completed investments.",
    operationId: "getForexStats",
    tags: ["Forex", "Stats"],
    logModule: "FOREX",
    logTitle: "Get Forex Stats",
    responses: {
        200: {
            description: "Forex platform statistics retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            activeInvestors: {
                                type: "number",
                                description: "Unique users with active investments.",
                            },
                            totalInvested: {
                                type: "number",
                                description: "Invested principal in USD. Each plan currency is summed on " +
                                    "its own and priced before the pools are added, so this is a " +
                                    "real unit and not a concatenation of them. While `unpriced` " +
                                    "is non-empty it is a LOWER BOUND. Excludes investments whose " +
                                    "plan row is gone, which have no known denomination.",
                            },
                            unpriced: {
                                type: "array",
                                items: { type: "string" },
                                description: "Plan currencies holding investments that have no USD rate. " +
                                    "Their amounts are omitted from `totalInvested`, never counted " +
                                    "as zero — while this is non-empty the total is a lower bound " +
                                    "and the UI must say so. The full amounts are still in " +
                                    "`investedByCurrency`.",
                            },
                            averageReturn: {
                                type: "number",
                                nullable: true,
                                description: "Average return percentage for completed investments. " +
                                    "Unit-free: it averages a per-row ratio, so it stays valid " +
                                    "on a mixed-currency install. NULL — not 0 — when no " +
                                    "completed investment has a denominator to take a percentage " +
                                    "against; 0 would claim the book is flat.",
                            },
                            investedByCurrency: {
                                type: "array",
                                description: "Invested and (sign-aware) profit totals grouped by the " +
                                    "plan's currency, largest pool first.",
                                items: {
                                    type: "object",
                                    properties: {
                                        currency: { type: "string" },
                                        totalInvested: { type: "number" },
                                        totalProfit: { type: "number" },
                                    },
                                },
                            },
                            primaryInvested: {
                                type: "object",
                                nullable: true,
                                description: "The largest single-currency pool — the only figure that " +
                                    "can honestly carry a currency symbol.",
                                properties: {
                                    currency: { type: "string" },
                                    totalInvested: { type: "number" },
                                    totalProfit: { type: "number" },
                                },
                            },
                            mixedCurrencies: {
                                type: "boolean",
                                description: "True when more than one plan currency holds investments.",
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
};
async function getForexStats(data) {
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing request");
    try {
        const [activeInvestors, currencyRows, avgReturnRow] = await Promise.all([
            db_1.models.forexInvestment.count({
                distinct: true,
                col: "userId",
                where: { status: { [sequelize_1.Op.in]: ACTIVE_INVESTMENT_STATUS } },
            }),
            (0, money_1.investedByCurrency)(),
            db_1.models.forexInvestment.findOne({
                attributes: [
                    [
                        (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("CASE WHEN amount > 0 AND profit IS NOT NULL THEN " +
                            `(((${money_1.SIGNED_PROFIT_SQL}) / amount) * 100) ` +
                            "ELSE NULL END")),
                        "averageReturn",
                    ],
                ],
                where: { status: { [sequelize_1.Op.in]: COMPLETED_INVESTMENT_STATUS } },
                raw: true,
            }),
        ]);
        const rawAverage = avgReturnRow === null || avgReturnRow === void 0 ? void 0 : avgReturnRow.averageReturn;
        const parsedAverage = Number(rawAverage);
        const averageReturn = rawAverage === null || rawAverage === undefined || !Number.isFinite(parsedAverage)
            ? null
            : parsedAverage;
        const { investedByCurrency, primaryInvested, mixedCurrencies } = (0, money_1.summarise)(currencyRows);
        const { total: totalInvested, unpriced } = await (0, utils_1.sumInUSD)(Object.fromEntries(investedByCurrency.map((row) => [row.currency, row.totalInvested])));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
        return {
            activeInvestors,
            totalInvested,
            unpriced,
            averageReturn,
            investedByCurrency,
            primaryInvested,
            mixedCurrencies,
        };
    }
    catch (err) {
        console.error("Error in getForexStats:", err);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
}
