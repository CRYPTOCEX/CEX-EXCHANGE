"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Logs in a user with SIWE",
    description: "Logs in a user using Sign-In With Ethereum (SIWE)",
    operationId: "siweLogin",
    tags: ["Auth"],
    requiresAuth: false,
    logModule: "LOGIN",
    logTitle: "Wallet login",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "SIWE message",
                        },
                        signature: {
                            type: "string",
                            description: "Signature of the SIWE message",
                        },
                    },
                    required: ["message", "signature"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "User logged in successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            id: {
                                type: "string",
                                description: "User ID",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., invalid message or signature)",
        },
        401: {
            description: "Unauthorized (e.g., signature verification failed)",
        },
    },
};
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
exports.default = async (data) => {
    const { body, ctx } = data;
    const { message, signature } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating wallet login request");
        if (!message || !signature) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Message and signature are required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Message and signature are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking WalletConnect configuration");
        if (!projectId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("WalletConnect project ID not configured");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Wallet connect project ID is not defined",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Extracting wallet address and chain ID");
        const address = (0, utils_1.getAddressFromMessage)(message);
        const chainId = (0, utils_1.getChainIdFromMessage)(message);
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Verifying signature for address: ${address}`);
        const isValid = await (0, utils_1.verifySignature)({
            address,
            message,
            signature,
            chainId,
            projectId,
        });
        if (!isValid) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Signature verification failed");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Signature verification failed",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up wallet provider");
        const provider = await db_1.models.providerUser.findOne({
            where: { providerUserId: address },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    include: [
                        {
                            model: db_1.models.twoFactor,
                            as: "twoFactor",
                        },
                    ],
                },
            ],
        });
        if (!provider) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Wallet address not recognized");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Wallet address not recognized",
            });
        }
        const user = provider.user;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user status");
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found",
            });
        }
        if (user.status === "BANNED") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account banned");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account has been banned. Please contact support.",
            });
        }
        if (user.status === "SUSPENDED") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account suspended");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account is suspended. Please contact support.",
            });
        }
        if (user.status === "INACTIVE") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account inactive");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account is inactive. Please verify your email or contact support.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "You have been logged in successfully",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${user.email} logged in with wallet ${address}`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Wallet login failed");
        throw error;
    }
};
