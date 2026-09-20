"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const deepseek_client_1 = require("@b/utils/ai/deepseek-client");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Generate AI Answer for User Question",
    description: "Uses AI to generate an answer to a user question based on existing active FAQs. The AI analyzes all active FAQ entries to provide a relevant answer.",
    operationId: "generateAiAnswerForQuestion",
    tags: ["Admin", "FAQ", "AI"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        question: {
                            type: "string",
                            description: "The user question to be answered",
                        },
                    },
                    required: ["question"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "AI-generated answer returned successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            answer: {
                                type: "string",
                                description: "AI-generated answer based on existing FAQs",
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
    logTitle: "AI answer question",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { question } = body;
    if (!question) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Question is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Question is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving active FAQs");
        const faqs = await db_1.models.faq.findAll({
            where: { status: true },
            attributes: ["question", "answer"],
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating AI answer");
        const answer = await deepseek_client_1.deepseekClient.answerQuestion(question, faqs);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Question answered successfully");
        return answer;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to answer question");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : "Failed to answer question",
        });
    }
};
