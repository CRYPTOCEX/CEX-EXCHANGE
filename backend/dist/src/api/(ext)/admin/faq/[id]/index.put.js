"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating FAQ");
    await faq.update({
        question,
        answer,
        image,
        category,
        tags,
        status,
        order,
        pagePath,
        relatedFaqIds,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ updated successfully");
    return faq;
};
