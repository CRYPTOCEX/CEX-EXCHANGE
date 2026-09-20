"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdersController = exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
const tokens_1 = require("@b/api/(ext)/ecosystem/utils/tokens");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Fetches token holders for an ecosystem token",
    description: "Retrieves a list of all holders and their balances for a specific ecosystem token by querying the blockchain. Returns both the token details and the list of holder addresses with their respective balances.",
    operationId: "getEcosystemTokenHolders",
    tags: ["Admin", "Ecosystem", "Token"],
    logModule: "ADMIN_ECO",
    logTitle: "Get token holders",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "ID of the ecosystem token",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Token holders retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            token: {
                                type: "object",
                                properties: {
                                    id: { type: "string", description: "Token ID" },
                                    name: { type: "string", description: "Token name" },
                                    contract: {
                                        type: "string",
                                        description: "Token contract address",
                                    },
                                    currency: { type: "string", description: "Token currency symbol" },
                                    chain: { type: "string", description: "Blockchain chain" },
                                },
                            },
                            holders: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        address: {
                                            type: "string",
                                            description: "Holder's wallet address",
                                        },
                                        balance: {
                                            type: "string",
                                            description: "Amount of tokens held",
                                        },
                                    },
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
    requiresAuth: true,
    permission: "view.ecosystem.token",
};
const holdersController = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const { id } = params;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching token details");
        const token = await (0, utils_1.getEcosystemTokenById)(id);
        if (!token) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Token not found for id: ${id}` });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching token holders");
        const holders = await (0, tokens_1.fetchTokenHolders)(token.chain, token.network, token.contract);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${holders.length} token holders`);
        return {
            token,
            holders,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to fetch token holders: ${error.message}`,
        });
    }
};
exports.holdersController = holdersController;
