"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates an existing withdrawal method",
    operationId: "updateWithdrawMethod",
    tags: ["Admin", "Withdraw Methods"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the withdrawal method to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the withdrawal method",
        content: {
            "application/json": {
                schema: utils_1.withdrawalMethodUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Withdraw Method"),
    requiresAuth: true,
    permission: "edit.withdraw.method",
    logModule: "ADMIN_FIN",
    logTitle: "Update Withdraw Method",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { title, processingTime, instructions, image, fixedFee, percentageFee, minAmount, maxAmount, customFields, status, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating withdraw method");
    const result = await (0, query_1.updateRecord)("withdrawMethod", id, {
        title,
        processingTime,
        instructions,
        image,
        fixedFee,
        percentageFee,
        minAmount,
        maxAmount,
        customFields,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdraw method updated successfully");
    return result;
};
