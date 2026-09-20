"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const deepseek_client_1 = require("@b/utils/ai/deepseek-client");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Suggest Tags for FAQ with AI",
    description: "Uses AI to analyze an FAQ question and answer pair to suggest 3-5 relevant tags. Tags help with categorization and searchability of FAQ content.",
    operationId: "suggestFaqTagsWithAi",
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
                        answer: { type: "string", description: "The FAQ answer" },
                    },
                    required: ["question", "answer"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Tags suggested successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            tags: {
                                type: "array",
                                items: { type: "string" },
                                description: "AI-suggested tags (3-5 tags)",
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
    logTitle: "AI suggest tags",
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Suggesting tags with AI");
        const tags = await deepseek_client_1.deepseekClient.suggestTags(question, answer);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Tags suggested successfully");
        return tags;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to suggest tags");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : "Failed to suggest tags",
        });
    }
};
