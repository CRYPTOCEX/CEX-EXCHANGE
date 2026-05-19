"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of categories",
    operationId: "bulkUpdateCategoryStatus",
    tags: ["Admin", "Content", "Category"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of category IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the categories (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Category"),
    requiresAuth: true,
    permission: "edit.blog.category",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk update category status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category IDs and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status ? 'active' : 'inactive'} for ${ids.length} categories`);
    const result = await (0, query_1.updateStatus)("category", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} categories status updated successfully`);
    return result;
};
