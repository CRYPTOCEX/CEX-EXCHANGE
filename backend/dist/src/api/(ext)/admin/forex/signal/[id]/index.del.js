"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a Forex signal",
    description: "Deletes a specific Forex trading signal by its ID. This will remove signal references from associated accounts.",
    operationId: "deleteForexSignal",
    tags: ["Admin", "Forex", "Signal"],
    parameters: (0, query_1.deleteRecordParams)("Forex signal"),
    responses: (0, query_1.deleteRecordResponses)("Forex signal"),
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex signal",
    permission: "delete.forex.signal",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating record ${params.id}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting record ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "forexSignal",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Record deleted successfully");
    return result;
};
