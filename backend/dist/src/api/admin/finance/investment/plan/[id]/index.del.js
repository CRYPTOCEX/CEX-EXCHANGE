"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes an investment plan",
    operationId: "deleteInvestmentPlan",
    tags: ["Admin", "Investment Plan"],
    logModule: "ADMIN_FIN",
    logTitle: "Delete Investment Plan",
    parameters: (0, query_1.deleteRecordParams)("investment plan"),
    responses: (0, query_1.deleteRecordResponses)("Investment plan"),
    permission: "delete.investment.plan",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting investment plan");
    const result = await (0, query_1.handleSingleDelete)({
        model: "investmentPlan",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment plan deleted successfully");
    return result;
};
