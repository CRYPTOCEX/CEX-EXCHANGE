"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes comments by IDs",
    operationId: "bulkDeleteComments",
    tags: ["Admin", "Content", "Comment"],
    parameters: (0, query_1.commonBulkDeleteParams)("Comments"),
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
                            description: "Array of comment IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Comments"),
    requiresAuth: true,
    permission: "delete.blog.comment",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk delete comments",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating comment IDs");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} comments`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "comment",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} comments deleted successfully`);
    return result;
};
