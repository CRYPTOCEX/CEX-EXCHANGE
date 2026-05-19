"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Feedback for Specific FAQ",
    description: "Retrieves all feedback records for a specific FAQ entry. Returns user ratings and comments ordered by creation date.",
    operationId: "getFaqFeedbackById",
    tags: ["Admin", "FAQ", "Feedback"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "FAQ ID",
        },
    ],
    responses: {
        200: {
            description: "Feedback records retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                faqId: { type: "string", format: "uuid" },
                                userId: { type: "string", format: "uuid" },
                                isHelpful: { type: "boolean" },
                                comment: { type: "string", nullable: true },
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
    permission: "view.faq.feedback",
    logModule: "ADMIN_FAQ",
    logTitle: "Get FAQ feedback by ID",
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQ feedback by FAQ ID");
        const feedbacks = await db_1.models.faqFeedback.findAll({
            where: { faqId: params.id },
            order: [["createdAt", "ASC"]],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ feedback retrieved successfully");
        return feedbacks;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch all faq feedback");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : "Failed to fetch feedback",
        });
    }
};
