"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific tag",
    operationId: "deleteTag",
    tags: ["Admin", "Content", "Tag"],
    parameters: (0, query_1.deleteRecordParams)("Tag"),
    responses: (0, query_1.deleteRecordResponses)("Tag"),
    permission: "delete.blog.tag",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Delete tag",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating tag ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting tag");
    const result = await (0, query_1.handleSingleDelete)({
        model: "tag",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tag deleted successfully");
    return result;
};
