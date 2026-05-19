"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Reorder FAQs",
    description: "Reorders FAQ entries within a page or moves a FAQ to a different page. Updates the order field for all affected FAQs. Supports drag-and-drop functionality.",
    operationId: "reorderFaqs",
    tags: ["Admin", "FAQ", "Reorder"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        faqId: {
                            type: "string",
                            format: "uuid",
                            description: "ID of the FAQ being moved",
                        },
                        targetId: {
                            type: ["string", "null"],
                            format: "uuid",
                            description: "ID of the FAQ at the target position (null if dropping to empty area)",
                        },
                        targetPagePath: {
                            type: "string",
                            description: "Optional new page path if moving to a different page",
                        },
                    },
                    required: ["faqId"],
                },
            },
        },
    },
    responses: {
        200: (0, errors_1.successMessageResponse)("FAQs reordered successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("FAQ"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Reorder FAQs",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { faqId, targetId, targetPagePath } = body;
    if (!faqId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing faqId");
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing faqId" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching dragged FAQ");
    const draggedFaq = await db_1.models.faq.findByPk(faqId);
    if (!draggedFaq) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dragged FAQ not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Dragged FAQ not found" });
    }
    let targetFaq = null;
    if (targetId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching target FAQ");
        targetFaq = await db_1.models.faq.findByPk(targetId);
        if (!targetFaq) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Target FAQ not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Target FAQ not found" });
        }
    }
    const contextPagePath = targetPagePath || draggedFaq.pagePath;
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reordering FAQs");
        const faqsOnPage = await db_1.models.faq.findAll({
            where: { pagePath: contextPagePath },
            order: [["order", "ASC"]],
            transaction,
        });
        const filteredFaqs = faqsOnPage.filter((f) => f.id !== draggedFaq.id);
        let newIndex = filteredFaqs.length;
        if (targetFaq) {
            const targetIndex = filteredFaqs.findIndex((f) => f.id === targetFaq.id);
            if (targetIndex === -1) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Target FAQ not found in destination page");
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Target FAQ not found in the destination page",
                });
            }
            newIndex = targetIndex;
        }
        filteredFaqs.splice(newIndex, 0, draggedFaq);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating FAQ order");
        for (let i = 0; i < filteredFaqs.length; i++) {
            await filteredFaqs[i].update({
                order: i,
                pagePath: contextPagePath,
            }, { transaction });
        }
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQs reordered successfully");
        return { message: "FAQs reordered successfully" };
    }
    catch (err) {
        await transaction.rollback();
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to reorder FAQs");
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to reorder FAQs" });
    }
};
