"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUnsubscribeToken = exports.generateUnsubscribeToken = exports.verifyStepUpToken = exports.generateStepUpToken = exports.STEP_UP_TOKEN_TTL_SECONDS = exports.verifyTwoFactorChallenge = exports.generateTwoFactorChallenge = exports.deleteAllUserSessions = exports.revokeOtherUserSessions = exports.revokeUserSession = exports.getUserSessions = exports.registerUserSession = exports.deleteSession = exports.createSession = exports.generateCsrfToken = exports.generateAccountDeletionToken = exports.verifyResetToken = exports.generateResetToken = exports.verifyEmailCode = exports.generateEmailCode = exports.verifyRefreshToken = exports.verifyRefreshTokenDetailed = exports.generateRefreshToken = exports.verifyAccessToken = exports.generateAccessToken = exports.issuerKey = void 0;
exports.generateTokens = generateTokens;
exports.refreshTokens = refreshTokens;
exports.refreshFailureEndsSession = refreshFailureEndsSession;
const jose_1 = require("jose");
const crypto_1 = __importDefault(require("crypto"));
const passwords_1 = require("./passwords");
const redis_1 = require("./redis");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("./system-accounts");
exports.issuerKey = "platform";
const redis = redis_1.RedisSingleton.getInstance();
function refuseSystemAccountSession(userId, minter) {
    if (!(0, system_accounts_1.isSystemAccountId)(userId))
        return;
    console_1.logger.warn("AUTH", `${minter} refused to mint a session for ${(0, system_accounts_1.describeSystemAccount)(userId)} (${String(userId)}); it cannot be signed into`);
    throw (0, system_accounts_1.systemAccountSignInRefusal)();
}
const getTokenSecret = (name) => {
    const value = process.env[name];
    if (!value || value.length < 32) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `${name} must be set to a strong secret of at least 32 characters`,
        });
    }
    return new TextEncoder().encode(value);
};
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
async function generateTokens(user, meta) {
    refuseSystemAccountSession(user === null || user === void 0 ? void 0 : user.id, "generateTokens");
    const sessionId = crypto_1.default.randomBytes(24).toString("hex");
    const accessToken = await (0, exports.generateAccessToken)(user, sessionId);
    const refreshToken = await (0, exports.generateRefreshToken)(user);
    const csrfToken = crypto_1.default.randomBytes(24).toString("hex");
    const userSessionKey = `sessionId:${sessionId}`;
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);
    const nowIso = new Date().toISOString();
    const userData = {
        refreshToken,
        csrfToken,
        sessionId,
        user,
        userId: user === null || user === void 0 ? void 0 : user.id,
        device: meta || null,
        createdAt: (meta === null || meta === void 0 ? void 0 : meta.createdAt) || nowIso,
        lastActive: (meta === null || meta === void 0 ? void 0 : meta.lastActive) || nowIso,
    };
    await redis.set(userSessionKey, JSON.stringify(userData), "EX", refreshTokenExpiryInSeconds);
    if (user === null || user === void 0 ? void 0 : user.id) {
        await (0, exports.registerUserSession)(user.id, sessionId);
    }
    return { accessToken, refreshToken, csrfToken, sessionId };
}
async function refreshTokens(user, sessionId) {
    const accessToken = await (0, exports.generateAccessToken)(user, sessionId);
    const userSessionKey = `sessionId:${sessionId}`;
    const sessionData = await redis.get(userSessionKey);
    if (!sessionData) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Session not found. Please re-authenticate." });
    }
    const session = JSON.parse(sessionData);
    const csrfToken = session.csrfToken || crypto_1.default.randomBytes(24).toString("hex");
    session.csrfToken = csrfToken;
    session.accessToken = accessToken;
    session.lastActive = new Date().toISOString();
    if (session.device) {
        session.device.lastActive = session.lastActive;
    }
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    const refreshTokenExpiryInSeconds = getExpiryInSeconds(JWT_REFRESH_EXPIRY);
    await redis.set(userSessionKey, JSON.stringify(session), "EX", refreshTokenExpiryInSeconds);
    return { accessToken, csrfToken };
}
const generateAccessToken = async (user, sessionId) => {
    const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
    const jwtClaims = {
        sub: user,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
    };
    if (sessionId)
        jwtClaims.sid = sessionId;
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .sign(getTokenSecret("APP_ACCESS_TOKEN_SECRET"));
};
exports.generateAccessToken = generateAccessToken;
const verifyAccessToken = async (token) => {
    if (!token) {
        return null;
    }
    const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
    try {
        const { payload } = await (0, jose_1.jwtVerify)(cookieToken, getTokenSecret("APP_ACCESS_TOKEN_SECRET"), { algorithms: ["HS256"] });
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
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_REFRESH_EXPIRY)
        .sign(getTokenSecret("APP_REFRESH_TOKEN_SECRET"));
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshTokenDetailed = async (token) => {
    var _a;
    if (!token) {
        return { payload: null, failure: "absent" };
    }
    const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
    const secret = getTokenSecret("APP_REFRESH_TOKEN_SECRET");
    try {
        const { payload } = await (0, jose_1.jwtVerify)(cookieToken, secret, {
            algorithms: ["HS256"],
        });
        return { payload, failure: null };
    }
    catch (error) {
        const code = String((_a = error === null || error === void 0 ? void 0 : error.code) !== null && _a !== void 0 ? _a : "");
        const expired = code === "ERR_JWT_EXPIRED";
        if (expired) {
            console_1.logger.debug("AUTH", `Refresh token expired: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
        else {
            console_1.logger.warn("AUTH", `Refresh token did not verify (${code || "no code"}): ${error === null || error === void 0 ? void 0 : error.message}. ` +
                `A token we signed ourselves should always verify — check whether ` +
                `APP_REFRESH_TOKEN_SECRET changed. The session is being KEPT so the ` +
                `change can be reverted.`);
        }
        return { payload: null, failure: expired ? "expired" : "unreadable" };
    }
};
exports.verifyRefreshTokenDetailed = verifyRefreshTokenDetailed;
function refreshFailureEndsSession(verification) {
    if (verification.failure === "expired")
        return true;
    return verification.payload !== null;
}
const verifyRefreshToken = async (token) => {
    return (await (0, exports.verifyRefreshTokenDetailed)(token)).payload;
};
exports.verifyRefreshToken = verifyRefreshToken;
const EMAIL_CODE_TTL_SECONDS = 300;
const emailCodeKey = (code) => `email-verification:${code}`;
const emailCodeOwnerKey = (userId) => `email-verification-user:${userId}`;
const generateEmailCode = async (userId) => {
    const verificationCode = crypto_1.default.randomInt(100000, 1000000).toString();
    const previous = await redis.get(emailCodeOwnerKey(userId));
    if (previous && previous !== verificationCode) {
        await redis.del(emailCodeKey(previous));
    }
    await redis.set(emailCodeKey(verificationCode), userId, "EX", EMAIL_CODE_TTL_SECONDS);
    await redis.set(emailCodeOwnerKey(userId), verificationCode, "EX", EMAIL_CODE_TTL_SECONDS);
    return verificationCode;
};
exports.generateEmailCode = generateEmailCode;
const verifyEmailCode = async (code) => {
    const userId = await redis.get(emailCodeKey(code));
    if (userId) {
        await redis.del(emailCodeKey(code));
        await redis.del(emailCodeOwnerKey(userId));
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
        type: "reset",
    };
    const JWT_RESET_EXPIRY = process.env.JWT_RESET_EXPIRY || "1h";
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(JWT_RESET_EXPIRY)
        .sign(getTokenSecret("APP_RESET_TOKEN_SECRET"));
};
exports.generateResetToken = generateResetToken;
const verifyResetToken = async (token, expected = "reset") => {
    if (!token) {
        return null;
    }
    const cookieToken = token.includes(" ") ? token.split(" ")[1] : token;
    try {
        const { payload } = await (0, jose_1.jwtVerify)(cookieToken, getTokenSecret("APP_RESET_TOKEN_SECRET"), { algorithms: ["HS256"] });
        const purpose = payload.type;
        const acceptable = purpose === expected || (expected === "reset" && purpose === undefined);
        if (!acceptable) {
            console_1.logger.debug("AUTH", `Reset token rejected: purpose "${purpose !== null && purpose !== void 0 ? purpose : "none"}" is not "${expected}"`);
            return null;
        }
        return payload;
    }
    catch (error) {
        console_1.logger.debug("AUTH", `Reset token verification failed: ${error.message}`);
        return null;
    }
};
exports.verifyResetToken = verifyResetToken;
const generateAccountDeletionToken = async (user) => {
    const jwtClaims = {
        sub: user,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
        type: "account-deletion",
    };
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getTokenSecret("APP_RESET_TOKEN_SECRET"));
};
exports.generateAccountDeletionToken = generateAccountDeletionToken;
const generateCsrfToken = () => {
    return crypto_1.default.randomBytes(32).toString("hex");
};
exports.generateCsrfToken = generateCsrfToken;
const createSession = async (userId, roleId, accessToken, csrfToken, refreshToken, ipAddress = "") => {
    refuseSystemAccountSession(userId, "createSession");
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
    await (0, exports.registerUserSession)(userId, sessionId);
    return { sid: sessionId, userId, roleId };
};
exports.createSession = createSession;
const deleteSession = async (sessionId) => {
    var _a;
    const userSessionKey = `sessionId:${sessionId}`;
    let userId;
    try {
        const raw = await redis.get(userSessionKey);
        if (raw)
            userId = (_a = JSON.parse(raw)) === null || _a === void 0 ? void 0 : _a.userId;
    }
    catch (_b) {
    }
    await redis.del(userSessionKey);
    if (userId)
        await redis.srem(userSessionsKey(userId), sessionId);
};
exports.deleteSession = deleteSession;
const userSessionsKey = (userId) => `user-sessions:${userId}`;
const registerUserSession = async (userId, sessionId) => {
    if (!userId || !sessionId)
        return;
    const key = userSessionsKey(userId);
    await redis.sadd(key, sessionId);
    const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "14d";
    await redis.expire(key, getExpiryInSeconds(JWT_REFRESH_EXPIRY));
};
exports.registerUserSession = registerUserSession;
const getUserSessions = async (userId) => {
    if (!userId)
        return [];
    const key = userSessionsKey(userId);
    const sessionIds = await redis.smembers(key);
    if (!sessionIds.length)
        return [];
    const pipeline = redis.pipeline();
    for (const sid of sessionIds)
        pipeline.get(`sessionId:${sid}`);
    const responses = await pipeline.exec();
    const records = [];
    const stale = [];
    (responses || []).forEach((entry, i) => {
        const sid = sessionIds[i];
        const err = entry === null || entry === void 0 ? void 0 : entry[0];
        const val = entry === null || entry === void 0 ? void 0 : entry[1];
        if (err || !val) {
            stale.push(sid);
            return;
        }
        try {
            const parsed = JSON.parse(val);
            records.push({
                sessionId: sid,
                device: parsed.device || null,
                createdAt: parsed.createdAt || null,
                lastActive: parsed.lastActive || null,
            });
        }
        catch (_a) {
            stale.push(sid);
        }
    });
    if (stale.length) {
        await redis.srem(key, ...stale);
    }
    return records;
};
exports.getUserSessions = getUserSessions;
const revokeUserSession = async (userId, sessionId) => {
    if (!userId || !sessionId)
        return false;
    const key = userSessionsKey(userId);
    const isMember = await redis.sismember(key, sessionId);
    if (!isMember)
        return false;
    await redis.del(`sessionId:${sessionId}`);
    await redis.srem(key, sessionId);
    return true;
};
exports.revokeUserSession = revokeUserSession;
const revokeOtherUserSessions = async (userId, keepSessionId) => {
    if (!userId)
        return 0;
    const key = userSessionsKey(userId);
    const sessionIds = await redis.smembers(key);
    const toRevoke = sessionIds.filter((s) => s !== keepSessionId);
    if (!toRevoke.length)
        return 0;
    const pipeline = redis.pipeline();
    for (const sid of toRevoke)
        pipeline.del(`sessionId:${sid}`);
    pipeline.srem(key, ...toRevoke);
    await pipeline.exec();
    return toRevoke.length;
};
exports.revokeOtherUserSessions = revokeOtherUserSessions;
const deleteAllUserSessions = async (userId) => {
    if (!userId)
        return;
    const key = userSessionsKey(userId);
    const sessionIds = await redis.smembers(key);
    if (sessionIds.length > 0) {
        const pipeline = redis.pipeline();
        for (const sid of sessionIds) {
            pipeline.del(`sessionId:${sid}`);
        }
        pipeline.del(key);
        await pipeline.exec();
    }
    else {
        await redis.del(key);
    }
};
exports.deleteAllUserSessions = deleteAllUserSessions;
const TWO_FACTOR_CHALLENGE_EXPIRY = "5m";
const generateTwoFactorChallenge = async (userId) => {
    return new jose_1.SignJWT({
        sub: userId,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
        type: "2fa-challenge",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(TWO_FACTOR_CHALLENGE_EXPIRY)
        .sign(getTokenSecret("APP_ACCESS_TOKEN_SECRET"));
};
exports.generateTwoFactorChallenge = generateTwoFactorChallenge;
const verifyTwoFactorChallenge = async (token) => {
    if (!token)
        return null;
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, getTokenSecret("APP_ACCESS_TOKEN_SECRET"), { algorithms: ["HS256"] });
        if (payload.type !== "2fa-challenge")
            return null;
        return typeof payload.sub === "string" ? payload.sub : null;
    }
    catch (error) {
        console_1.logger.debug("AUTH", `2FA challenge verification failed: ${error.message}`);
        return null;
    }
};
exports.verifyTwoFactorChallenge = verifyTwoFactorChallenge;
const STEP_UP_TOKEN_EXPIRY = "10m";
exports.STEP_UP_TOKEN_TTL_SECONDS = getExpiryInSeconds(STEP_UP_TOKEN_EXPIRY);
const generateStepUpToken = async (userId, purpose, jti) => {
    return new jose_1.SignJWT({
        sub: userId,
        iss: exports.issuerKey,
        jti,
        type: "step-up",
        purpose,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(STEP_UP_TOKEN_EXPIRY)
        .sign(getTokenSecret("APP_ACCESS_TOKEN_SECRET"));
};
exports.generateStepUpToken = generateStepUpToken;
const verifyStepUpToken = async (token, purpose) => {
    if (!token)
        return null;
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, getTokenSecret("APP_ACCESS_TOKEN_SECRET"), { algorithms: ["HS256"] });
        if (payload.type !== "step-up")
            return null;
        if (payload.purpose !== purpose)
            return null;
        if (typeof payload.sub !== "string" || typeof payload.jti !== "string") {
            return null;
        }
        return { userId: payload.sub, jti: payload.jti };
    }
    catch (error) {
        console_1.logger.debug("AUTH", `Step-up token verification failed: ${error.message}`);
        return null;
    }
};
exports.verifyStepUpToken = verifyStepUpToken;
const generateUnsubscribeToken = async (userId) => {
    const jwtClaims = {
        sub: userId,
        iss: exports.issuerKey,
        jti: (0, passwords_1.makeUuid)(),
        type: "unsubscribe",
    };
    return new jose_1.SignJWT(jwtClaims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("365d")
        .sign(getTokenSecret("APP_ACCESS_TOKEN_SECRET"));
};
exports.generateUnsubscribeToken = generateUnsubscribeToken;
const verifyUnsubscribeToken = async (token) => {
    if (!token) {
        return null;
    }
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, getTokenSecret("APP_ACCESS_TOKEN_SECRET"), { algorithms: ["HS256"] });
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
