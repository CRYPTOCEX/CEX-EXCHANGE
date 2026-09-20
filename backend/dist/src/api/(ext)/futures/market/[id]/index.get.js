"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a specific futures market",
    description: "Fetches details of a specific futures market.",
    operationId: "getFuturesMarket",
    tags: ["Futures", "Markets"],
    logModule: "FUTURES",
    logTitle: "Get futures market by ID",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Futures Market ID" },
        },
    ],
    responses: {
        200: {
            description: "Futures market details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseFuturesMarketSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Futures Market"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { params, ctx } = data;
    const { id } = params;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching futures market with ID: ${id}`);
    const market = await db_1.models.futuresMarket.findOne({
        where: { id },
        attributes: ["id", "currency", "pair", "status"],
    });
    if (!market) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Futures market not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Futures market not found" });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Retrieved futures market: ${market.currency}/${market.pair}`);
    return market;
};
