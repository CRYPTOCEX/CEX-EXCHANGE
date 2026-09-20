"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific comment",
    operationId: "deleteComment",
    tags: ["Admin", "Content", "Comment"],
    parameters: (0, query_1.deleteRecordParams)("Comment"),
    responses: (0, query_1.deleteRecordResponses)("Comment"),
    permission: "delete.blog.comment",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Delete comment",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating comment ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting comment");
    const result = await (0, query_1.handleSingleDelete)({
        model: "comment",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Comment deleted successfully");
    return result;
};
