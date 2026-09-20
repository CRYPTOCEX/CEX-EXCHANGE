"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates a Forex plan status",
    description: "Updates the active/inactive status of a specific Forex plan. Active plans are visible to users for investment.",
    operationId: "updateForexPlanStatus",
    tags: ["Admin", "Forex", "Plan"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex plan to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Plan"),
    requiresAuth: true,
    permission: "edit.forex.plan",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex plan status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating record ${id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating status");
    const result = await (0, query_1.updateStatus)("forexPlan", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Status updated successfully");
    return result;
};
