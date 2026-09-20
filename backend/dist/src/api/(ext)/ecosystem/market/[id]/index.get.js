"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a specific ecosystem market",
    description: "Fetches details of a specific market in the ecosystem.",
    operationId: "getEcosystemMarket",
    tags: ["Ecosystem", "Markets"],
    logModule: "ECOSYSTEM",
    logTitle: "Get ecosystem market details",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "number", description: "Market ID" },
        },
    ],
    responses: {
        200: {
            description: "Market details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseMarketSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Market"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching market with ID ${id}`);
    const market = await db_1.models.ecosystemMarket.findOne({
        where: { id },
        attributes: ["id", "name", "status"],
    });
    if (!market) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Market ${id} not found`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved market ${id}`);
    return market;
};
