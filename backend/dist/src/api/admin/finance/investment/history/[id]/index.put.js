"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
const transition_1 = require("../transition");
exports.metadata = {
    summary: "Updates a specific Investment",
    operationId: "updateInvestment",
    tags: ["Admin", "Investments"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Investment to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Investment",
        content: {
            "application/json": {
                schema: utils_1.investmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Investment"),
    requiresAuth: true,
    permission: "edit.investment",
    logModule: "ADMIN_FIN",
    logTitle: "Update Investment History",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { userId, planId, durationId, amount, profit, result, status, endDate, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment data");
    const existing = await db_1.models.investment.findByPk(id, { paranoid: false });
    if (existing) {
        const editable = (0, transition_1.assertInvestmentEditable)(existing, {
            userId,
            planId,
            durationId,
            amount,
            status,
        });
        if (!editable.ok) {
            throw (0, error_1.createError)({ statusCode: 400, message: editable.reason });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating investment record");
    const record = await (0, query_1.updateRecord)("investment", id, {
        userId,
        planId,
        durationId,
        amount,
        profit,
        result,
        status,
        endDate,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return record;
};
