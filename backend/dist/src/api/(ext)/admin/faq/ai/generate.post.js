"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const deepseek_client_1 = require("@b/utils/ai/deepseek-client");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Generate FAQ Content with AI",
    description: "Generates a comprehensive FAQ question and answer pair based on a given topic and optional context using AI. Returns structured FAQ content ready to be saved.",
    operationId: "generateFaqWithAi",
    tags: ["Admin", "FAQ", "AI"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        topic: { type: "string", description: "Topic for the FAQ" },
                        context: {
                            type: "string",
                            description: "Optional additional context for FAQ generation",
                        },
                    },
                    required: ["topic"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "FAQ content generated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            question: {
                                type: "string",
                                description: "Generated FAQ question",
                            },
                            answer: {
                                type: "string",
                                description: "Generated FAQ answer",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "create.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "AI generate FAQ",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { topic, context } = body;
    if (!topic) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Topic is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Topic is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating FAQ with AI");
        const generatedFAQ = await deepseek_client_1.deepseekClient.generateFAQ(topic, context);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ generated successfully");
        return generatedFAQ;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to generate FAQ");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : "Failed to generate FAQ",
        });
    }
};
