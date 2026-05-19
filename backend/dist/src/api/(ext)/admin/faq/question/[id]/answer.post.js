"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Answer User-Submitted FAQ Question",
    description: "Submits an answer to a user-submitted FAQ question and updates its status to ANSWERED. The answer is stored with the question record.",
    operationId: "answerFaqQuestion",
    tags: ["Admin", "FAQ", "Questions"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "FAQ question ID",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        answer: {
                            type: "string",
                            description: "The answer to the question",
                        },
                    },
                    required: ["answer"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "FAQ question answered successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Updated question object with answer",
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("FAQ question"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.faq.question",
    logModule: "ADMIN_FAQ",
    logTitle: "Answer FAQ question",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { answer } = body;
    if (!id || !answer) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Question ID and answer are required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Question ID and answer are required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQ question");
        const question = await db_1.models.faqQuestion.findByPk(id);
        if (!question) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ question not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "FAQ question not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating question with answer");
        await question.update({ answer, status: "ANSWERED" });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ question answered successfully");
        return question;
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to answer FAQ question");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to answer FAQ question",
        });
    }
};
