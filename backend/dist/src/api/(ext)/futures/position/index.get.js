"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const positions_1 = require("@b/api/(ext)/futures/utils/queries/positions");
let fromBigInt;
try {
    const module = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = module.fromBigInt;
}
catch (e) {
}
exports.metadata = {
    summary: "List Futures Positions",
    operationId: "listFuturesPositions",
    tags: ["Futures", "Positions"],
    logModule: "FUTURES",
    logTitle: "List futures positions",
    description: "Retrieves a list of futures positions for the authenticated user.",
    parameters: [
        {
            name: "currency",
            in: "query",
            description: "Currency of the positions to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "pair",
            in: "query",
            description: "Pair of the positions to retrieve.",
            schema: { type: "string" },
        },
        {
            name: "type",
            in: "query",
            description: "Type of positions to retrieve.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "A list of futures positions",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                userId: { type: "string" },
                                symbol: { type: "string" },
                                side: { type: "string" },
                                entryPrice: { type: "string" },
                                amount: { type: "string" },
                                leverage: { type: "string" },
                                unrealizedPnl: { type: "string" },
                                status: { type: "string" },
                                createdAt: { type: "string", format: "date-time" },
                                updatedAt: { type: "string", format: "date-time" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Position"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { user, query, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, pair, type } = query;
    try {
        const symbol = currency && pair ? `${currency}/${pair}` : undefined;
        const status = type === "OPEN_POSITIONS" ? "OPEN" : undefined;
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Fetching futures positions${symbol ? ` for ${symbol}` : ""}${status ? ` (${status})` : ""}`);
        const positions = await (0, positions_1.getPositions)(user.id, symbol, status);
        if (!positions || positions.length === 0) {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, "No positions found");
            return [];
        }
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Formatting position data");
        const result = positions.map((position) => ({
            ...position,
            entryPrice: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
            amount: fromBigInt ? fromBigInt(position.amount) : position.amount,
            leverage: position.leverage,
            unrealizedPnl: fromBigInt ? fromBigInt(position.unrealizedPnl) : position.unrealizedPnl,
            createdAt: position.createdAt.toISOString(),
            updatedAt: position.updatedAt.toISOString(),
        }));
        let finalResult = result;
        if (type === "POSITIONS_HISTORY") {
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, "Filtering for position history");
            finalResult = result.filter((position) => position.status !== "OPEN");
        }
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _g === void 0 ? void 0 : _g.call(ctx, `Retrieved ${finalResult.length} positions`);
        return finalResult;
    }
    catch (error) {
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _h === void 0 ? void 0 : _h.call(ctx, `Failed to retrieve positions: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to retrieve positions: ${error.message}`,
        });
    }
};
