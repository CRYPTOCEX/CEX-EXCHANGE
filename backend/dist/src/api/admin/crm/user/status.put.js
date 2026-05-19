"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of users",
    operationId: "bulkUpdateUserStatus",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Bulk update user status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of user IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            description: "New status to apply",
                            enum: ["ACTIVE", "INACTIVE", "BANNED"],
                        },
                    },
                    required: ["users", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("User"),
    requiresAuth: true,
    permission: "edit.user",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { ids } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status for ${ids.length} users to ${status}`);
    const result = await (0, query_1.updateStatus)("user", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
