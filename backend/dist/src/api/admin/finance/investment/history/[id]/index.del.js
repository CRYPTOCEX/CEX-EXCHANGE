"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific investment",
    operationId: "deleteInvestment",
    tags: ["Admin", "General", "Investments"],
    parameters: (0, query_1.deleteRecordParams)("investment"),
    responses: (0, query_1.deleteRecordResponses)("investment"),
    permission: "delete.investment",
    requiresAuth: true,
    logModule: "ADMIN_FIN",
    logTitle: "Delete Investment History",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting investment record");
    const result = await (0, query_1.handleSingleDelete)({
        model: "investment",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
