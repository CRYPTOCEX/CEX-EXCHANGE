"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const google_auth_library_1 = require("google-auth-library");
const db_1 = require("@b/db");
const affiliate_1 = require("@b/utils/affiliate");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const captcha_1 = require("@b/utils/captcha");
const address_parser_1 = require("@b/handler/utils/address-parser");
const rate_limiter_1 = require("@b/handler/utils/rate-limiter");
const cache_1 = require("@b/utils/cache");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const token_1 = require("@b/utils/token");
const utils_2 = require("@b/api/auth/otp/utils");
const emails_1 = require("@b/utils/emails");
const constants_1 = require("@b/utils/constants");
const sms_1 = require("@b/utils/sms");
const system_accounts_1 = require("@b/utils/system-accounts");
const sanitize_name_1 = require("@b/utils/sanitize-name");
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const EXPECTED_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const client = new google_auth_library_1.OAuth2Client(CLIENT_ID);
exports.metadata = {
    summary: "Registers a new user with Google",
    operationId: "registerUserWithGoogle",
    tags: ["Auth"],
    description: "Registers a new user using Google and returns a session token",
    requiresAuth: false,
    middleware: ["signup"],
    logModule: "REGISTER",
    logTitle: "Google registration",
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
            description: "User registered successfully",
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
async function verifyGoogleIdToken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Missing payload in Google ID token" });
    }
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
        throw (0, error_1.createError)({ statusCode: 401, message: "Google account email is not verified" });
    }
    return payload;
}
async function verifyGoogleAccessToken(accessToken) {
    var _a, _b;
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
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Failed to fetch user info from Google",
        });
    }
    const data = await response.json();
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
    const { token, access_token, ref } = body;
    let captchaPassed = false;
    let accountCreated = false;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Google credentials");
        if (!token && !access_token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Google token is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Google token or access token is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying security challenge");
        await (0, captcha_1.verifyCaptchaOrThrow)(body, "register", (0, address_parser_1.requestClientIp)(data));
        captchaPassed = true;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Google credentials");
        let payload;
        if (token) {
            payload = await verifyGoogleIdToken(token);
        }
        else if (access_token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Google access token");
            payload = await verifyGoogleAccessToken(access_token);
        }
        if (!payload) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid Google token");
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid Google token" });
        }
        const { sub: googleId, email, given_name: firstName, family_name: lastName, } = payload;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Google user data");
        if (!googleId || !email) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Incomplete user information from Google");
            throw (0, error_1.createError)({ statusCode: 400, message: "Incomplete user information from Google" });
        }
        if (!firstName || !lastName) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Google account has no first and last name");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Your Google account does not provide both a first and a last name. " +
                    "Add them to your Google profile, or sign up with an email address instead.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing user names");
        const sanitizedFirstName = (0, sanitize_name_1.sanitizeName)(firstName);
        const sanitizedLastName = (0, sanitize_name_1.sanitizeName)(lastName);
        if (!sanitizedFirstName || !sanitizedLastName) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid name format");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "First name and last name must only contain letters and spaces"
            });
        }
        if ((0, system_accounts_1.isReservedEmail)(email)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email is under a reserved domain");
            throw (0, error_1.createError)({ statusCode: 400, message: "Email already in use" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking if user ${email} exists`);
        let user = await db_1.models.user.findOne({
            where: { email },
            include: [{ model: db_1.models.twoFactor, as: "twoFactor" }],
        });
        if (!user) {
            const deleted = await db_1.models.user.findOne({
                where: { email },
                paranoid: false,
                attributes: ["id", "deletedAt"],
            });
            if (deleted === null || deleted === void 0 ? void 0 : deleted.deletedAt) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email belongs to a deleted account");
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "This email address belonged to an account that was deleted. " +
                        "Contact support to restore it, or use a different address.",
                });
            }
        }
        let isNewUser = false;
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new user account");
            const grantDemoAdmin = constants_1.isDemo;
            if (grantDemoAdmin && constants_1.isProduction) {
                console_1.logger.warn("AUTH", `NEXT_PUBLIC_DEMO_STATUS is enabled on a PRODUCTION install: granting the Admin ` +
                    `role to public signup ${email}. Unset the flag if this is not a demo deployment.`);
            }
            const roleName = grantDemoAdmin ? "Admin" : "User";
            const role = await (0, utils_1.resolveSignupRole)(roleName);
            user = await db_1.models.user.create({
                firstName: sanitizedFirstName,
                lastName: sanitizedLastName,
                email,
                roleId: role.id,
                emailVerified: true,
                phoneVerified: false,
                settings: {
                    email: true,
                    sms: false,
                    push: false,
                },
            });
            accountCreated = true;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating Google provider link");
            await db_1.models.providerUser.create({
                provider: "GOOGLE",
                providerUserId: googleId,
                userId: user.id,
            });
            if (ref) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing referral code: ${ref}`);
                try {
                    await (0, affiliate_1.handleReferralRegister)(ref, user.id);
                }
                catch (error) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Failed to process referral code", "warn");
                    console_1.logger.error("AUTH", "Error handling referral registration", error);
                }
            }
            isNewUser = true;
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("User exists, checking provider link");
            const providerUser = await db_1.models.providerUser.findOne({
                where: { providerUserId: googleId, provider: "GOOGLE" },
            });
            if (!providerUser) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating Google provider link for existing user");
                await db_1.models.providerUser.create({
                    provider: "GOOGLE",
                    providerUserId: googleId,
                    userId: user.id,
                });
            }
        }
        if (!isNewUser) {
            await (0, rate_limiter_1.refundRateLimit)(data, "signup");
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking 2FA requirement");
            const twoFactorResponse = await issueTwoFactorChallengeIfEnabled(user);
            if (twoFactorResponse) {
                ctx === null || ctx === void 0 ? void 0 : ctx.success(`2FA challenge issued for ${email} (Google login)`);
                return twoFactorResponse;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user: user,
            message: isNewUser
                ? "You have been registered successfully"
                : "You have been logged in successfully",
            req: data,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(isNewUser
            ? `User ${email} registered with Google`
            : `User ${email} logged in with Google`);
        return result;
    }
    catch (error) {
        if (captchaPassed && !accountCreated) {
            await (0, rate_limiter_1.refundRateLimit)(data, "signup");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Google registration/login failed");
        throw error;
    }
};
