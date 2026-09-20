"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TWO_FACTOR_CLAIM_TTL_SECONDS = void 0;
exports.twoFactorClaimKey = twoFactorClaimKey;
exports.claimTwoFactorCode = claimTwoFactorCode;
const crypto_1 = require("crypto");
const redis_1 = require("@b/utils/redis");
exports.TWO_FACTOR_CLAIM_TTL_SECONDS = 600;
function twoFactorClaimKey(userId, token) {
    const digest = (0, crypto_1.createHash)("sha256")
        .update(`${userId}:${String(token)}`)
        .digest("hex")
        .slice(0, 32);
    return `2fa-spent:${userId}:${digest}`;
}
async function claimTwoFactorCode(userId, token) {
    const redis = redis_1.RedisSingleton.getInstance();
    const claimed = await redis.set(twoFactorClaimKey(userId, token), "1", "EX", exports.TWO_FACTOR_CLAIM_TTL_SECONDS, "NX");
    return claimed === "OK";
}
