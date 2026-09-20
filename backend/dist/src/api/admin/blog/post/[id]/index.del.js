"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific post",
    operationId: "deletePost",
    tags: ["Admin", "Content", "Posts"],
    parameters: (0, query_1.deleteRecordParams)("Post"),
    responses: (0, query_1.deleteRecordResponses)("Post"),
    permission: "delete.blog.post",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Delete blog post",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting blog post");
    const result = await (0, query_1.handleSingleDelete)({
        model: "post",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blog post deleted successfully");
    return result;
};
