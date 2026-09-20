"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific category",
    operationId: "deleteCategory",
    tags: ["Admin", "Content", "Category"],
    parameters: (0, query_1.deleteRecordParams)("Category"),
    responses: (0, query_1.deleteRecordResponses)("Category"),
    permission: "delete.blog.category",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Delete category",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting category");
    const result = await (0, query_1.handleSingleDelete)({
        model: "category",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Category deleted successfully");
    return result;
};
