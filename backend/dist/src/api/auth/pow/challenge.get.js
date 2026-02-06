"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const pow_captcha_1 = require("@b/utils/pow-captcha");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get a proof-of-work challenge",
    description: "Generates a new proof-of-work challenge for bot protection. The client must solve this challenge before submitting forms.",
    operationId: "getPowChallenge",
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
            description: "Challenge generated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            enabled: {
                                type: "boolean",
                                description: "Whether PoW captcha is enabled",
                            },
                            challenge: {
                                type: "string",
                                description: "The challenge string to solve",
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
    var _a, _b;
    const { query, headers } = data;
    const { action } = query;
    const enabled = await (0, pow_captcha_1.isPowCaptchaEnabled)();
    if (!enabled) {
        return { enabled: false };
    }
    const validActions = ["login", "register", "reset"];
    if (!action || !validActions.includes(action)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid or missing action parameter",
        });
    }
    try {
        const clientIp = ((_b = (_a = headers === null || headers === void 0 ? void 0 : headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
            (headers === null || headers === void 0 ? void 0 : headers["x-real-ip"]) ||
            "unknown";
        const challenge = await (0, pow_captcha_1.generatePowChallenge)(action, clientIp);
        return {
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
