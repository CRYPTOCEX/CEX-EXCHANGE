"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const google_auth_library_1 = require("google-auth-library");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const error_1 = require("@b/utils/error");
const token_1 = require("@b/utils/token");
const cache_1 = require("@b/utils/cache");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const emails_1 = require("@b/utils/emails");
const sms_1 = require("@b/utils/sms");
const user_activity_1 = require("@b/utils/user-activity");
const utils_2 = require("@b/api/auth/otp/utils");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const EXPECTED_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const client = new google_auth_library_1.OAuth2Client(CLIENT_ID);
exports.metadata = {
    summary: "Logs in a user with Google",
    operationId: "loginUserWithGoogle",
    tags: ["Auth"],
    description: "Logs in a user using Google and returns a session token",
    requiresAuth: false,
    logModule: "LOGIN",
    logTitle: "Google login",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.userRegisterSchema,
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
                        properties: utils_1.userRegisterResponseSchema,
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
async function verifyGoogleIdToken(idToken) {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload)
            throw (0, error_1.createError)({ statusCode: 401, message: "Missing payload in Google ID token" });
        if (!payload.iss || !EXPECTED_ISSUERS.includes(payload.iss)) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Invalid issuer in Google ID token" });
        }
        if (!payload.aud || payload.aud !== CLIENT_ID) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Invalid audience in Google ID token" });
        }
        if (!payload.exp || Date.now() / 1000 > payload.exp) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Google ID token has expired" });
        }
        if (!payload.sub || !payload.email) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Invalid Google ID token: missing user info" });
        }
        if (payload.email_verified !== true) {
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Google account email is not verified",
            });
        }
        return payload;
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 401, message: `Google authentication failed: ${error.message}` });
    }
}
async function verifyGoogleAccessToken(accessToken, userInfo) {
    var _a, _b;
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Invalid Google access token" });
    }
    const data = await response.json();
    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    if (!tokenInfoResponse.ok) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Could not validate Google access token",
        });
    }
    const tokenInfo = await tokenInfoResponse.json();
    if (!tokenInfo.aud || tokenInfo.aud !== CLIENT_ID) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Google access token is not for this application",
        });
    }
    if (tokenInfo.email_verified !== "true" && tokenInfo.email_verified !== true) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Google account email is not verified",
        });
    }
    return {
        sub: data.id,
        email: data.email,
        given_name: data.given_name || ((_a = data.name) === null || _a === void 0 ? void 0 : _a.split(' ')[0]) || '',
        family_name: data.family_name || ((_b = data.name) === null || _b === void 0 ? void 0 : _b.split(' ').slice(1).join(' ')) || '',
        picture: data.picture,
    };
}
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
        console_1.logger.error("AUTH", `2FA code delivery failed for ${user.email} (${type}, Google login): ${deliveryError}`);
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
    const { token, access_token, user_info } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Google credentials");
        if (!token && !access_token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing Google credentials");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Missing Google token or access token",
            });
        }
        let payload;
        if (token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Google ID token");
            try {
                payload = await verifyGoogleIdToken(token);
            }
            catch (error) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid Google token");
                throw (0, error_1.createError)({
                    statusCode: 401,
                    message: error.message || "Invalid Google token",
                });
            }
        }
        else if (access_token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Google access token");
            try {
                payload = await verifyGoogleAccessToken(access_token, user_info);
            }
            catch (error) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid Google access token");
                throw (0, error_1.createError)({
                    statusCode: 401,
                    message: error.message || "Invalid Google access token",
                });
            }
        }
        const { sub: googleId, email } = payload;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Google user data");
        if (!googleId || !email) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Incomplete user information from Google");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Incomplete user information from Google",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking Google provider link");
        const providerUser = await db_1.models.providerUser.findOne({
            where: { providerUserId: googleId, provider: "GOOGLE" },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    include: [{ model: db_1.models.twoFactor, as: "twoFactor" }],
                },
            ],
        });
        if (!providerUser || !providerUser.user || (0, system_accounts_1.isSystemAccount)(providerUser.user)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Google account is not linked to a user");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "This Google account is not linked. Please log in with your password first and link Google from your profile.",
            });
        }
        const user = providerUser.user;
        if (user.email !== email) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Linked Google email does not match user email");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Google account email does not match linked user",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user status");
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
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA challenge issued for ${email} (Google login)`);
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
            description: "Google login",
            severity: "info",
            req: data,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${email} logged in with Google`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Google login failed");
        throw error;
    }
};
