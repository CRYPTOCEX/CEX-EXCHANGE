"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const redis_1 = require("@b/utils/redis");
const token_1 = require("@b/utils/token");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Refreshes an access token from a session id",
    operationId: "refreshAccessToken",
    tags: ["Auth"],
    description: "Mints a fresh access token for a live session. Intended for native clients " +
        "that hold a session id and cannot rely on cookies. Requires the session's " +
        "CSRF token.",
    requiresAuth: false,
    logModule: "AUTH",
    logTitle: "Token refresh",
    responses: {
        200: {
            description: "A fresh access token",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            cookies: {
                                type: "object",
                                properties: {
                                    accessToken: { type: "string" },
                                    csrfToken: { type: "string" },
                                    sessionId: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Missing/unknown session, missing or mismatched CSRF token, or an expired " +
                "session that has now been ended",
        },
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving session");
    const sessionId = data.cookies.sessionId || data.headers.sessionid;
    if (!sessionId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing session id");
        throw (0, error_1.createError)({ statusCode: 401, message: "Missing session ID" });
    }
    const redis = redis_1.RedisSingleton.getInstance();
    const sessionData = await redis.get(`sessionId:${sessionId}`);
    if (!sessionData) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Session not found");
        throw (0, error_1.createError)({ statusCode: 401, message: "Session not found" });
    }
    const { refreshToken: storedRefreshToken, csrfToken: storedCsrfToken, user, } = JSON.parse(sessionData);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying CSRF token");
    const presentedCsrf = data.cookies.csrfToken || data.headers.csrftoken;
    if (!presentedCsrf || !storedCsrfToken || presentedCsrf !== storedCsrfToken) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid CSRF token");
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid CSRF Token" });
    }
    if (!storedRefreshToken) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No refresh token on session");
        throw (0, error_1.createError)({ statusCode: 401, message: "No refresh token found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying refresh token");
    const verification = await (0, token_1.verifyRefreshTokenDetailed)(storedRefreshToken);
    const decoded = verification.payload;
    if (!decoded ||
        !decoded.sub ||
        typeof decoded.sub !== "object" ||
        !decoded.sub.id) {
        if ((0, token_1.refreshFailureEndsSession)(verification)) {
            console_1.logger.warn("AUTH", `Refresh token for session ${sessionId} is expired or malformed; ending the session`);
            await (0, token_1.deleteSession)(sessionId);
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Session expired");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Session expired, please sign in again",
            });
        }
        console_1.logger.warn("AUTH", `Refresh token for session ${sessionId} did not verify; refusing but KEEPING the session`);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Session could not be verified");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Session could not be verified, please sign in again",
        });
    }
    if ((0, system_accounts_1.isSystemAccountId)(decoded.sub.id) || (0, system_accounts_1.isSystemAccountId)(user === null || user === void 0 ? void 0 : user.id)) {
        console_1.logger.warn("AUTH", `Session ${sessionId} belongs to a platform system account; ending it instead of refreshing`);
        await (0, token_1.deleteSession)(sessionId);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Session belongs to a platform system account");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Session expired, please sign in again",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Minting access token");
    const { accessToken, csrfToken } = await (0, token_1.refreshTokens)(decoded.sub, sessionId);
    data.updateTokens({ accessToken, csrfToken, sessionId });
    data.setUser(user || decoded.sub);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Access token refreshed");
    return {
        message: "Token refreshed",
        cookies: { accessToken, csrfToken, sessionId },
    };
};
