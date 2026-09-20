"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/auth/utils");
const wallet_link_1 = require("@b/utils/wallet-link");
const console_1 = require("@b/utils/console");
const user_activity_1 = require("@b/utils/user-activity");
const redis_1 = require("@b/utils/redis");
const nonce_get_1 = require("@b/api/auth/login/nonce.get");
exports.metadata = {
    summary: "Registers a wallet address for the user",
    description: "Registers a wallet address for the authenticated user after verifying ownership via a Sign-In With Ethereum (SIWE) signature",
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
            description: "Invalid request (e.g., missing or malformed SIWE message)",
        },
        401: {
            description: "Unauthorized (e.g., user not authenticated or signature verification failed)",
        },
        409: {
            description: "The address is already linked to a different account. The DB unique index is on providerUserId alone, so an address belongs to exactly one user platform-wide.",
        },
        500: {
            description: "Internal server error",
        },
    },
};
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { message, signature } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet_connect extension availability");
    await (0, utils_1.ensureWalletConnectAvailable)();
    const vm = (0, wallet_link_1.isWalletVm)(body === null || body === void 0 ? void 0 : body.vm) ? body.vm : "EVM";
    if (vm !== "EVM") {
        return await linkNonEvmWallet(data, vm);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating wallet connect request");
    if (!message || !signature) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Message and signature are required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Message and signature are required",
        });
    }
    if (!projectId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("WalletConnect project ID not configured");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Wallet connect project ID is not defined",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing and validating the SIWE message");
    const { address, chainId, nonce } = (0, utils_1.parseAndValidateSiwe)(message, (0, utils_1.expectedSiweDomain)());
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Consuming single-use connect nonce");
    const redis = redis_1.RedisSingleton.getInstance();
    const consumed = await redis.del(`${nonce_get_1.SIWE_NONCE_PREFIX}${nonce}`);
    if (consumed !== 1) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid, expired, or already-used nonce");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Invalid or expired nonce",
        });
    }
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking whether this address is already linked");
    const existing = await db_1.models.providerUser.findOne({
        where: { provider: "WALLET", providerUserId: address },
    });
    if (existing && existing.userId !== user.id) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Wallet already linked to another account");
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This wallet address is already linked to a different account.",
        });
    }
    if (existing) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Wallet already registered");
        return { message: "Wallet already registered" };
    }
    return await persistWalletLink(data, {
        vm: "EVM",
        address,
        chainId: Number(chainId.split(":")[1]) || null,
    });
};
async function linkNonEvmWallet(data, vm) {
    var _a;
    const { body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating the ${vm} ownership proof`);
    const domain = (0, utils_1.expectedSiweDomain)();
    const request = {
        vm,
        address: String((_a = body === null || body === void 0 ? void 0 : body.address) !== null && _a !== void 0 ? _a : ""),
        message: typeof (body === null || body === void 0 ? void 0 : body.message) === "string" ? body.message : undefined,
        signature: typeof (body === null || body === void 0 ? void 0 : body.signature) === "string" ? body.signature : undefined,
        proof: body === null || body === void 0 ? void 0 : body.proof,
        walletStateInit: typeof (body === null || body === void 0 ? void 0 : body.walletStateInit) === "string" ? body.walletStateInit : undefined,
    };
    const claimedNonce = (0, wallet_link_1.readProofNonce)(request, domain);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Consuming single-use link nonce");
    const redis = redis_1.RedisSingleton.getInstance();
    const consumed = await redis.del(`${nonce_get_1.SIWE_NONCE_PREFIX}${claimedNonce}`);
    if (consumed !== 1) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid, expired, or already-used nonce");
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid or expired nonce" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying the signature");
    const proved = (0, wallet_link_1.verifyWalletProof)(request, domain, claimedNonce);
    const chainId = Number(body === null || body === void 0 ? void 0 : body.chainId);
    return await persistWalletLink(data, {
        vm,
        address: proved.address,
        chainId: Number.isFinite(chainId) && chainId > 0 ? chainId : null,
    });
}
async function persistWalletLink(data, link) {
    const { user, ctx } = data;
    const address = (0, wallet_link_1.normaliseVmAddress)(link.vm, link.address);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking whether this address is already linked");
    const existing = await db_1.models.providerUser.findOne({
        where: { provider: "WALLET", providerUserId: address },
    });
    if (existing && existing.userId !== user.id) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Wallet already linked to another account");
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This wallet address is already linked to a different account.",
        });
    }
    if (existing) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Wallet already registered");
        return { message: "Wallet already registered" };
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Registering wallet address");
        const isFirstEvm = link.vm === "EVM" &&
            (await db_1.models.providerUser.count({
                where: { userId: user.id, provider: "WALLET", isPrimary: true },
            })) === 0;
        await db_1.models.providerUser.create({
            userId: user.id,
            providerUserId: address,
            provider: "WALLET",
            isPrimary: isFirstEvm ? true : null,
            chainId: link.chainId,
            verifiedAt: new Date(),
        });
        void (0, user_activity_1.recordUserActivity)({
            userId: user.id,
            type: "wallet.connected",
            title: "Wallet connected",
            description: `${address.slice(0, 8)}…${address.slice(-4)}`,
            severity: "success",
            req: data,
            metadata: { address, vm: link.vm, chainId: link.chainId },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet connected successfully");
        return { message: "Wallet address registered successfully" };
    }
    catch (error) {
        if (error === null || error === void 0 ? void 0 : error.statusCode)
            throw error;
        if ((error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Wallet already linked to another account");
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This wallet address is already linked to a different account.",
            });
        }
        console_1.logger.error("USER", "Error connecting wallet", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to connect wallet");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal server error",
        });
    }
}
