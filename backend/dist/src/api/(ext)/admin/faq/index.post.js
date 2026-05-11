"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const faq_validation_1 = require("@b/api/(ext)/faq/utils/faq-validation");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create New FAQ",
    description: "Creates a new FAQ entry in the system. Validates and sanitizes input data before creation. Automatically determines the order if not specified.",
    operationId: "createFaq",
    tags: ["Admin", "FAQ", "Create"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        question: { type: "string", description: "FAQ question" },
                        answer: { type: "string", description: "FAQ answer" },
                        image: { type: "string", description: "Optional image URL" },
                        category: { type: "string", description: "FAQ category" },
                        tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "Tags for the FAQ",
                        },
                        status: {
                            type: "boolean",
                            description: "Active status (default: true)",
                        },
                        order: {
                            type: "number",
                            description: "Display order (auto-assigned if 0)",
                        },
                        pagePath: {
                            type: "string",
                            description: "Page path where FAQ appears",
                        },
                        relatedFaqIds: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Related FAQ IDs",
                        },
                    },
                    required: ["question", "answer", "category", "pagePath"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "FAQ created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Created FAQ object",
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
    logTitle: "Create FAQ entry",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const validation = (0, faq_validation_1.validateAndSanitizeFAQ)(body, ctx);
    if (!validation.isValid) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: validation.errors.join(', ')
        });
    }
    const sanitizedData = validation.sanitized;
    try {
        const faq = await db_1.sequelize.transaction(async (t) => {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Determining FAQ order");
            let finalOrder = sanitizedData.order;
            if (finalOrder === 0) {
                const maxOrderFaq = await db_1.models.faq.findOne({
                    where: { pagePath: sanitizedData.pagePath },
                    order: [['order', 'DESC']],
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                finalOrder = maxOrderFaq ? maxOrderFaq.order + 1 : 0;
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating FAQ entry");
            return await db_1.models.faq.create({
                ...sanitizedData,
                order: finalOrder,
                relatedFaqIds: body.relatedFaqIds || [],
            }, { transaction: t });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ entry created successfully");
        return faq;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to create FAQ");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error ? error.message : "Failed to create FAQ",
        });
    }
};
