"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates Forex account status",
    operationId: "updateForexAccountStatus",
    tags: ["Admin", "Forex", "Account"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex account to update",
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
    responses: (0, query_1.updateRecordResponses)("Forex Account"),
    requiresAuth: true,
    permission: "edit.forex.account",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex account status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex account ${id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating forex account status to ${status ? "active" : "inactive"}`);
    const result = await (0, query_1.updateStatus)("forexAccount", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex account status updated successfully");
    return result;
};
