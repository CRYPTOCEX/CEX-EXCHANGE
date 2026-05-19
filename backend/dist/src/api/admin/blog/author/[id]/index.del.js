"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific author",
    operationId: "deleteAuthor",
    tags: ["Admin", "Content", "Author"],
    parameters: (0, query_1.deleteRecordParams)("Author"),
    responses: (0, query_1.deleteRecordResponses)("Author"),
    permission: "delete.blog.author",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Delete author",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating author ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting author");
    const result = await (0, query_1.handleSingleDelete)({
        model: "author",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Author deleted successfully");
    return result;
};
