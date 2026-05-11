"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const faq_validation_1 = require("@b/api/(ext)/faq/utils/faq-validation");
exports.metadata = {
    summary: "Submit Feedback for FAQ",
    description: "Creates a new feedback record for a specific FAQ. Users can indicate if the FAQ was helpful and optionally provide a comment.",
    operationId: "submitFaqFeedback",
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
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        isHelpful: {
                            type: "boolean",
                            description: "Indicates if the FAQ was helpful",
                        },
                        comment: {
                            type: "string",
                            description: "Optional feedback comment",
                        },
                    },
                    required: ["isHelpful"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Feedback submitted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Created feedback record",
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "create.faq.feedback",
    logModule: "ADMIN_FAQ",
    logTitle: "Submit FAQ feedback",
};
exports.default = async (data) => {
    const { params, body, ctx, user } = data;
    const { id } = params;
    if (!id || typeof body.isHelpful !== "boolean") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ ID and isHelpful are required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "FAQ ID and isHelpful are required",
        });
    }
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User authentication required");
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User authentication required",
        });
    }
    if (body.comment !== undefined) {
        const commentValidation = (0, faq_validation_1.validateFeedbackComment)(body.comment);
        if (!commentValidation.isValid) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(commentValidation.errors.join(", "));
            throw (0, error_1.createError)({
                statusCode: 400,
                message: commentValidation.errors.join(", "),
            });
        }
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying FAQ exists");
        const faq = await db_1.models.faq.findByPk(id);
        if (!faq) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "FAQ not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating feedback record");
        const sanitizedComment = body.comment
            ? (0, faq_validation_1.sanitizeInput)(body.comment)
            : body.comment;
        const feedback = await db_1.models.faqFeedback.create({
            faqId: id,
            userId: user.id,
            isHelpful: body.isHelpful,
            comment: sanitizedComment,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Feedback submitted successfully");
        return feedback;
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to submit feedback");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to submit feedback",
        });
    }
};
