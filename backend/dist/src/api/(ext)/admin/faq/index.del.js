"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk Delete FAQs",
    description: "Deletes multiple FAQ entries in a single operation. Accepts an array of FAQ IDs to delete.",
    operationId: "bulkDeleteFaqs",
    tags: ["Admin", "FAQ", "BulkOperations"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Array of FAQ IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: (0, errors_1.successMessageResponse)("FAQs deleted successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "delete.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Bulk delete FAQs",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No FAQ IDs provided");
        throw (0, error_1.createError)({ statusCode: 400, message: "No FAQ IDs provided" });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (ids.some((id) => !uuidRegex.test(id))) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid ID format");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid ID format" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting FAQs");
    await db_1.models.faq.destroy({ where: { id: ids } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQs deleted successfully");
    return { message: "FAQs deleted successfully" };
};
