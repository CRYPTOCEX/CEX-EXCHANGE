"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const deepseek_client_1 = require("@b/utils/ai/deepseek-client");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Improve FAQ Answer with AI",
    description: "Uses AI to enhance an existing FAQ answer, making it more comprehensive, clear, and helpful. The improved answer maintains the original intent while improving readability and completeness.",
    operationId: "improveFaqAnswerWithAi",
    tags: ["Admin", "FAQ", "AI"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        question: { type: "string", description: "The FAQ question" },
                        answer: {
                            type: "string",
                            description: "Current answer to be improved",
                        },
                    },
                    required: ["question", "answer"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "FAQ answer improved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            answer: {
                                type: "string",
                                description: "AI-improved answer",
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
    logTitle: "AI improve FAQ",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { question, answer } = body;
    if (!question || !answer) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Improving FAQ with AI");
        const improvedAnswer = await deepseek_client_1.deepseekClient.improveFAQ(question, answer);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ improved successfully");
        return improvedAnswer;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to improve FAQ");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : "Failed to improve FAQ",
        });
    }
};
