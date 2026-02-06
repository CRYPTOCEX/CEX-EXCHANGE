"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Deletes a specific ecosystem market",
    description: "Deletes a single ecosystem market by its ID. This operation also removes all associated market data from the database for the market. The market is permanently deleted (force delete).",
    operationId: "deleteEcosystemMarket",
    tags: ["Admin", "Ecosystem", "Market"],
    parameters: (0, query_1.deleteRecordParams)("Ecosystem Market"),
    responses: {
        200: {
            description: "Market deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Market"),
        500: errors_1.serverErrorResponse,
    },
    permission: "delete.ecosystem.market",
    requiresAuth: true,
    logModule: "ADMIN_ECO",
    logTitle: "Delete market",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching market details");
    const market = await db_1.models.ecosystemMarket.findOne({
        where: { id: params.id },
        attributes: ["currency", "pair"],
        paranoid: false,
    });
    if (!market) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
    }
    const currency = market.currency;
    const pair = market.pair;
    const symbol = `${currency}/${pair}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for open copy trading trades");
    try {
        const openCopyTrades = await ((_a = db_1.models.copyTradingTrade) === null || _a === void 0 ? void 0 : _a.count({
            where: {
                symbol,
                status: { [sequelize_1.Op.in]: ["PENDING", "OPEN", "PARTIALLY_FILLED"] },
            },
        }));
        if (openCopyTrades && openCopyTrades > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot delete market with ${openCopyTrades} open copy trading trades. Please close or cancel all copy trades first.`,
            });
        }
    }
    catch (error) {
        if (!((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("copy trading"))) {
            throw error;
        }
    }
    const postDelete = async () => {
        var _a, _b;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting market data from database");
        await (0, queries_1.deleteAllMarketData)(currency);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cleaning up copy trading data");
        try {
            await ((_a = db_1.models.copyTradingFollowerAllocation) === null || _a === void 0 ? void 0 : _a.update({ isActive: false }, { where: { symbol } }));
            await ((_b = db_1.models.copyTradingLeaderMarket) === null || _b === void 0 ? void 0 : _b.update({ isActive: false }, { where: { symbol } }));
        }
        catch (e) {
        }
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting market record");
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecosystemMarket",
        id: params.id,
        query: { ...query, force: true },
        postDelete,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market deleted successfully");
    return result;
};
