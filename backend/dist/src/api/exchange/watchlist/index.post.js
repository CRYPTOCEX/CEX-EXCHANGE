"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Toggle Item in Watchlist",
    operationId: "toggleWatchlistItem",
    tags: ["Exchange", "Watchlist"],
    description: "Adds the symbol to the authenticated user's watchlist, or removes it if it " +
        "is already there. The response says which happened.",
    requestBody: {
        description: "Data for the watchlist item to toggle.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: {
                            type: "string",
                            description: "Symbol of the watchlist item, e.g. BTC/USDT",
                        },
                        type: {
                            type: "string",
                            enum: ["SPOT", "ECO", "FUTURES"],
                            description: "Market family (defaults to SPOT)",
                        },
                    },
                    required: ["symbol"],
                },
            },
        },
        required: true,
    },
    responses: (0, query_1.createRecordResponses)("Watchlist"),
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Toggle watchlist item",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating watchlist parameters");
    const type = (0, utils_1.normalizeWatchlistType)(body === null || body === void 0 ? void 0 : body.type);
    const symbol = await (0, utils_1.assertWatchableSymbol)(body === null || body === void 0 ? void 0 : body.symbol, type);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking if ${symbol} is already in watchlist`);
    const existingWatchlist = await db_1.models.exchangeWatchlist.findOne({
        where: { userId: user.id, symbol, type },
    });
    if (existingWatchlist) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Removing ${symbol} from watchlist`);
        await db_1.models.exchangeWatchlist.destroy({
            where: { id: existingWatchlist.id },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Removed ${symbol} from watchlist`);
        return {
            message: "Item removed from watchlist successfully",
            watching: false,
            symbol,
            type,
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Adding ${symbol} to watchlist`);
    try {
        await db_1.models.exchangeWatchlist.create({ userId: user.id, symbol, type });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.name) !== "SequelizeUniqueConstraintError")
            throw error;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Added ${symbol} to watchlist`);
    return {
        message: "Item added to watchlist successfully",
        watching: true,
        symbol,
        type,
    };
};
