"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POOL_BACKING_WAIVE_STEP_UP = exports.TYPE_LABELS = void 0;
exports.getStepUpPolicy = getStepUpPolicy;
exports.poolBackingWaiveBinding = poolBackingWaiveBinding;
exports.describeAcceptedTypes = describeAcceptedTypes;
exports.getUserTwoFactor = getUserTwoFactor;
exports.satisfiesPolicy = satisfiesPolicy;
exports.issueStepUpToken = issueStepUpToken;
exports.consumeStepUpToken = consumeStepUpToken;
const crypto_1 = require("crypto");
const db_1 = require("@b/db");
const resolve_1 = require("@b/services/notification/providers/sms/resolve");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const redis_1 = require("@b/utils/redis");
const passwords_1 = require("@b/utils/passwords");
const token_1 = require("@b/utils/token");
exports.TYPE_LABELS = {
    APP: "authenticator app",
    EMAIL: "email",
    SMS: "SMS",
};
function isTypeAvailable(type, settings, domain) {
    switch (type) {
        case "APP":
            return (cache_1.CacheManager.toBool(settings.get("twoFactorAppStatus"), true) ||
                process.env.NEXT_PUBLIC_2FA_APP_STATUS === "true");
        case "EMAIL":
            return (cache_1.CacheManager.toBool(settings.get("twoFactorEmailStatus"), true) ||
                process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS === "true");
        case "SMS":
            return ((cache_1.CacheManager.toBool(settings.get("twoFactorSmsStatus"), true) ||
                process.env.NEXT_PUBLIC_2FA_SMS_STATUS === "true") &&
                (0, resolve_1.isSmsConfigured)(domain.smsKind));
    }
}
function isEnabled(settings, key) {
    return settings.get(key) === "true";
}
async function getStepUpPolicy(domain) {
    const settings = await cache_1.CacheManager.getInstance().getSettings();
    const mandatory = domain.mandatory === true;
    const requireEnrollment = mandatory || isEnabled(settings, domain.settings.requireEnrollment);
    const requireChallenge = mandatory || isEnabled(settings, domain.settings.requireChallenge);
    if (!requireEnrollment && !requireChallenge) {
        return { requireEnrollment: false, requireChallenge: false, acceptedTypes: [] };
    }
    const twoFactorEnabledGlobally = cache_1.CacheManager.toBool(settings.get("twoFactorStatus"), true);
    if (!twoFactorEnabledGlobally) {
        console_1.logger.warn(domain.logModule, domain.warn.platformOff);
        const reason = "Two-factor authentication is disabled platform-wide";
        if (mandatory) {
            return { requireEnrollment, requireChallenge, acceptedTypes: [], blockedReason: reason };
        }
        return {
            requireEnrollment: false,
            requireChallenge: false,
            acceptedTypes: [],
            inactiveReason: reason,
        };
    }
    const configured = [
        ["APP", domain.settings.appAllowed],
        ["EMAIL", domain.settings.emailAllowed],
        ["SMS", domain.settings.smsAllowed],
    ]
        .filter(([, key]) => !settings.has(key) || settings.get(key) === "true")
        .map(([type]) => type);
    const acceptedTypes = configured.filter((type) => isTypeAvailable(type, settings, domain));
    if (acceptedTypes.length === 0) {
        console_1.logger.warn(domain.logModule, domain.warn.noAcceptedTypes(configured.join(", ") || "none selected"));
        const reason = "None of the accepted 2FA methods is currently available on this platform";
        if (mandatory) {
            return { requireEnrollment, requireChallenge, acceptedTypes: [], blockedReason: reason };
        }
        return {
            requireEnrollment: false,
            requireChallenge: false,
            acceptedTypes: [],
            inactiveReason: reason,
        };
    }
    return { requireEnrollment, requireChallenge, acceptedTypes };
}
exports.POOL_BACKING_WAIVE_STEP_UP = {
    purpose: "pool-backing-waive",
    redisPrefix: "pool-backing-waive-2fa-step-up:",
    logModule: "POOL_BACKING",
    smsKind: "AUTH_OTP",
    mandatory: true,
    settings: {
        requireEnrollment: "poolBackingWaiveTwoFactorRequired",
        requireChallenge: "poolBackingWaiveTwoFactorChallenge",
        appAllowed: "poolBackingWaiveTwoFactorAppAllowed",
        emailAllowed: "poolBackingWaiveTwoFactorEmailAllowed",
        smsAllowed: "poolBackingWaiveTwoFactorSmsAllowed",
    },
    warn: {
        platformOff: "Waiving a pool-backing obligation always needs a second factor, but two-factor authentication is disabled platform-wide (twoFactorStatus). Waives are REFUSED until it is enabled — a write-off of money is never waved through.",
        noAcceptedTypes: (configured) => `Waiving a pool-backing obligation always needs a second factor, but none of the accepted methods (${configured}) is available platform-wide. Waives are REFUSED until one is.`,
    },
};
function poolBackingWaiveBinding(obligationId) {
    return `obligation:${String(obligationId !== null && obligationId !== void 0 ? obligationId : "").trim()}`;
}
function describeAcceptedTypes(types) {
    var _a;
    const labels = types.map((type) => exports.TYPE_LABELS[type]);
    if (labels.length <= 1)
        return (_a = labels[0]) !== null && _a !== void 0 ? _a : "";
    return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}
async function getUserTwoFactor(userId) {
    var _a;
    const record = await db_1.models.twoFactor.findOne({ where: { userId } });
    if (!record)
        return null;
    return {
        id: record.id,
        type: record.type,
        enabled: Boolean(record.enabled),
        secret: record.secret,
        recoveryCodes: (_a = record.recoveryCodes) !== null && _a !== void 0 ? _a : null,
    };
}
function satisfiesPolicy(policy, twoFactor) {
    if (!(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled))
        return false;
    return policy.acceptedTypes.includes(twoFactor.type);
}
function stepUpRedisKey(domain, jti, binding) {
    if (!binding)
        return `${domain.redisPrefix}${jti}`;
    const digest = (0, crypto_1.createHash)("sha256").update(binding).digest("hex").slice(0, 32);
    return `${domain.redisPrefix}${jti}:${digest}`;
}
async function issueStepUpToken(domain, userId, binding) {
    const jti = (0, passwords_1.makeUuid)();
    const token = await (0, token_1.generateStepUpToken)(userId, domain.purpose, jti);
    await redis_1.RedisSingleton.getInstance().setex(stepUpRedisKey(domain, jti, binding), token_1.STEP_UP_TOKEN_TTL_SECONDS, userId);
    return {
        token,
        expiresAt: Date.now() + token_1.STEP_UP_TOKEN_TTL_SECONDS * 1000,
    };
}
async function consumeStepUpToken(domain, userId, token, binding) {
    const payload = await (0, token_1.verifyStepUpToken)(token, domain.purpose);
    if (!payload || payload.userId !== userId)
        return false;
    const removed = await redis_1.RedisSingleton.getInstance().del(stepUpRedisKey(domain, payload.jti, binding));
    return removed === 1;
}
