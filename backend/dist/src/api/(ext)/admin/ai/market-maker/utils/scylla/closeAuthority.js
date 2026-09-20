"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketOf = bucketOf;
exports.claimSettlementClose = claimSettlementClose;
exports.getSettlementClose = getSettlementClose;
exports.releaseSettlementClaims = releaseSettlementClaims;
exports.clearSettlementClaims = clearSettlementClaims;
exports.localClaimCount = localClaimCount;
const console_1 = require("@b/utils/console");
const BUCKET_MS = 60000;
const CLAIM_TTL_SECONDS = 180;
function claimKey(symbol, bucket) {
    return `aimm:closeauth:${symbol}:${bucket}`;
}
function bucketOf(atMs) {
    return Math.floor(atMs / BUCKET_MS);
}
const localClaims = new Map();
function pruneLocal(nowBucket) {
    for (const [key, claim] of localClaims) {
        if (claim.bucket < nowBucket - 2)
            localClaims.delete(key);
    }
}
async function getRedis() {
    var _a;
    try {
        const mod = await Promise.resolve().then(() => __importStar(require("@b/utils/redis")));
        return (_a = mod === null || mod === void 0 ? void 0 : mod.redisClient) !== null && _a !== void 0 ? _a : null;
    }
    catch (_b) {
        return null;
    }
}
async function claimSettlementClose(symbol, price, atMs) {
    if (!(price > 0) || !Number.isFinite(price))
        return;
    const bucket = bucketOf(atMs);
    const key = claimKey(symbol, bucket);
    pruneLocal(bucket);
    localClaims.set(key, { price, bucket });
    try {
        const redis = await getRedis();
        if (!redis)
            return;
        await redis.set(key, String(price), "EX", CLAIM_TTL_SECONDS);
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Could not persist settlement-close claim for ${symbol}@${bucket}`, error);
    }
}
async function getSettlementClose(symbol, atMs) {
    const bucket = bucketOf(atMs);
    const key = claimKey(symbol, bucket);
    const local = localClaims.get(key);
    if (local && local.bucket === bucket)
        return local.price;
    try {
        const redis = await getRedis();
        if (!redis)
            return null;
        const raw = await redis.get(key);
        if (raw === null || raw === undefined)
            return null;
        const price = Number(raw);
        if (!Number.isFinite(price) || price <= 0)
            return null;
        localClaims.set(key, { price, bucket });
        return price;
    }
    catch (_a) {
        return null;
    }
}
async function releaseSettlementClaims(symbol) {
    const prefix = `aimm:closeauth:${symbol}:`;
    for (const key of [...localClaims.keys()]) {
        if (key.startsWith(prefix))
            localClaims.delete(key);
    }
    try {
        const redis = await getRedis();
        if (!redis)
            return;
        const keys = await redis.keys(`${prefix}*`);
        if (keys === null || keys === void 0 ? void 0 : keys.length)
            await redis.del(...keys);
    }
    catch (_a) {
    }
}
function clearSettlementClaims() {
    localClaims.clear();
}
function localClaimCount() {
    return localClaims.size;
}
