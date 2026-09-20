"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = exports.SIWE_NONCE_PREFIX = void 0;
const crypto_1 = require("crypto");
const redis_1 = require("@b/utils/redis");
const utils_1 = require("../utils");
const SIWE_NONCE_TTL_SECONDS = 300;
exports.SIWE_NONCE_PREFIX = "siwe:nonce:";
exports.metadata = {
    summary: "Generates a nonce for client use",
    operationId: "generateNonce",
    tags: ["Auth"],
    description: "Generates a nonce for client use",
    requiresAuth: false,
    middleware: ["strict"],
    responses: {
        200: {
            description: "Nonce generated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            nonce: { type: "string", description: "The generated nonce" },
                        },
                        required: ["nonce"],
                    },
                },
            },
        },
        500: {
            description: "Internal server error",
        },
    },
};
exports.default = async () => {
    await (0, utils_1.ensureWalletConnectAvailable)();
    const nonce = (0, crypto_1.randomBytes)(16).toString("hex");
    const redis = redis_1.RedisSingleton.getInstance();
    await redis.set(`${exports.SIWE_NONCE_PREFIX}${nonce}`, "1", "EX", SIWE_NONCE_TTL_SECONDS, "NX");
    return nonce;
};
