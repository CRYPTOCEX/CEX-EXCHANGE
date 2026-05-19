"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes an exchange market",
    operationId: "deleteExchangeMarket",
    tags: ["Admin", "Exchange", "Markets"],
    parameters: (0, query_1.deleteRecordParams)("exchange market"),
    responses: (0, query_1.deleteRecordResponses)("Exchange market"),
    requiresAuth: true,
    permission: "delete.exchange.market",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Exchange Market",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting exchange market");
    const result = await (0, query_1.handleSingleDelete)({
        model: "exchangeMarket",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
