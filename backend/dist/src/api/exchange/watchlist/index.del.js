"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.deleteWatchlist = deleteWatchlist;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
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
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching watchlist item details`);
    const item = await db_1.models.exchangeWatchlist.findByPk(Number(data.params.id));
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Removing watchlist item`);
    await deleteWatchlist(Number(data.params.id));
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Removed watchlist item${item ? `: ${item.symbol}` : ''}`);
};
async function deleteWatchlist(id) {
    await db_1.models.exchangeWatchlist.destroy({
        where: {
            id,
        },
    });
}
