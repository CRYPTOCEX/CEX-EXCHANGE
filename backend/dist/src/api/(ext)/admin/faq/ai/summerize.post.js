"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const deepseek_client_1 = require("@b/utils/ai/deepseek-client");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Summarize FAQ Content with AI",
    description: "Generates a concise summary of the provided FAQ content using AI. Useful for creating brief descriptions or meta descriptions from longer FAQ answers.",
    operationId: "summarizeFaqContentWithAi",
    tags: ["Admin", "FAQ", "AI"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        content: {
                            type: "string",
                            description: "FAQ content to summarize",
                        },
                    },
                    required: ["content"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Content summarized successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            summary: {
                                type: "string",
                                description: "AI-generated summary of the content",
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
    logTitle: "AI summarize content",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { content } = body;
    if (!content) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Content is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Content is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Summarizing content with AI");
        const summary = await deepseek_client_1.deepseekClient.summarizeFAQ(content);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Content summarized successfully");
        return summary;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to summarize content");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : "Failed to summarize content",
        });
    }
};
