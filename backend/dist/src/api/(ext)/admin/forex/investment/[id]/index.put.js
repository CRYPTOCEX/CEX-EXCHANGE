"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const transition_1 = require("../transition");
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
    const existing = await db_1.models.forexInvestment.findByPk(id);
    if (!existing) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Forex investment not found" });
    }
    if (status != null && !transition_1.FOREX_INVESTMENT_STATUSES.includes(status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid status. Must be one of ${transition_1.FOREX_INVESTMENT_STATUSES.join(", ")}.`,
        });
    }
    if (amount != null && Number(amount) !== Number(existing.amount)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `An investment's amount cannot be edited: ${existing.amount} was debited from the ` +
                `user's forex account when it was created. Cancel it (which refunds) and create a new one.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating forex investment ${id}`);
    const investmentResult = await (0, query_1.updateRecord)("forexInvestment", id, {
        userId,
        planId,
        durationId,
        profit,
        result,
        endDate,
    });
    if (status != null && status !== existing.status) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Moving forex investment ${id} to ${status}`);
        const outcome = await (0, transition_1.transitionForexInvestment)(id, status, ctx);
        if (outcome.refunded > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Forex investment updated; ${outcome.refunded} principal returned to the user's forex account`);
            return {
                message: `Forex Investment updated successfully; ${outcome.refunded} principal returned to the user's forex account.`,
            };
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex investment updated successfully");
    return investmentResult;
};
