"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const Middleware_1 = require("@b/handler/Middleware");
const faq_validation_1 = require("@b/api/(ext)/faq/utils/faq-validation");
exports.metadata = {
    summary: "Submit FAQ Feedback",
    description: "Creates or updates a feedback record for a specific FAQ. If a feedback record already exists for the user and FAQ, it updates the comment field.",
    operationId: "submitFAQFeedbackPublic",
    tags: ["FAQ"],
    logModule: "FAQ",
    logTitle: "Submit FAQ Feedback",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
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
                        isHelpful: { type: "boolean" },
                        comment: { type: "string" },
                    },
                    required: ["isHelpful"],
                },
            },
        },
    },
    responses: {
        200: { description: "Feedback submitted successfully" },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Applying rate limiting");
    await (0, Middleware_1.faqFeedbackRateLimit)(data);
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    if (!id || typeof body.isHelpful !== "boolean") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid input");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid input" });
    }
    if (body.comment !== undefined) {
        const commentValidation = (0, faq_validation_1.validateFeedbackComment)(body.comment);
        if (!commentValidation.isValid) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid comment");
            throw (0, error_1.createError)({ statusCode: 400, message: commentValidation.errors.join(', ') });
        }
    }
    const sanitizedComment = body.comment ? (0, faq_validation_1.sanitizeInput)(body.comment) : body.comment;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Verifying FAQ exists (ID: ${id})`);
        const faq = await db_1.models.faq.findByPk(id);
        if (!faq) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "FAQ not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking for existing feedback (FAQ ID: ${id})`);
        const existingFeedback = await db_1.models.faqFeedback.findOne({
            where: { faqId: id, userId: user.id },
        });
        if (existingFeedback) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating existing feedback record");
            const updatedFeedback = await existingFeedback.update({
                isHelpful: body.isHelpful,
                comment: sanitizedComment || existingFeedback.comment,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Feedback updated successfully (ID: ${updatedFeedback.id})`);
            return updatedFeedback;
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating new feedback record");
            const feedback = await db_1.models.faqFeedback.create({
                userId: user.id,
                faqId: id,
                isHelpful: body.isHelpful,
                comment: sanitizedComment,
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Feedback created successfully (ID: ${feedback.id})`);
            return feedback;
        }
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
