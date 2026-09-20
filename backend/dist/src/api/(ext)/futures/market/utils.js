"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseFuturesMarketSchema = void 0;
exports.getFuturesMarket = getFuturesMarket;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
async function getFuturesMarket(currency, pair) {
    const market = await db_1.models.futuresMarket.findOne({
        where: {
            currency,
            pair,
        },
    });
    if (!market) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Futures market not found" });
    }
    return market;
}
const schema_1 = require("@b/utils/schema");
exports.baseFuturesMarketSchema = {
    id: (0, schema_1.baseNumberSchema)("Futures Market ID"),
    currency: (0, schema_1.baseStringSchema)("Futures market currency"),
    pair: (0, schema_1.baseStringSchema)("Futures market pair"),
    status: (0, schema_1.baseBooleanSchema)("Futures market status"),
};
