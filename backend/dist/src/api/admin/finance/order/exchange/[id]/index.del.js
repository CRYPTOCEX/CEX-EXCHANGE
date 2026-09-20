"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes an exchange order",
    operationId: "deleteExchangeOrder",
    tags: ["Admin", "Exchange Order"],
    parameters: (0, query_1.deleteRecordParams)("exchange order"),
    responses: (0, query_1.deleteRecordResponses)("Exchange Order"),
    requiresAuth: true,
    permission: "delete.exchange.order",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Exchange Order",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    return (0, query_1.handleSingleDelete)({
        model: "exchangeOrder",
        id: params.id,
        query,
    });
};
