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
const pow_captcha_1 = require("@b/utils/pow-captcha");
function sanitizeName(name) {
    if (typeof name !== "string")
        return "";
    let sanitized = name.replace(/<.*?>/g, "");
    sanitized = sanitized.replace(/[&<>"'/\\;:]/g, "");
    sanitized = sanitized.replace(/[^\p{L} \-'.]/gu, "");
    sanitized = sanitized.trim().slice(0, 64);
    return sanitized;
}
exports.metadata = {
    summary: "Registers a new user",
    operationId: "registerUser",
    tags: ["Auth"],
    description: "Registers a new user and returns a session token",
    requiresAuth: false,
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
                        powSolution: {
                            type: "object",
                            description: "Proof-of-work solution if enabled",
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
    const { email, password, ref, powSolution } = body;
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
        try {
            await (0, pow_captcha_1.verifyPowOrThrow)(powSolution, "register");
        }
        catch (powError) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Security verification failed");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: powError instanceof Error ? powError.message : "Security verification failed",
            });
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing user input");
        firstName = sanitizeName(firstName);
        lastName = sanitizeName(lastName);
        if (!firstName || !lastName) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid name(s) after sanitization");
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid name(s)" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking if email ${email} is available`);
        const existingUser = await db_1.models.user.findOne({ where: { email } });
        if (existingUser && existingUser.email) {
            const verifyEmailEnabled = (await cacheManager.getSetting("verifyEmailStatus")) === "true";
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
        await db_1.models.role.upsert({ name: "User" });
        const roleName = process.env.NEXT_PUBLIC_DEMO_STATUS === "true" ? "Admin" : "User";
        await db_1.models.role.upsert({ name: roleName });
        const role = await db_1.models.role.findOne({ where: { name: roleName } });
        if (!role)
            throw (0, error_1.createError)({ statusCode: 500, message: "Role not found after upsert." });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new user account");
        const newUser = await db_1.models.user.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            roleId: role.id,
            emailVerified: false,
            settings: {
                email: true,
                sms: false,
                push: false,
            },
        });
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
        const verifyEmailEnabled = (await cacheManager.getSetting("verifyEmailStatus")) === "true";
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
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`User ${email} registered and logged in`);
            return result;
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Registration failed");
        throw error;
    }
};
