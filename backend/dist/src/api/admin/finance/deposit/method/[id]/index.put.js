"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an existing deposit method",
    operationId: "updateDepositMethod",
    tags: ["Admin", "Deposit Methods"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the deposit method to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "New data for the deposit method",
        content: {
            "application/json": {
                schema: utils_1.depositMethodUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Deposit Method"),
    requiresAuth: true,
    permission: "edit.deposit.method",
    logModule: "ADMIN_FIN",
    logTitle: "Update deposit method",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { image, title, instructions, fixedFee, percentageFee, minAmount, maxAmount, customFields, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching deposit method record");
    let parsedCustomFields = customFields;
    if (typeof customFields === "string") {
        try {
            parsedCustomFields = JSON.parse(customFields);
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Invalid JSON format for customFields" });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating deposit method");
    const result = await (0, query_1.updateRecord)("depositMethod", id, {
        image,
        title,
        instructions,
        fixedFee,
        percentageFee,
        minAmount,
        maxAmount,
        customFields: parsedCustomFields,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Deposit method updated successfully");
    return result;
};
