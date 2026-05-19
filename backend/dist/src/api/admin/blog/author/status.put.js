"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of authors",
    operationId: "bulkUpdateAuthorStatus",
    tags: ["Admin", "Content", "Author"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of author IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["PENDING", "APPROVED", "REJECTED"],
                            description: "New status to apply to the authors",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Author"),
    requiresAuth: true,
    permission: "edit.blog.author",
    logModule: "ADMIN_BLOG",
    logTitle: "Bulk update author status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating author IDs and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status} for ${ids.length} authors`);
    const result = await (0, query_1.updateStatus)("author", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} authors status updated successfully`);
    return result;
};
