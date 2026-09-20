"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific AI Investment",
    operationId: "updateAiInvestment",
    tags: ["Admin", "AI Investments"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the AI Investment to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the AI Investment",
        content: {
            "application/json": {
                schema: utils_1.aiInvestmentUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("AI Investment"),
    requiresAuth: true,
    permission: "edit.ai.investment",
    logModule: "ADMIN_AI",
    logTitle: "Update AI investment",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching investment ${id}`);
    const investment = await db_1.models.aiInvestment.findByPk(id);
    if (!investment) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Investment not found" });
    }
    if (body.amount !== undefined && body.amount !== investment.amount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot change investment amount after creation - this would create wallet balance inconsistencies",
        });
    }
    if (body.userId !== undefined && body.userId !== investment.userId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot change investment owner after creation - this would orphan the wallet transaction",
        });
    }
    if (body.type !== undefined && body.type !== investment.type) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot change investment wallet type after creation - the payout would " +
                "go to a different wallet than the one that was debited",
        });
    }
    if (body.status !== undefined && body.status !== investment.status) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot change investment status from this endpoint - use the status " +
                "action so the payout or refund is processed with it",
        });
    }
    const { planId, durationId, symbol, profit, result } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating investment ${id}`);
    const investmentResult = await (0, query_1.updateRecord)("aiInvestment", id, {
        planId,
        durationId,
        symbol,
        profit,
        result,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment updated successfully");
    return investmentResult;
};
