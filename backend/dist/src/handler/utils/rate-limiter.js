"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNED_AUTH_FAILURE_WINDOW_SEC = void 0;
exports.getRateLimitKey = getRateLimitKey;
exports.checkRateLimit = checkRateLimit;
exports.peekRateLimit = peekRateLimit;
exports.hasSignedApiCredentials = hasSignedApiCredentials;
exports.signedAuthFailureLimit = signedAuthFailureLimit;
exports.signedAuthFailureKey = signedAuthFailureKey;
exports.chargeSignedAuthFailure = chargeSignedAuthFailure;
exports.refundRateLimit = refundRateLimit;
exports.createRateLimiterFn = createRateLimiterFn;
const redis_1 = require("../../utils/redis");
const console_1 = require("@b/utils/console");
const address_parser_1 = require("./address-parser");
const rate_limit_bypass_1 = require("./rate-limit-bypass");
function getRateLimitKey(prefix, userId, clientIp) {
    if (userId) {
        return `${prefix}:user:${userId}`;
    }
    return `${prefix}:ip:${clientIp || "unknown"}`;
}
// Increment and expiration are one operation; parallel requests cannot all
// pass a stale GET, and a worker crash cannot leave an immortal counter.
const CHARGE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;
function positiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function denied(limit, retryAfter) {
    return { allowed: false, remaining: 0, retryAfter, headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
    }};
}
async function checkRateLimit(key, limit, windowSeconds, failClosed = false) {
    limit = positiveInteger(limit, 100);
    windowSeconds = positiveInteger(windowSeconds, 60);
    try {
        const redis = redis_1.RedisSingleton.getInstance();
        const results = await redis.eval(CHARGE_SCRIPT, 1, key, windowSeconds);
        const count = Number(results?.[0]);
        const ttl = Number(results?.[1]);
        if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttl) || ttl < 0) {
            throw new Error("Invalid Redis rate limit result");
        }
        if (count > limit) return denied(limit, Math.max(1, ttl));
        return { allowed: true, remaining: limit - count };
    } catch (error) {
        console_1.logger.error("RATE_LIMIT", "Error checking rate limit", error);
        return failClosed ? denied(limit, windowSeconds) : { allowed: true, remaining: limit };
    }
}
async function peekRateLimit(key, limit, windowSeconds) {
    limit = positiveInteger(limit, 100);
    windowSeconds = positiveInteger(windowSeconds, 60);
    try {
        const redis = redis_1.RedisSingleton.getInstance();
        const current = await redis.get(key);
        const used = current ? parseInt(current, 10) : 0;
        if (used >= limit) {
            const ttl = await redis.ttl(key);
            const retryAfter = ttl > 0 ? ttl : windowSeconds;
            return {
                allowed: false,
                remaining: 0,
                retryAfter,
                headers: {
                    "Retry-After": retryAfter.toString(),
                    "X-RateLimit-Limit": limit.toString(),
                    "X-RateLimit-Remaining": "0",
                },
            };
        }
        return { allowed: true, remaining: Math.max(0, limit - used) };
    }
    catch (error) {
        console_1.logger.error("RATE_LIMIT", "Error peeking rate limit", error);
        return { allowed: true, remaining: limit };
    }
}
function hasSignedApiCredentials(headers) {
    if (!headers)
        return false;
    return Boolean(headers["x-api-key"] &&
        headers["x-timestamp"] &&
        headers["x-nonce"] &&
        headers["x-signature"]);
}
exports.SIGNED_AUTH_FAILURE_WINDOW_SEC = 60;
function signedAuthFailureLimit() {
    const parsed = parseInt(process.env.HB_AUTH_FAIL_LIMIT || "30", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}
function signedAuthFailureKey(clientIp) {
    return getRateLimitKey("rateLimit:signedAuthFail", undefined, clientIp);
}
async function chargeSignedAuthFailure(data) {
    const floor = data === null || data === void 0 ? void 0 : data.signedAuthFloor;
    if (!(floor === null || floor === void 0 ? void 0 : floor.key))
        return;
    try {
        const redis = redis_1.RedisSingleton.getInstance();
        await redis.multi().incr(floor.key).expire(floor.key, floor.windowSec).exec();
    }
    catch (error) {
        console_1.logger.error("RATE_LIMIT", "Error recording signed auth failure", error);
    }
}
const REFUND_SCRIPT = `
local v = tonumber(redis.call('GET', KEYS[1]))
if v and v > 0 then return redis.call('DECR', KEYS[1]) end
return 0
`;
async function refundRateLimit(data, keyPrefix) {
    var _a;
    try {
        const charge = (_a = data === null || data === void 0 ? void 0 : data.rateLimitCharges) === null || _a === void 0 ? void 0 : _a[keyPrefix];
        if (!(charge === null || charge === void 0 ? void 0 : charge.key))
            return;
        delete data.rateLimitCharges[keyPrefix];
        const redis = redis_1.RedisSingleton.getInstance();
        await redis.eval(REFUND_SCRIPT, 1, charge.key);
    }
    catch (error) {
        console_1.logger.error("RATE_LIMIT", "Error refunding rate limit slot", error);
    }
}
function createRateLimiterFn(options = {}) {
    const { limit: rawLimit = 100, window: rawWindow = 60, keyPrefix = "rateLimit", message = "Rate Limit Exceeded, Try Again Later", failClosed = false, } = options;
    const limit = positiveInteger(rawLimit, 100);
    const window = positiveInteger(rawWindow, 60);
    return async (data) => {
        if ((0, rate_limit_bypass_1.rateLimitBypassAllowed)(data === null || data === void 0 ? void 0 : data.headers))
            return;
        const user = data === null || data === void 0 ? void 0 : data.user;
        const clientIp = (0, address_parser_1.requestClientIp)(data);
        const key = getRateLimitKey(keyPrefix, user === null || user === void 0 ? void 0 : user.id, clientIp);
        const result = await checkRateLimit(key, limit, window, failClosed);
        if (!result.allowed) {
            throw {
                statusCode: 429,
                message,
                headers: result.headers,
            };
        }
        if (data && typeof data === "object") {
            data.rateLimitCharges = data.rateLimitCharges || {};
            data.rateLimitCharges[keyPrefix] = { key, windowSec: window };
        }
    };
}
