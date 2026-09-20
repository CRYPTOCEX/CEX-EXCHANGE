"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves detailed information of a specific binary market by ID",
    operationId: "getBinaryMarketById",
    tags: ["Admin", "Binary Markets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the binary market to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Binary market details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.binaryMarketSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Binary Market"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.binary.market",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params } = data;
    const { id } = params;
    const binaryMarket = await db_1.models.binaryMarket.findOne({
        where: { id },
    });
    if (!binaryMarket) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Binary market not found" });
    }
    return binaryMarket;
};
