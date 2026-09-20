"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/admin/finance/exchange/market/utils");
exports.metadata = {
    summary: "Updates a specific exchange market",
    operationId: "updateExchangeMarket",
    tags: ["Admin", "Exchange", "Markets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the market to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the market",
        content: {
            "application/json": {
                schema: utils_1.MarketUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Market"),
    requiresAuth: true,
    permission: "edit.exchange.market",
    logModule: "ADMIN_FIN",
    logTitle: "Update Exchange Market",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { currency, pair, metadata, isTrending, isHot } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating exchange market");
    const result = await (0, query_1.updateRecord)("exchangeMarket", id, {
        currency,
        pair,
        metadata,
        isTrending,
        isHot,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
