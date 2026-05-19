"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const constants_1 = require("@b/utils/constants");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
let getFiltered;
try {
    const module = require("@b/api/(ext)/ecosystem/utils/scylla/query");
    getFiltered = module.getFiltered;
}
catch (e) {
}
exports.metadata = {
    summary: "Lists all futures positions with pagination and filtering",
    operationId: "listFuturesPositions",
    tags: ["Admin", "Futures", "Position"],
    description: "Retrieves a paginated list of all futures positions from ScyllaDB with support for filtering, sorting, and search. Returns position details including side, entry price, amount, leverage, unrealized PnL, stop loss, take profit, and associated user information.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Futures positions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { type: "object", properties: utils_1.positionSchema },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Futures Positions"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.futures.position",
    logModule: "ADMIN_FUTURES",
    logTitle: "List futures positions",
};
const keyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
exports.default = async (data) => {
    const { query, ctx } = data;
    if (!getFiltered) {
        return {
            error: "Ecosystem extension not available",
            status: 500
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching futures positions");
    const table = "position";
    const partitionKeys = ["userId"];
    const result = await getFiltered({
        table,
        query,
        filter: query.filter,
        sortField: query.sortField || "createdAt",
        sortOrder: query.sortOrder || "DESC",
        perPage: Number(query.perPage) || 10,
        allowFiltering: true,
        keyspace,
        partitionKeys,
        transformColumns: [
            "entryPrice",
            "amount",
            "leverage",
            "unrealizedPnl",
            "stopLossPrice",
            "takeProfitPrice",
        ],
        nonStringLikeColumns: ["userId"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.items.length} futures positions`);
    return result;
};
