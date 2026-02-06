"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePowChallenge = generatePowChallenge;
exports.verifyPowSolution = verifyPowSolution;
exports.isPowCaptchaEnabled = isPowCaptchaEnabled;
exports.verifyPowOrThrow = verifyPowOrThrow;
const crypto_1 = __importDefault(require("crypto"));
const cache_1 = require("./cache");
const redis_1 = require("./redis");
const console_1 = require("./console");
const redis = redis_1.RedisSingleton.getInstance();
const DIFFICULTY_LEVELS = {
    low: 14,
    medium: 17,
    high: 20,
};
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const MAX_CHALLENGES_PER_MINUTE = 10;
async function generatePowChallenge(action, clientIp) {
    if (clientIp) {
        const rateLimitKey = `pow_rate:${clientIp}`;
        const currentCount = await redis.get(rateLimitKey);
        if (currentCount && Number(currentCount) >= MAX_CHALLENGES_PER_MINUTE) {
            throw new Error("Too many challenge requests. Please wait a moment.");
        }
        await redis.setex(rateLimitKey, 60, String(Number(currentCount || 0) + 1));
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const difficultyLevel = (await cacheManager.getSetting("powCaptchaDifficulty")) || "medium";
    const difficulty = DIFFICULTY_LEVELS[difficultyLevel] || DIFFICULTY_LEVELS.medium;
    const timestamp = Date.now();
    const randomBytes = crypto_1.default.randomBytes(32).toString("hex");
    const challenge = `${randomBytes}:${timestamp}:${action}`;
    const challengeData = {
        challenge,
        difficulty,
        timestamp,
        action,
    };
    const challengeKey = `pow_challenge:${challenge}`;
    await redis.setex(challengeKey, Math.floor(CHALLENGE_EXPIRY_MS / 1000), JSON.stringify(challengeData));
    console_1.logger.debug("POW", `Generated challenge for action: ${action}, difficulty: ${difficulty}`);
    return {
        challenge,
        difficulty,
        timestamp,
        expiresIn: CHALLENGE_EXPIRY_MS,
    };
}
async function verifyPowSolution(solution, expectedAction) {
    const challengeKey = `pow_challenge:${solution.challenge}`;
    const storedData = await redis.get(challengeKey);
    if (!storedData) {
        console_1.logger.warn("POW", "Challenge not found or expired");
        return { valid: false, error: "Challenge expired or invalid. Please refresh and try again." };
    }
    let challengeData;
    try {
        challengeData = JSON.parse(storedData);
    }
    catch (_a) {
        console_1.logger.error("POW", "Failed to parse stored challenge data");
        return { valid: false, error: "Invalid challenge data" };
    }
    if (challengeData.action !== expectedAction) {
        console_1.logger.warn("POW", `Action mismatch: expected ${expectedAction}, got ${challengeData.action}`);
        return { valid: false, error: "Challenge action mismatch" };
    }
    if (Date.now() - challengeData.timestamp > CHALLENGE_EXPIRY_MS) {
        console_1.logger.warn("POW", "Challenge expired");
        await redis.del(challengeKey);
        return { valid: false, error: "Challenge expired. Please refresh and try again." };
    }
    const dataToHash = `${solution.challenge}:${solution.nonce}`;
    const computedHash = crypto_1.default.createHash("sha256").update(dataToHash).digest("hex");
    if (computedHash !== solution.hash) {
        console_1.logger.warn("POW", "Hash mismatch");
        return { valid: false, error: "Invalid solution hash" };
    }
    if (!verifyDifficulty(computedHash, challengeData.difficulty)) {
        console_1.logger.warn("POW", `Difficulty not met: required ${challengeData.difficulty} leading zero bits`);
        return { valid: false, error: "Solution does not meet difficulty requirement" };
    }
    await redis.del(challengeKey);
    console_1.logger.debug("POW", `Valid solution verified for action: ${expectedAction}`);
    return { valid: true };
}
function verifyDifficulty(hash, difficulty) {
    var _a;
    const binaryHash = hexToBinary(hash);
    const leadingZeros = ((_a = binaryHash.match(/^0*/)) === null || _a === void 0 ? void 0 : _a[0].length) || 0;
    return leadingZeros >= difficulty;
}
function hexToBinary(hex) {
    return hex
        .split("")
        .map((char) => parseInt(char, 16).toString(2).padStart(4, "0"))
        .join("");
}
async function isPowCaptchaEnabled() {
    const cacheManager = cache_1.CacheManager.getInstance();
    const status = await cacheManager.getSetting("powCaptchaStatus");
    return status === "true" || status === true;
}
async function verifyPowOrThrow(solution, action) {
    const isEnabled = await isPowCaptchaEnabled();
    if (!isEnabled) {
        return;
    }
    if (!solution || !solution.challenge || solution.nonce === undefined || !solution.hash) {
        throw new Error("Proof-of-work solution is required");
    }
    const result = await verifyPowSolution(solution, action);
    if (!result.valid) {
        throw new Error(result.error || "Invalid proof-of-work solution");
    }
}
