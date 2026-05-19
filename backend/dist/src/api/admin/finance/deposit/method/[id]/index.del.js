"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a deposit method",
    operationId: "deleteDepositMethod",
    tags: ["Admin", "Deposit Methods"],
    parameters: (0, query_1.deleteRecordParams)("deposit method"),
    responses: (0, query_1.deleteRecordResponses)("Deposit method"),
    requiresAuth: true,
    permission: "delete.deposit.method",
    logModule: "ADMIN_FIN",
    logTitle: "Delete deposit method",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit method record");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting deposit method");
    const result = await (0, query_1.handleSingleDelete)({
        model: "depositMethod",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit method deleted successfully");
    return result;
};
