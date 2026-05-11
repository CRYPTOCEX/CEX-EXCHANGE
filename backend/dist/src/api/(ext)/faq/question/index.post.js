"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const faq_validation_1 = require("@b/api/(ext)/faq/utils/faq-validation");
const Middleware_1 = require("@b/handler/Middleware");
exports.metadata = {
    summary: "Submit FAQ Question",
    description: "Allows a user to submit a question if they cannot find an answer in the FAQs.",
    operationId: "submitFAQQuestion",
    tags: ["FAQ"],
    logModule: "FAQ",
    logTitle: "Submit FAQ Question",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: { type: "string", description: "User's email" },
                        question: { type: "string", description: "The submitted question" },
                    },
                    required: ["email", "question"],
                },
            },
        },
    },
    responses: {
        200: { description: "Question submitted successfully" },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Applying rate limiting");
    await (0, Middleware_1.faqQuestionRateLimit)(data);
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { email, question } = body;
    if (!email || !question) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
    const emailValidation = (0, faq_validation_1.validateEmail)(email, ctx);
    if (!emailValidation.isValid) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: emailValidation.errors.join(', ')
        });
    }
    const questionValidation = (0, faq_validation_1.validateFAQQuestion)(question, ctx);
    if (!questionValidation.isValid) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: questionValidation.errors.join(', ')
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user details");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 400, message: "User not found" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating FAQ question record");
        const newQuestion = await db_1.models.faqQuestion.create({
            name: (0, faq_validation_1.sanitizeInput)(userPk.firstName + " " + userPk.lastName, ctx),
            email: email.trim().toLowerCase(),
            question: (0, faq_validation_1.sanitizeInput)(question, ctx),
            status: "PENDING",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`FAQ question submitted successfully (ID: ${newQuestion.id})`);
        return newQuestion;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to submit question");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to submit question",
        });
    }
};
