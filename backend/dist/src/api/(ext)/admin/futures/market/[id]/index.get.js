"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific futures market",
    operationId: "getFuturesMarketById",
    tags: ["Admin", "Futures", "Market"],
    description: "Fetches complete details of a futures market including currency pair, status, trending indicators, and trading parameters such as precision, limits, and fees.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the futures market to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Futures market details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.futuresMarketSchema,
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Futures Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.futures.market",
    logModule: "ADMIN_FUT",
    logTitle: "Get Futures Market",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching futures market record");
    const result = await (0, query_1.getRecord)("futuresMarket", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Retrieved futures market");
    return result;
};
