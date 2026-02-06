"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const google_auth_library_1 = require("google-auth-library");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const error_1 = require("@b/utils/error");
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
    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
    if (tokenInfoResponse.ok) {
        const tokenInfo = await tokenInfoResponse.json();
        if (tokenInfo.aud && tokenInfo.aud !== CLIENT_ID) {
            console.warn("Access token audience mismatch:", tokenInfo.aud);
        }
    }
    return {
        sub: data.id,
        email: data.email,
        given_name: data.given_name || ((_a = data.name) === null || _a === void 0 ? void 0 : _a.split(' ')[0]) || '',
        family_name: data.family_name || ((_b = data.name) === null || _b === void 0 ? void 0 : _b.split(' ').slice(1).join(' ')) || '',
        picture: data.picture,
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
        const { sub: googleId, email, given_name: firstName, family_name: lastName, } = payload;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating Google user data");
        if (!googleId || !email || !firstName || !lastName) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Incomplete user information from Google");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Incomplete user information from Google",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${email}`);
        const user = await db_1.models.user.findOne({ where: { email } });
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found. Please register first.",
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking Google provider link");
        const providerUser = await db_1.models.providerUser.findOne({
            where: { providerUserId: googleId, provider: "GOOGLE" },
        });
        if (!providerUser) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating Google provider link");
            await db_1.models.providerUser.create({
                provider: "GOOGLE",
                providerUserId: googleId,
                userId: user.id,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
        const result = await (0, utils_1.returnUserWithTokens)({
            user,
            message: "You have been logged in successfully",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${email} logged in with Google`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Google login failed");
        throw error;
    }
};
