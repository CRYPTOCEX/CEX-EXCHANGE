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
const client = new google_auth_library_1.OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
exports.metadata = {
    summary: "Registers a new user with Google",
    operationId: "registerUserWithGoogle",
    tags: ["Auth"],
    description: "Registers a new user using Google and returns a session token",
    requiresAuth: false,
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
async function verifyGoogleToken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
}
async function fetchGoogleUserInfo(accessToken) {
    var _a, _b;
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
function sanitizeName(name) {
    return name.replace(/[^\p{L}\s]/gu, "");
}
function isValidName(name) {
    return /^[\p{L}\s]+$/u.test(name);
}
exports.default = async (data) => {
    const { body, ctx } = data;
    const { token, access_token, ref } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Google credentials");
        if (!token && !access_token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Google token is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Google token or access token is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Google credentials");
        let payload;
        if (token) {
            try {
                payload = await verifyGoogleToken(token);
            }
            catch (error) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("ID token verification failed, trying as access token");
                payload = await fetchGoogleUserInfo(token);
            }
        }
        else if (access_token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying Google access token");
            payload = await fetchGoogleUserInfo(access_token);
        }
        if (!payload) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid Google token");
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid Google token" });
        }
        const { sub: googleId, email, given_name: firstName, family_name: lastName, } = payload;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Google user data");
        if (!googleId || !email || !firstName || !lastName) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Incomplete user information from Google");
            throw (0, error_1.createError)({ statusCode: 400, message: "Incomplete user information from Google" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing user names");
        const sanitizedFirstName = sanitizeName(firstName);
        const sanitizedLastName = sanitizeName(lastName);
        if (!isValidName(sanitizedFirstName) || !isValidName(sanitizedLastName)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid name format");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "First name and last name must only contain letters and spaces"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking if user ${email} exists`);
        let user = await db_1.models.user.findOne({ where: { email } });
        let isNewUser = false;
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new user account");
            const roleName = process.env.NEXT_PUBLIC_DEMO_STATUS === "true" ? "Admin" : "User";
            await db_1.models.role.upsert({ name: roleName });
            const role = await db_1.models.role.findOne({ where: { name: roleName } });
            if (!role)
                throw (0, error_1.createError)({ statusCode: 500, message: "Role not found after upsert." });
            user = await db_1.models.user.create({
                firstName: sanitizedFirstName,
                lastName: sanitizedLastName,
                email,
                roleId: role.id,
                emailVerified: true,
                settings: {
                    email: true,
                    sms: false,
                    push: false,
                },
            });
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user: user,
            message: isNewUser
                ? "You have been registered successfully"
                : "You have been logged in successfully",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(isNewUser
            ? `User ${email} registered with Google`
            : `User ${email} logged in with Google`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Google registration/login failed");
        throw error;
    }
};
