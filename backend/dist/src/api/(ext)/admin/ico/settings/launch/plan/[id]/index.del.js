"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Delete ICO Launch Plan",
    description: "Deletes a specific ICO launch plan by ID. Supports both soft delete (default) and permanent delete based on query parameter.",
    operationId: "deleteIcoLaunchPlan",
    tags: ["Admin", "ICO", "Settings"],
    parameters: (0, query_1.deleteRecordParams)("Launch Plan"),
    responses: (0, query_1.deleteRecordResponses)("Launch Plan"),
    requiresAuth: true,
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Delete launch plan",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating launch plan");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting launch plan");
    const result = await (0, query_1.handleSingleDelete)({
        model: "icoLaunchPlan",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Launch plan deleted successfully");
    return result;
};
