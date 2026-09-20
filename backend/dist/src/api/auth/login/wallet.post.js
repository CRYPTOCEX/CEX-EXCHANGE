"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const user_activity_1 = require("@b/utils/user-activity");
const redis_1 = require("@b/utils/redis");
const nonce_get_1 = require("./nonce.get");
const cache_1 = require("@b/utils/cache");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const token_1 = require("@b/utils/token");
const utils_2 = require("@b/api/auth/otp/utils");
const emails_1 = require("@b/utils/emails");
const sms_1 = require("@b/utils/sms");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Logs in a user with SIWE",
    description: "Logs in a user using Sign-In With Ethereum (SIWE)",
    operationId: "siweLogin",
    tags: ["Auth"],
    requiresAuth: false,
    middleware: ["strict"],
    logModule: "LOGIN",
    logTitle: "Wallet login",
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
            description: "User logged in successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            id: {
                                type: "string",
                                description: "User ID",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., invalid message or signature)",
        },
        401: {
            description: "Unauthorized (e.g., signature verification failed)",
        },
    },
};
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
async function sendSmsOtp(phoneNumber, otp) {
    const smsTwoFactorEnabled = (await cache_1.CacheManager.getInstance().getSettingBool("twoFactorSmsStatus", true)) || process.env.NEXT_PUBLIC_2FA_SMS_STATUS === "true";
    if (!smsTwoFactorEnabled || !(0, sms_1.isSmsAvailable)("AUTH_OTP")) {
        throw (0, error_1.createError)({ statusCode: 400, message: "SMS 2FA is not enabled" });
    }
    await (0, sms_1.sendSmsCode)(phoneNumber, otp, "AUTH_OTP");
}
async function sendEmailOtp(email, firstName, otp) {
    const emailTwoFactorEnabled = (await cache_1.CacheManager.getInstance().getSettingBool("twoFactorEmailStatus", true)) || process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS === "true";
    if (!emailTwoFactorEnabled) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Email 2FA is not enabled" });
    }
    await emails_1.emailQueue.add({
        emailData: { TO: email, FIRSTNAME: firstName, TOKEN: otp },
        emailType: "OTPTokenVerification",
    });
}
async function issueTwoFactorChallengeIfEnabled(user) {
    var _a;
    const cacheManager = cache_1.CacheManager.getInstance();
    const twoFactorEnabled = await cacheManager.getSettingBool("twoFactorStatus", true);
    if (!twoFactorEnabled || !((_a = user.twoFactor) === null || _a === void 0 ? void 0 : _a.enabled))
        return null;
    const type = user.twoFactor.type;
    if (type !== "SMS" && type !== "EMAIL" && type !== "APP") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid 2FA type" });
    }
    const code = (0, two_factor_code_1.generateTwoFactorCode)((0, utils_2.resolveTwoFactorSecret)(user.twoFactor), type);
    let delivered = true;
    let deliveryError;
    try {
        switch (type) {
            case "SMS":
                await sendSmsOtp(user.phone, code);
                break;
            case "EMAIL":
                await sendEmailOtp(user.email, user.firstName, code);
                break;
            case "APP":
                break;
        }
    }
    catch (error) {
        delivered = false;
        deliveryError =
            (error === null || error === void 0 ? void 0 : error.message) || "The verification code could not be sent right now.";
        console_1.logger.error("AUTH", `2FA code delivery failed for ${user.email} (${type}, wallet login): ${deliveryError}`);
    }
    const twoFactorToken = await (0, token_1.generateTwoFactorChallenge)(user.id);
    return {
        twoFactor: { enabled: true, type },
        twoFactorToken,
        delivered: type === "APP" ? false : delivered,
        ...(deliveryError
            ? {
                deliveryError,
                deliveryHint: "Enter a code from your authenticator app or use one of your recovery codes.",
            }
            : {}),
        message: "2FA required",
    };
}
exports.default = async (data) => {
    const { body, ctx } = data;
    const { message, signature } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet_connect extension availability");
        await (0, utils_1.ensureWalletConnectAvailable)();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating wallet login request");
        if (!message || !signature) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Message and signature are required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Message and signature are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking WalletConnect configuration");
        if (!projectId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("WalletConnect project ID not configured");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Wallet connect project ID is not defined",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing and validating the SIWE message");
        const { address, chainId, nonce } = (0, utils_1.parseAndValidateSiwe)(message, (0, utils_1.expectedSiweDomain)());
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Consuming single-use login nonce");
        const redis = redis_1.RedisSingleton.getInstance();
        const consumed = await redis.del(`${nonce_get_1.SIWE_NONCE_PREFIX}${nonce}`);
        if (consumed !== 1) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid, expired, or already-used nonce");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Invalid or expired login nonce",
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up wallet provider");
        const provider = await db_1.models.providerUser.findOne({
            where: { provider: "WALLET", providerUserId: address },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    include: [
                        {
                            model: db_1.models.twoFactor,
                            as: "twoFactor",
                        },
                    ],
                },
            ],
        });
        if (!provider || (0, system_accounts_1.isSystemAccount)(provider.user)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Wallet address not recognized");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Wallet address not recognized",
            });
        }
        const user = provider.user;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user status");
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found",
            });
        }
        if (user.status === "BANNED") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account banned");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account has been banned. Please contact support.",
            });
        }
        if (user.status === "SUSPENDED") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account suspended");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account is suspended. Please contact support.",
            });
        }
        if (user.status === "INACTIVE") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account inactive");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account is inactive. Please verify your email or contact support.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking 2FA requirement");
        const twoFactorResponse = await issueTwoFactorChallengeIfEnabled(user);
        if (twoFactorResponse) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA challenge issued for wallet ${address}`);
            return twoFactorResponse;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "You have been logged in successfully",
            req: data,
        });
        void (0, user_activity_1.recordUserActivity)({
            userId: user.id,
            type: "auth.login",
            title: "Signed in",
            description: `Wallet sign-in (${address.slice(0, 6)}…${address.slice(-4)})`,
            severity: "info",
            req: data,
            metadata: { address },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${user.email} logged in with wallet ${address}`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Wallet login failed");
        throw error;
    }
};
