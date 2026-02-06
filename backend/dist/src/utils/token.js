"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUnsubscribeToken = exports.generateUnsubscribeToken = exports.deleteSession = exports.createSession = exports.generateCsrfToken = exports.generateEmailToken = exports.verifyResetToken = exports.generateResetToken = exports.verifyEmailCode = exports.generateEmailCode = exports.verifyRefreshToken = exports.generateRefreshToken = exports.verifyAccessToken = exports.generateAccessToken = exports.issuerKey = void 0;
exports.generateTokens = generateTokens;
exports.refreshTokens = refreshTokens;
const jose_1 = require("jose");
const crypto_1 = __importDefault(require("crypto"));
const passwords_1 = require("./passwords");
const redis_1 = require("./redis");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.issuerKey = "platform";
const redis = redis_1.RedisSingleton.getInstance();
const getExpiryInSeconds = (expiry) => {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
        case "s":
            return value;
        case "m":
            return value * 60;
        case "h":
            return value * 60 * 60;
        case "d":
            return value * 60 * 60 * 24;
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid expiry format: ${expiry}` });
    }
};
async function generateTokens(user) {
    const accessToken = await (0, exports.generateAccessToken)(user);
    const refreshToken = await (0, exports.generateRefreshToken)(user);
    const csrfToken = crypto_1.default.randomBytes(24).toString("hex");
    const sessionId = crypto_1.default.randomBytes(24).toString("hex");
    const userSessionKey = `sessionId:${sessionId}`;
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);
    const userData = { refreshToken, csrfToken, sessionId, user };
    await redis.set(userSessionKey, JSON.stringify(userData), "EX", refreshTokenExpiryInSeconds);
    return { accessToken, refreshToken, csrfToken, sessionId };
}
async function refreshTokens(user, sessionId) {
    const accessToken = await (0, exports.generateAccessToken)(user);
    const csrfToken = crypto_1.default.randomBytes(24).toString("hex");
    const userSessionKey = `sessionId:${sessionId}`;
    const sessionData = await redis.get(userSessionKey);
    if (!sessionData) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Session not found. Please re-authenticate." });
    }
    const session = JSON.parse(sessionData);
    session.csrfToken = csrfToken;
    session.accessToken = accessToken;
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);
    await redis.set(userSessionKey, JSON.stringify(session), "EX", refreshTokenExpiryInSeconds);
    return { accessToken, csrfToken };
}
const generateAccessToken = async (user) => {
    const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
    const jwtClaims = {
        sub: user,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
    };
    const APP_ACCESS_TOKEN_SECRET = process.env.APP_ACCESS_TOKEN_SECRET || "secret";
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .sign(new TextEncoder().encode(APP_ACCESS_TOKEN_SECRET));
};
exports.generateAccessToken = generateAccessToken;
const verifyAccessToken = async (token) => {
    if (!token) {
        return null;
    }
    const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
    const APP_ACCESS_TOKEN_SECRET = process.env.APP_ACCESS_TOKEN_SECRET || "secret";
    try {
        const { payload } = await (0, jose_1.jwtVerify)(cookieToken, new TextEncoder().encode(APP_ACCESS_TOKEN_SECRET));
        return payload;
    }
    catch (error) {
        if (error.message !== `"exp" claim timestamp check failed`) {
            console_1.logger.debug("AUTH", `JWT verification failed: ${error.message}`);
        }
        return null;
    }
};
exports.verifyAccessToken = verifyAccessToken;
const generateRefreshToken = async (user) => {
    const jwtClaims = {
        sub: user,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
    };
    const APP_REFRESH_TOKEN_SECRET = process.env.APP_REFRESH_TOKEN_SECRET || "secret";
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_REFRESH_EXPIRY)
        .sign(new TextEncoder().encode(APP_REFRESH_TOKEN_SECRET));
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = async (token) => {
    if (!token) {
        return null;
    }
    const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
    const APP_REFRESH_TOKEN_SECRET = process.env.APP_REFRESH_TOKEN_SECRET || "secret";
    try {
        const { payload } = await (0, jose_1.jwtVerify)(cookieToken, new TextEncoder().encode(APP_REFRESH_TOKEN_SECRET));
        return payload;
    }
    catch (error) {
        console_1.logger.debug("AUTH", `Refresh token verification failed: ${error.message}`);
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const generateEmailCode = async (userId) => {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`email-verification:${verificationCode}`, userId, "EX", 300);
    return verificationCode;
};
exports.generateEmailCode = generateEmailCode;
const verifyEmailCode = async (code) => {
    const userId = await redis.get(`email-verification:${code}`);
    if (userId) {
        await redis.del(`email-verification:${code}`);
        return userId;
    }
    return null;
};
exports.verifyEmailCode = verifyEmailCode;
const generateResetToken = async (user) => {
    const jwtClaims = {
        sub: user,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
    };
    const APP_RESET_TOKEN_SECRET = process.env.APP_RESET_TOKEN_SECRET || "secret";
    const JWT_RESET_EXPIRY = process.env.JWT_RESET_EXPIRY || "1h";
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_RESET_EXPIRY)
        .sign(new TextEncoder().encode(APP_RESET_TOKEN_SECRET));
};
exports.generateResetToken = generateResetToken;
const verifyResetToken = async (token) => {
    if (!token) {
        return null;
    }
    const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
    try {
        const APP_RESET_TOKEN_SECRET = process.env.APP_RESET_TOKEN_SECRET || "secret";
        const { payload } = await (0, jose_1.jwtVerify)(cookieToken, new TextEncoder().encode(APP_RESET_TOKEN_SECRET));
        return payload;
    }
    catch (error) {
        console_1.logger.debug("AUTH", `Reset token verification failed: ${error.message}`);
        return null;
    }
};
exports.verifyResetToken = verifyResetToken;
const generateEmailToken = async (user) => {
    const jwtClaims = {
        sub: user,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
    };
    const APP_RESET_TOKEN_SECRET = process.env.APP_RESET_TOKEN_SECRET || "secret";
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(new TextEncoder().encode(APP_RESET_TOKEN_SECRET));
};
exports.generateEmailToken = generateEmailToken;
const generateCsrfToken = () => {
    return crypto_1.default.randomBytes(32).toString("hex");
};
exports.generateCsrfToken = generateCsrfToken;
const createSession = async (userId, roleId, accessToken, csrfToken, refreshToken, ipAddress = "") => {
    const sessionId = (0, passwords_1.makeUuid)();
    const userSessionKey = `sessionId:${sessionId}`;
    const sessionData = JSON.stringify({
        userId,
        roleId,
        sid: (0, passwords_1.makeUuid)(),
        accessToken,
        csrfToken,
        refreshToken,
        ipAddress,
    });
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);
    await redis.set(userSessionKey, sessionData, "EX", refreshTokenExpiryInSeconds);
    return { sid: sessionId, userId, roleId };
};
exports.createSession = createSession;
const deleteSession = async (sessionId) => {
    const userSessionKey = `sessionId:${sessionId}`;
    await redis.del(userSessionKey);
};
exports.deleteSession = deleteSession;
const generateUnsubscribeToken = async (userId) => {
    const jwtClaims = {
        sub: userId,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
        type: "unsubscribe",
    };
    const APP_ACCESS_TOKEN_SECRET = process.env.APP_ACCESS_TOKEN_SECRET || "secret";
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("365d")
        .sign(new TextEncoder().encode(APP_ACCESS_TOKEN_SECRET));
};
exports.generateUnsubscribeToken = generateUnsubscribeToken;
const verifyUnsubscribeToken = async (token) => {
    if (!token) {
        return null;
    }
    const APP_ACCESS_TOKEN_SECRET = process.env.APP_ACCESS_TOKEN_SECRET || "secret";
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, new TextEncoder().encode(APP_ACCESS_TOKEN_SECRET));
        if (payload.type !== "unsubscribe") {
            return null;
        }
        return payload.sub;
    }
    catch (error) {
        console_1.logger.debug("AUTH", `Unsubscribe token verification failed: ${error.message}`);
        return null;
    }
};
exports.verifyUnsubscribeToken = verifyUnsubscribeToken;
