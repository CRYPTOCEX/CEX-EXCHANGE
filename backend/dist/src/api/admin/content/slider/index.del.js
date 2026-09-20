"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes sliders by IDs",
    operationId: "bulkDeleteSliders",
    tags: ["Admin", "Sliders"],
    parameters: (0, query_1.commonBulkDeleteParams)("Sliders"),
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
                            description: "Array of slider IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Sliders"),
    requiresAuth: true,
    permission: "delete.slider",
    logModule: "ADMIN_CMS",
    logTitle: "Bulk delete sliders",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Bulk deleting ${(ids === null || ids === void 0 ? void 0 : ids.length) || 0} slider(s)`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "slider",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully deleted slider(s)");
    return result;
};
