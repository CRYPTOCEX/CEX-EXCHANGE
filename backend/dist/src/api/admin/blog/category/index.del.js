"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes categories by IDs",
    operationId: "bulkDeleteCategories",
    tags: ["Admin", "Content", "Category"],
    parameters: (0, query_1.commonBulkDeleteParams)("Categories"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of category IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Categories"),
    requiresAuth: true,
    permission: "delete.blog.category",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk delete categories",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category IDs");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} categories`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "category",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} categories deleted successfully`);
    return result;
};
