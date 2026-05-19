"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a Investment",
    operationId: "updateInvestmentStatus",
    tags: ["Admin", "Investments"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Investment to update",
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
                            type: "string",
                            enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Investment"),
    requiresAuth: true,
    permission: "edit.investment",
    logModule: "ADMIN_FIN",
    logTitle: "Update Investment Status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment ID and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating investment status");
    const result = await (0, query_1.updateStatus)("investment", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
