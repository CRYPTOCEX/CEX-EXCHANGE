"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const transition_1 = require("../transition");
exports.metadata = {
    summary: "Deletes a binary order",
    operationId: "deleteBinaryOrder",
    tags: ["Admin", "Binary Order"],
    parameters: (0, query_1.deleteRecordParams)("binary order"),
    responses: (0, query_1.deleteRecordResponses)("Binary Order"),
    requiresAuth: true,
    permission: "delete.binary.order",
    logModule: "ADMIN_FIN",
    logTitle: "Delete Binary Order",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    return (0, query_1.handleSingleDelete)({
        preDelete: async () => {
            var _a;
            if (query === null || query === void 0 ? void 0 : query.restore)
                return;
            const order = await db_1.models.binaryOrder.findByPk(params.id, {
                paranoid: false,
                attributes: ["id", "status"],
            });
            if (!order)
                return;
            const verdict = (0, transition_1.isBinaryOrderDeletable)(order.status);
            if (!verdict.ok) {
                (_a = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _a === void 0 ? void 0 : _a.call(ctx, verdict.reason);
                throw (0, error_1.createError)({ statusCode: 400, message: verdict.reason });
            }
        },
        model: "binaryOrder",
        id: params.id,
        query,
    });
};
