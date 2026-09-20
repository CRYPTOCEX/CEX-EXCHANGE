"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves ecosystem token options",
    description: "Retrieves active ecosystem tokens formatted as selectable options for dropdowns and forms. Returns deduplicated tokens by currency symbol to prevent duplicate entries.",
    operationId: "getEcosystemTokenOptions",
    tags: ["Admin", "Ecosystem", "Token"],
    requiresAuth: true,
    logModule: "ADMIN_ECO",
    logTitle: "Get token options",
    responses: {
        200: {
            description: "Ecosystem token options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "Token ID",
                                },
                                name: {
                                    type: "string",
                                    description: "Formatted token name (CURRENCY - Name (Chain))",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active ecosystem tokens");
        const tokens = await db_1.models.ecosystemToken.findAll({
            where: { status: true },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deduplicating tokens by currency");
        const seenSymbols = new Set();
        const deduplicated = [];
        for (const token of tokens) {
            if (!seenSymbols.has(token.currency)) {
                seenSymbols.add(token.currency);
                deduplicated.push({
                    id: token.id,
                    name: `${token.currency} - ${token.name} (${token.chain})`,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Token options retrieved successfully");
        return deduplicated;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)(500, "An error occurred while fetching ecosystem tokens");
    }
};
