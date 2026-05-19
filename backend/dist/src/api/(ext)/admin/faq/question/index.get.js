"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get User-Submitted FAQ Questions",
    description: "Retrieves all user-submitted FAQ questions for admin review. Returns questions ordered by creation date (newest first).",
    operationId: "getFaqQuestions",
    tags: ["Admin", "FAQ", "Questions"],
    requiresAuth: true,
    responses: {
        200: {
            description: "FAQ questions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string", description: "Submitter name" },
                                email: { type: "string", format: "email" },
                                question: { type: "string" },
                                answer: { type: "string", nullable: true },
                                status: {
                                    type: "string",
                                    enum: ["PENDING", "ANSWERED", "REJECTED"],
                                },
                                createdAt: { type: "string", format: "date-time" },
                                updatedAt: { type: "string", format: "date-time" },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.faq.question",
    logModule: "ADMIN_FAQ",
    logTitle: "Get FAQ questions",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching faq questions");
        const questions = await db_1.models.faqQuestion.findAll({
            order: [["createdAt", "DESC"]],
            limit: 100,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ questions retrieved successfully");
        return questions;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch faq questions");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error
                ? error.message
                : "Failed to fetch FAQ questions",
        });
    }
};
