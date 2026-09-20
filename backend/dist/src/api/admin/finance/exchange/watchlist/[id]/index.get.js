"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific exchange watchlist entry by ID",
    operationId: "getExchangeWatchlistById",
    tags: ["Admin", "Exchange Watchlists"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the exchange watchlist entry to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Exchange watchlist entry details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseExchangeWatchlistSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange Watchlist"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.exchange.watchlist",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params } = data;
    return await (0, query_1.getRecord)("exchangeWatchlist", params.id);
};
