"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Add Item to Watchlist",
    operationId: "addWatchlistItem",
    tags: ["Exchange", "Watchlist"],
    description: "Adds a new item to the watchlist for the authenticated user.",
    requestBody: {
        description: "Data for the watchlist item to add.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: {
                            type: "string",
                            description: "Symbol of the watchlist item",
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
    const { symbol } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating watchlist parameters");
    if (!symbol) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required parameters: symbol." });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking if ${symbol} is already in watchlist`);
    const existingWatchlist = await db_1.models.exchangeWatchlist.findOne({
        where: {
            userId: user.id,
            symbol,
        },
    });
    if (existingWatchlist) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Removing ${symbol} from watchlist`);
        await db_1.models.exchangeWatchlist.destroy({
            where: {
                id: existingWatchlist.id,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Removed ${symbol} from watchlist`);
        return { message: "Item removed from watchlist successfully" };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Adding ${symbol} to watchlist`);
    await db_1.models.exchangeWatchlist.create({
        userId: user.id,
        symbol,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Added ${symbol} to watchlist`);
    return { message: "Item added to watchlist successfully" };
};
