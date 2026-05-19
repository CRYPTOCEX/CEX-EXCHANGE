"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of CMS pages",
    operationId: "bulkUpdatePageStatus",
    tags: ["Admin", "Content", "Page"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of page IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            description: "New status to apply to the pages",
                            enum: ["PUBLISHED", "DRAFT"],
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Page"),
    requiresAuth: true,
    permission: "edit.page",
    logModule: "ADMIN_CMS",
    logTitle: "Bulk update page status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status of ${(ids === null || ids === void 0 ? void 0 : ids.length) || 0} page(s) to ${status}`);
    const result = await (0, query_1.updateStatus)("page", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated page status`);
    return result;
};
