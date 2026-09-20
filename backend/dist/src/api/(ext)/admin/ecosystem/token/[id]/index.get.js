"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves an ecosystem token by ID",
    description: "Fetches detailed information about a specific ecosystem token including its contract address, chain, decimals, limits, fees, and other metadata.",
    operationId: "getEcosystemTokenById",
    tags: ["Admin", "Ecosystem", "Token"],
    logModule: "ADMIN_ECO",
    logTitle: "Get token details",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecosystem token to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Ecosystem token retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseEcosystemTokenSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.ecosystem.token",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving token details");
    const token = await (0, query_1.getRecord)("ecosystemToken", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token details retrieved");
    return token;
};
