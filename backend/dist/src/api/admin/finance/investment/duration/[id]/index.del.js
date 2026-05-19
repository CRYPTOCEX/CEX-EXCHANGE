"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a specific Investment duration",
    operationId: "deleteInvestmentDuration",
    tags: ["Admin", "Investment", "Durations"],
    parameters: (0, query_1.deleteRecordParams)("Investment duration"),
    responses: (0, query_1.deleteRecordResponses)("Investment duration"),
    permission: "delete.investment.duration",
    requiresAuth: true,
    logModule: "ADMIN_FIN",
    logTitle: "Delete Investment Duration",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment duration ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting investment duration record");
    const result = await (0, query_1.handleSingleDelete)({
        model: "investmentDuration",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
