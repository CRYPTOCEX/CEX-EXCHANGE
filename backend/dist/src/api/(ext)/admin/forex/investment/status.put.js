"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const transition_1 = require("./transition");
exports.metadata = {
    summary: "Bulk updates Forex investment statuses",
    description: "Updates the status of multiple Forex investments at once. Valid statuses are ACTIVE, COMPLETED, CANCELLED, or REJECTED.",
    operationId: "bulkUpdateForexInvestmentStatus",
    tags: ["Admin", "Forex", "Investment"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of forex investment IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply to the forex investments",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Forex Investment"),
    requiresAuth: true,
    permission: "edit.forex.investment",
    logModule: "ADMIN_FOREX",
    logTitle: "Bulk update forex investment status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${ids.length} forex investment IDs`);
    if (!transition_1.FOREX_INVESTMENT_STATUSES.includes(status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid status. Must be one of ${transition_1.FOREX_INVESTMENT_STATUSES.join(", ")}.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status} for ${ids.length} forex investments`);
    const { outcomes, failures } = await (0, transition_1.transitionForexInvestments)(ids, status, ctx);
    const refunded = outcomes.reduce((sum, o) => sum + o.refunded, 0);
    const changed = outcomes.filter((o) => o.changed).length;
    if (failures.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated ${changed} of ${ids.length} forex investments; ${failures.length} could not be changed`);
        return {
            message: `Updated ${changed} of ${ids.length} investments` +
                (refunded > 0 ? `, returning ${refunded} in principal` : "") +
                `. ${failures.length} could not be changed: ` +
                failures.map((f) => `${f.id} (${f.error})`).join("; "),
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully updated status for ${ids.length} forex investments`);
    return {
        message: `Updated ${changed} investment${changed === 1 ? "" : "s"}` +
            (refunded > 0 ? `, returning ${refunded} in principal to their forex accounts` : ""),
    };
};
