"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const passwords_1 = require("@b/utils/passwords");
const db_1 = require("@b/db");
const affiliate_1 = require("@b/utils/affiliate");
const utils_1 = require("../utils");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const captcha_1 = require("@b/utils/captcha");
const address_parser_1 = require("@b/handler/utils/address-parser");
const rate_limiter_1 = require("@b/handler/utils/rate-limiter");
const constants_1 = require("@b/utils/constants");
const system_accounts_1 = require("@b/utils/system-accounts");
const sanitize_name_1 = require("@b/utils/sanitize-name");
exports.metadata = {
    summary: "Registers a new user",
    operationId: "registerUser",
    tags: ["Auth"],
    description: "Registers a new user and returns a session token",
    requiresAuth: false,
    middleware: ["signup"],
    logModule: "REGISTER",
    logTitle: "User registration",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        firstName: {
                            type: "string",
                            description: "First name of the user",
                        },
                        lastName: {
                            type: "string",
                            description: "Last name of the user",
                        },
                        email: {
                            type: "string",
                            format: "email",
                            description: "Email of the user",
                        },
                        password: {
                            type: "string",
                            description: "Password of the user",
                        },
                        ref: {
                            type: "string",
                            description: "Referral code",
                        },
                        captcha: {
                            type: "object",
                            description: "Captcha submission for the armed provider. `token` for Turnstile / reCAPTCHA / hCaptcha, `solution` for the built-in proof-of-work.",
                            nullable: true,
                            properties: {
                                provider: { type: "string" },
                                token: { type: "string" },
                                solution: {
                                    type: "object",
                                    properties: {
                                        challenge: { type: "string" },
                                        nonce: { type: "number" },
                                        hash: { type: "string" },
                                    },
                                },
                            },
                        },
                        powSolution: {
                            type: "object",
                            description: "LEGACY proof-of-work solution. Still accepted so already-released clients keep working; new clients should send `captcha`.",
                            nullable: true,
                            properties: {
                                challenge: { type: "string" },
                                nonce: { type: "number" },
                                hash: { type: "string" },
                            },
                        },
                    },
                    required: ["firstName", "lastName", "email", "password"],
                },
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
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            cookies: {
                                type: "object",
                                properties: {
                                    accessToken: {
                                        type: "string",
                                        description: "Access token",
                                    },
                                    sessionId: {
                                        type: "string",
                                        description: "Session ID",
                                    },
                                    csrfToken: {
                                        type: "string",
                                        description: "CSRF token",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., email already in use)",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Error message",
                            },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    let { firstName, lastName } = body;
    const { password, ref } = body;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email;
    let captchaPassed = false;
    let accountCreated = false;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating registration data");
        if (!email || !password || !firstName || !lastName) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required registration fields");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "All fields are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying security challenge");
        await (0, captcha_1.verifyCaptchaOrThrow)(body, "register", (0, address_parser_1.requestClientIp)(data));
        captchaPassed = true;
        const cacheManager = cache_1.CacheManager.getInstance();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing user input");
        firstName = (0, sanitize_name_1.sanitizeName)(firstName);
        lastName = (0, sanitize_name_1.sanitizeName)(lastName);
        if (!firstName || !lastName) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid name(s) after sanitization");
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid name(s)" });
        }
        if ((0, system_accounts_1.isReservedEmail)(email)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email is under a reserved domain");
            throw (0, error_1.createError)({ statusCode: 400, message: "Email already in use" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking if email ${email} is available`);
        const existingUser = await db_1.models.user.findOne({
            where: { email },
            paranoid: false,
        });
        if (existingUser === null || existingUser === void 0 ? void 0 : existingUser.deletedAt) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email belongs to a deleted account");
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This email address belonged to an account that was deleted. " +
                    "Contact support to restore it, or use a different address.",
            });
        }
        if (existingUser && existingUser.email) {
            const verifyEmailEnabled = await cacheManager.getSettingBool("verifyEmailStatus", true);
            if (!existingUser.emailVerified &&
                verifyEmailEnabled) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("User exists but email not verified, resending verification");
                await (0, utils_1.sendEmailVerificationToken)(existingUser.id, existingUser.email);
                ctx === null || ctx === void 0 ? void 0 : ctx.success("Verification email resent");
                return {
                    message: "User already registered but email not verified. Verification email sent.",
                };
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email already in use");
            throw (0, error_1.createError)({ statusCode: 400, message: "Email already in use" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating password policy");
        if (!(0, passwords_1.validatePassword)(password)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Password does not meet requirements");
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid password format" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Hashing password");
        const hashedPassword = await (0, passwords_1.hashPassword)(password);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Setting up user role");
        const grantDemoAdmin = constants_1.isDemo;
        if (grantDemoAdmin && constants_1.isProduction) {
            console_1.logger.warn("AUTH", `NEXT_PUBLIC_DEMO_STATUS is enabled on a PRODUCTION install: granting the Admin ` +
                `role to public signup ${email}. Unset the flag if this is not a demo deployment.`);
        }
        const roleName = grantDemoAdmin ? "Admin" : "User";
        const role = await (0, utils_1.resolveSignupRole)(roleName);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new user account");
        const newUser = await db_1.models.user.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            roleId: role.id,
            emailVerified: false,
            phoneVerified: false,
            settings: {
                email: true,
                sms: false,
                push: false,
            },
        });
        accountCreated = true;
        if (!newUser.email) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Error creating user");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Error creating user",
            });
        }
        if (ref) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing referral code: ${ref}`);
            try {
                await (0, affiliate_1.handleReferralRegister)(ref, newUser.id);
            }
            catch (error) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Failed to process referral code", "warn");
                console_1.logger.error("AUTH", "Error handling referral registration", error);
            }
        }
        const verifyEmailEnabled = await cacheManager.getSettingBool("verifyEmailStatus", true);
        if (verifyEmailEnabled) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending email verification");
            await (0, utils_1.sendEmailVerificationToken)(newUser.id, newUser.email);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${email} registered, verification email sent`);
            return {
                message: "Registration successful, please verify your email",
            };
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating session tokens");
            const result = await (0, utils_1.returnUserWithTokens)({
                user: newUser,
                message: "You have been registered successfully",
                req: data,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${email} registered and logged in`);
            return result;
        }
    }
    catch (error) {
        if (captchaPassed && !accountCreated) {
            await (0, rate_limiter_1.refundRateLimit)(data, "signup");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Registration failed");
        throw error;
    }
};
