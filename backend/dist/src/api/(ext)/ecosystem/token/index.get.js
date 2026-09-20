"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves all ecosystem tokens",
    description: "Fetches a list of all active tokens available in the ecosystem.",
    operationId: "listEcosystemTokens",
    tags: ["Ecosystem", "Tokens"],
    logModule: "ECOSYSTEM",
    logTitle: "List ecosystem tokens",
    responses: {
        200: {
            description: "Tokens retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseTokenSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Token"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active ecosystem tokens");
        const tokens = await db_1.models.ecosystemToken.findAll({
            where: { status: true },
            attributes: [
                "name",
                "currency",
                "chain",
                "type",
                "status",
                "precision",
                "limits",
                "decimals",
                "icon",
                "contractType",
                "network",
                "fee",
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${(tokens === null || tokens === void 0 ? void 0 : tokens.length) || 0} active tokens`);
        return tokens;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to fetch tokens: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch tokens: ${error.message}`,
        });
    }
};
