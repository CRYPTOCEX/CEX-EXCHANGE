"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of sliders",
    operationId: "bulkUpdateSliderStatus",
    tags: ["Admin", "Sliders"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of slider IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the sliders (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Slider"),
    requiresAuth: true,
    permission: "edit.slider",
    logModule: "ADMIN_CMS",
    logTitle: "Bulk update slider status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status of ${(ids === null || ids === void 0 ? void 0 : ids.length) || 0} slider(s) to ${status ? 'active' : 'inactive'}`);
    const result = await (0, query_1.updateStatus)("slider", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated slider status");
    return result;
};
