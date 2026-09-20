"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Remove Item from Watchlist",
    operationId: "removeWatchlistItem",
    tags: ["Exchange", "Watchlist"],
    description: "Removes an item from the watchlist for the authenticated user. Identify it " +
        "by `symbol` (with an optional `type`) or by its row `id`.",
    requestBody: {
        required: false,
        description: "The watchlist entry to remove.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: { type: "string", description: "Symbol to un-watch" },
                        type: {
                            type: "string",
                            enum: ["SPOT", "ECO", "FUTURES"],
                            description: "Market family (defaults to SPOT)",
                        },
                        id: { type: "string", description: "Watchlist row id" },
                    },
                },
            },
        },
    },
    responses: (0, query_1.deleteRecordResponses)("Watchlist"),
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Remove watchlist item",
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx, user, body, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const id = ((_a = body === null || body === void 0 ? void 0 : body.id) !== null && _a !== void 0 ? _a : query === null || query === void 0 ? void 0 : query.id);
    const symbol = ((_b = body === null || body === void 0 ? void 0 : body.symbol) !== null && _b !== void 0 ? _b : query === null || query === void 0 ? void 0 : query.symbol);
    const type = (0, utils_1.normalizeWatchlistType)((_c = body === null || body === void 0 ? void 0 : body.type) !== null && _c !== void 0 ? _c : query === null || query === void 0 ? void 0 : query.type);
    if (!id && !symbol) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Provide either a symbol or a watchlist id to remove",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching watchlist item details");
    const item = await db_1.models.exchangeWatchlist.findOne({
        where: id ? { id, userId: user.id } : { symbol, type, userId: user.id },
    });
    if (!item) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Watchlist item not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing watchlist item");
    await db_1.models.exchangeWatchlist.destroy({
        where: { id: item.id, userId: user.id },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Removed watchlist item: ${item.symbol}`);
    return { message: "Item removed from watchlist successfully" };
};
