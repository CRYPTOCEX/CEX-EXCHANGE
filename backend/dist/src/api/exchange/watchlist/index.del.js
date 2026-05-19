"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.deleteWatchlist = deleteWatchlist;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Remove Item from Watchlist",
    operationId: "removeWatchlistItem",
    tags: ["Exchange", "Watchlist"],
    description: "Removes an item from the watchlist for the authenticated user.",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "ID of the watchlist item to remove.",
            schema: { type: "number" },
        },
    ],
    responses: (0, query_1.deleteRecordResponses)("Watchlist"),
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Remove watchlist item",
};
exports.default = async (data) => {
    const { ctx, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching watchlist item details`);
    const item = await db_1.models.exchangeWatchlist.findOne({
        where: { id: Number(data.params.id), userId: user.id },
    });
    if (!item) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Watchlist item not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Removing watchlist item`);
    await deleteWatchlist(Number(data.params.id), user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Removed watchlist item: ${item.symbol}`);
};
async function deleteWatchlist(id, userId) {
    const where = userId ? { id, userId } : { id };
    await db_1.models.exchangeWatchlist.destroy({ where });
}
