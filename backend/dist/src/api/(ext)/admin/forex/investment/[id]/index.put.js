"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a Forex investment",
    description: "Updates an existing Forex investment record by its ID. Can modify user, plan, duration, amount, profit, result, status, and end date.",
    operationId: "updateForexInvestment",
    tags: ["Admin", "Forex", "Investment"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Forex Investment to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Forex Investment",
        content: {
            "application/json": {
                schema: utils_1.forexInvestmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Investment"),
    requiresAuth: true,
    permission: "edit.forex.investment",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex investment",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { userId, planId, durationId, amount, profit, result, status, endDate, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating forex investment data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating forex investment ${id}`);
    const investmentResult = await (0, query_1.updateRecord)("forexInvestment", id, {
        userId,
        planId,
        durationId,
        amount,
        profit,
        result,
        status,
        endDate,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex investment updated successfully");
    return investmentResult;
};
