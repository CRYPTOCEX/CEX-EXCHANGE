"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const validator_1 = __importDefault(require("validator"));
const faq_validation_1 = require("@b/api/(ext)/faq/utils/faq-validation");
exports.metadata = {
    summary: "Update Single FAQ",
    description: "Updates an existing FAQ entry by ID. Allows partial updates of FAQ fields including question, answer, category, tags, status, order, and related FAQs.",
    operationId: "updateFaq",
    tags: ["Admin", "FAQ", "Update"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "FAQ ID to update",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        question: { type: "string", description: "FAQ question" },
                        answer: { type: "string", description: "FAQ answer" },
                        image: { type: "string", description: "Image URL" },
                        category: { type: "string", description: "FAQ category" },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "FAQ tags",
                        },
                        status: { type: "boolean", description: "Active status" },
                        order: { type: "number", description: "Display order" },
                        pagePath: { type: "string", description: "Page path" },
                        relatedFaqIds: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Related FAQ IDs",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "FAQ updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Updated FAQ object",
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("FAQ"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Update FAQ entry",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQ");
    const faq = await db_1.models.faq.findByPk(params.id);
    if (!faq) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "FAQ not found" });
    }
    const { question, answer, image, category, tags, status, order, pagePath, relatedFaqIds, } = body;
    if (pagePath !== undefined && pagePath === "") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("pagePath cannot be empty");
        throw (0, error_1.createError)({ statusCode: 400, message: "pagePath cannot be empty" });
    }
    const updateData = {};
    if (question !== undefined)
        updateData.question = typeof question === 'string' ? validator_1.default.escape(question.trim()) : question;
    if (answer !== undefined)
        updateData.answer = (0, faq_validation_1.sanitizeHTML)(answer);
    if (image !== undefined)
        updateData.image = image;
    if (category !== undefined)
        updateData.category = typeof category === 'string' ? validator_1.default.escape(category.trim()) : category;
    if (tags !== undefined)
        updateData.tags = tags;
    if (status !== undefined)
        updateData.status = status;
    if (order !== undefined)
        updateData.order = order;
    if (pagePath !== undefined)
        updateData.pagePath = pagePath;
    if (relatedFaqIds !== undefined)
        updateData.relatedFaqIds = relatedFaqIds;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating FAQ");
    await faq.update(updateData);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ updated successfully");
    return faq;
};
