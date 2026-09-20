"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const transition_1 = require("./transition");
exports.metadata = {
    summary: "Bulk deletes binary orders by IDs",
    operationId: "bulkDeleteBinaryOrders",
    tags: ["Admin", "Binary Orders"],
    parameters: (0, query_1.commonBulkDeleteParams)("Binary Orders"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of binary order IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Binary Orders"),
    requiresAuth: true,
    permission: "delete.binary.order",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Delete Binary Orders",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Delete Binary Orders...");
    const result = await (0, query_1.handleBulkDelete)({
        preDelete: async () => {
            var _a;
            if (query === null || query === void 0 ? void 0 : query.restore)
                return;
            const open = await db_1.models.binaryOrder.findAll({
                where: { id: ids, status: "PENDING" },
                attributes: ["id"],
                paranoid: false,
            });
            if (open.length) {
                const verdict = (0, transition_1.isBinaryOrderDeletable)("PENDING");
                const reason = verdict.ok ? "" : verdict.reason;
                const message = `${open.length} of the selected order(s) are still open. ${reason}`;
                (_a = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _a === void 0 ? void 0 : _a.call(ctx, message);
                throw (0, error_1.createError)({ statusCode: 400, message });
            }
        },
        model: "binaryOrder",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Bulk Delete Binary Orders completed successfully");
    return result;
};
