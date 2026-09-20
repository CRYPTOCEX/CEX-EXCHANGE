"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a KYC application",
    operationId: "deleteKycApplication",
    tags: ["Admin", "CRM", "KYC"],
    parameters: (0, query_1.deleteRecordParams)("KYC application"),
    responses: (0, query_1.deleteRecordResponses)("KYC application"),
    permission: "delete.kyc.application",
    requiresAuth: true,
    logModule: "ADMIN_CRM",
    logTitle: "Delete KYC application",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting KYC application ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "kycApplication",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC application deleted successfully");
    return result;
};
