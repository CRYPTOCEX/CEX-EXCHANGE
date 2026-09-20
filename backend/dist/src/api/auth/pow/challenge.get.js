"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const pow_captcha_1 = require("@b/utils/pow-captcha");
const captcha_1 = require("@b/utils/captcha");
const address_parser_1 = require("@b/handler/utils/address-parser");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get the active captcha configuration (and a challenge, for PoW)",
    description: "Returns which captcha provider is armed and its public site key. When the provider is the built-in proof-of-work, also mints a challenge for the client to solve. NOTE: switching the provider away from proof-of-work will stop any released client that only understands `powSolution` from registering until it is updated.",
    operationId: "getCaptchaChallenge",
    tags: ["Auth"],
    requiresAuth: false,
    parameters: [
        {
            name: "action",
            in: "query",
            required: true,
            schema: {
                type: "string",
                enum: ["login", "register", "reset"],
                description: "The action this challenge is for",
            },
        },
    ],
    responses: {
        200: {
            description: "Captcha configuration retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            provider: {
                                type: "string",
                                description: "Armed provider: none | pow | turnstile | recaptcha | hcaptcha",
                            },
                            siteKey: {
                                type: "string",
                                description: "Public site key for the armed provider. Empty for none/pow.",
                            },
                            enabled: {
                                type: "boolean",
                                description: "True only when the armed provider is the built-in proof-of-work, i.e. when a challenge follows.",
                            },
                            challenge: {
                                type: "string",
                                description: "The challenge string to solve (proof-of-work only)",
                            },
                            difficulty: {
                                type: "number",
                                description: "Number of leading zero bits required in hash",
                            },
                            timestamp: {
                                type: "number",
                                description: "Challenge creation timestamp",
                            },
                            expiresIn: {
                                type: "number",
                                description: "Time until challenge expires (ms)",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request",
        },
        429: {
            description: "Too many requests",
        },
    },
};
exports.default = async (data) => {
    const { query } = data;
    const { action } = query;
    const { provider, siteKey } = await (0, captcha_1.getPublicCaptchaConfig)();
    const validActions = ["login", "register", "reset"];
    if (!action || !validActions.includes(action)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid or missing action parameter",
        });
    }
    if (provider !== "pow") {
        return { provider, siteKey, enabled: false };
    }
    try {
        const challenge = await (0, pow_captcha_1.generatePowChallenge)(action, (0, address_parser_1.requestClientIp)(data));
        return {
            provider,
            siteKey,
            enabled: true,
            ...challenge,
        };
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("Too many")) {
            throw (0, error_1.createError)({
                statusCode: 429,
                message: error.message,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to generate challenge",
        });
    }
};
