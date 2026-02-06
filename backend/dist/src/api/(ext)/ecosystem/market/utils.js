"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseMarketSchema = void 0;
exports.getMarket = getMarket;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
async function getMarket(currency, pair, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching market for ${currency}/${pair}`);
        const market = await db_1.models.ecosystemMarket.findOne({
            where: {
                currency,
                pair,
            },
        });
        if (!market) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Market not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Market found for ${currency}/${pair}`);
        return market;
    }
    catch (error) {
        if (error.message !== "Market not found") {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        }
        throw error;
    }
}
const schema_1 = require("@b/utils/schema");
exports.baseMarketSchema = {
    id: (0, schema_1.baseNumberSchema)("Market ID"),
    name: (0, schema_1.baseStringSchema)("Market name"),
    status: (0, schema_1.baseBooleanSchema)("Market status"),
};
