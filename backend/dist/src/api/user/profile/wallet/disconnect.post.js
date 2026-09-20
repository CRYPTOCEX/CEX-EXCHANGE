"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/auth/utils");
const console_1 = require("@b/utils/console");
const user_activity_1 = require("@b/utils/user-activity");
const cache_1 = require("@b/utils/cache");
const redis_1 = require("@b/utils/redis");
const nonce_get_1 = require("@b/api/auth/login/nonce.get");
exports.metadata = {
    summary: "Disconnects a wallet address for the user",
    description: "Disconnects a wallet address for the authenticated user and removes the record from providerUser. When the walletDisconnectRequiresSignature setting is on, a fresh SIWE signature over the address being unlinked must accompany the request.",
    operationId: "disconnectWallet",
    tags: ["Auth"],
    requiresAuth: true,
    logModule: "WALLET",
    logTitle: "Disconnect wallet",
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
                        message: {
                            type: "string",
                            description: "SIWE message. Required only when walletDisconnectRequiresSignature is enabled.",
                        },
                        signature: {
                            type: "string",
                            description: "Signature of the SIWE message. Required only when walletDisconnectRequiresSignature is enabled.",
                        },
                    },
                    required: ["address"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Wallet address disconnected successfully",
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
            description: "Invalid request (e.g., missing address, or a missing signature while walletDisconnectRequiresSignature is on)",
        },
        401: {
            description: "Unauthorized (e.g., user not authenticated, or signature verification failed)",
        },
        500: {
            description: "Internal server error",
        },
    },
};
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { address, message, signature } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    await (0, utils_1.ensureWalletConnectAvailable)();
    if (!address) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Address missing");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Address is required",
        });
    }
    try {
        const requiresSignature = await cache_1.CacheManager.getInstance().getSettingBool("walletDisconnectRequiresSignature", false);
        if (requiresSignature) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying wallet ownership before unlinking");
            if (!message || !signature) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Signature required to disconnect wallet");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "A wallet signature is required to unlink this address.",
                });
            }
            const parsed = (0, utils_1.parseAndValidateSiwe)(message, (0, utils_1.expectedSiweDomain)());
            if (parsed.address !== String(address).toLowerCase()) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Signature address does not match the address being unlinked");
                throw (0, error_1.createError)({
                    statusCode: 401,
                    message: "Signature does not match the address being unlinked.",
                });
            }
            if (!projectId) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("WalletConnect project ID not configured");
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Wallet connect project ID is not defined",
                });
            }
            const consumed = await redis_1.RedisSingleton.getInstance().del(`${nonce_get_1.SIWE_NONCE_PREFIX}${parsed.nonce}`);
            if (consumed !== 1) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid, expired, or already-used nonce");
                throw (0, error_1.createError)({
                    statusCode: 401,
                    message: "Invalid or expired nonce",
                });
            }
            const ok = await (0, utils_1.verifySignature)({
                address: parsed.address,
                message,
                signature,
                chainId: parsed.chainId,
                projectId,
            });
            if (!ok) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Signature verification failed");
                throw (0, error_1.createError)({
                    statusCode: 401,
                    message: "Signature verification failed",
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding wallet connection");
        const provider = await db_1.models.providerUser.findOne({
            where: {
                provider: "WALLET",
                providerUserId: String(address).toLowerCase(),
                userId: user.id,
            },
        });
        if (!provider) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Wallet not registered");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Wallet not registered",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Disconnecting wallet");
        await provider.update({
            providerUserId: `deleted:${provider.id}`,
            isPrimary: null,
        });
        await provider.destroy();
        void (0, user_activity_1.recordUserActivity)({
            userId: user.id,
            type: "wallet.disconnected",
            title: "Wallet disconnected",
            description: `${address.slice(0, 6)}…${address.slice(-4)}`,
            severity: "warning",
            req: data,
            metadata: { address, verifiedBySignature: requiresSignature },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet disconnected successfully");
        return { message: "Wallet address disconnected successfully" };
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.statusCode)
            throw error;
        console_1.logger.error("USER", "Error disconnecting wallet", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to disconnect wallet");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal server error",
        });
    }
};
