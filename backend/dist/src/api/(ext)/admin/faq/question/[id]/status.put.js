"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update FAQ Question Status",
    description: "Updates the status of a user-submitted FAQ question. Status can be PENDING, ANSWERED, or REJECTED.",
    operationId: "updateFaqQuestionStatus",
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
                        status: {
                            type: "string",
                            enum: ["PENDING", "ANSWERED", "REJECTED"],
                            description: "New status for the FAQ question",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "FAQ question status updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Updated question object",
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
    logTitle: "Update FAQ question status",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { status } = body;
    const validStatuses = ["PENDING", "ANSWERED", "REJECTED"];
    if (!id || !status || !validStatuses.includes(status)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Question ID and a valid status (PENDING, ANSWERED, REJECTED) are required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Question ID and a valid status (PENDING, ANSWERED, REJECTED) are required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQ question");
        const question = await db_1.models.faqQuestion.findByPk(id);
        if (!question) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ question not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "FAQ question not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating question status");
        await question.update({ status });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ question status updated successfully");
        return question;
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update FAQ question status");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to update FAQ question status",
        });
    }
};
