"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Registers a wallet address for the user",
    description: "Registers a wallet address for the authenticated user",
    operationId: "registerWallet",
    tags: ["Auth"],
    requiresAuth: true,
    logModule: "WALLET",
    logTitle: "Connect wallet",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        address: {
                            type: "string",
                            description: "Wallet address",
                        },
                        chainId: {
                            type: "number",
                            description: "Blockchain chain ID",
                        },
                    },
                    required: ["address", "chainId"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Wallet address registered successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., missing address or chainId)",
        },
        401: {
            description: "Unauthorized (e.g., user not authenticated)",
        },
        500: {
            description: "Internal server error",
        },
    },
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { address, chainId } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    if (!address || !chainId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Address or chainId missing");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Address and chainId are required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Registering wallet address");
        const [provider, created] = await db_1.models.providerUser.findOrCreate({
            where: { providerUserId: address, userId: user.id },
            defaults: {
                userId: user.id,
                providerUserId: address,
                provider: "WALLET",
            },
        });
        if (!created) {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn("Wallet already registered");
            return { message: "Wallet already registered" };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet connected successfully");
        return { message: "Wallet address registered successfully" };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to connect wallet");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal server error",
        });
    }
};
