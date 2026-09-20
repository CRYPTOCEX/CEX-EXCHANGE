"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const transition_1 = require("../transition");
exports.metadata = {
    summary: "Updates the status of a binary order",
    operationId: "updateBinaryOrderStatus",
    tags: ["Admin", "Binary Order"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the binary order to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            description: "New status to apply",
                            enum: ["PENDING", "WIN", "LOSS", "DRAW"],
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Binary Order"),
    requiresAuth: true,
    permission: "edit.binary.order",
    logModule: "ADMIN_FIN",
    logTitle: "Update Binary Order Status",
};
exports.default = async (data) => {
    var _a;
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking the binary order status transition");
    const order = await db_1.models.binaryOrder.findByPk(id, { paranoid: false });
    if (!order) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Binary order not found" });
    }
    const verdict = (0, transition_1.classifyBinaryOrderStatusChange)(order.status, status);
    if (!verdict.ok) {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _a === void 0 ? void 0 : _a.call(ctx, verdict.reason);
        throw (0, error_1.createError)({ statusCode: 400, message: verdict.reason });
    }
    return (0, query_1.updateStatus)("binaryOrder", id, status);
};
