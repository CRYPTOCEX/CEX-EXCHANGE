"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("../../utils");
exports.metadata = {
    summary: "Updates a Forex investment status",
    description: "Updates the status of a specific Forex investment. Valid statuses are ACTIVE, COMPLETED, CANCELLED, or REJECTED. On transition to CANCELLED or REJECTED the locked principal is refunded to the user's forex account (the same balance it was originally debited from at investment creation).",
    operationId: "updateForexInvestmentStatus",
    tags: ["Admin", "Forex", "Investment"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the forex investment to update",
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
                            enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Investment"),
    requiresAuth: true,
    permission: "edit.forex.investment",
    logModule: "ADMIN_FOREX",
    logTitle: "Update forex investment status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex investment ${id}`);
    if (!["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"].includes(status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid status. Must be ACTIVE, COMPLETED, CANCELLED, or REJECTED.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating forex investment status to ${status}`);
    const result = await db_1.sequelize.transaction(async (t) => {
        const investment = await db_1.models.forexInvestment.findByPk(id, {
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!investment) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Forex investment not found" });
        }
        const previousStatus = investment.status;
        const isTransitioningToRefundState = (status === "CANCELLED" || status === "REJECTED") &&
            previousStatus !== status &&
            previousStatus !== "CANCELLED" &&
            previousStatus !== "REJECTED" &&
            previousStatus !== "COMPLETED";
        if (isTransitioningToRefundState) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Refunding principal for ${status.toLowerCase()} forex investment`);
            const account = await db_1.models.forexAccount.findOne({
                where: { userId: investment.userId, type: "LIVE" },
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!account) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Forex account not found for refund",
                });
            }
            await (0, utils_1.updateForexAccountBalance)(account, Number(investment.amount), true, t, ctx);
            console_1.logger.info("FOREX_INVESTMENT_REFUND", `Refunded ${investment.amount} principal to forex account ${account.id} for ${status.toLowerCase()} investment ${investment.id} (user ${investment.userId}). Idempotency key: forex_investment_refund_${investment.id}`);
        }
        await db_1.models.forexInvestment.update({ status }, { where: { id }, transaction: t });
        return { message: "Forex Investment updated successfully" };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex investment status updated successfully");
    return result;
};
