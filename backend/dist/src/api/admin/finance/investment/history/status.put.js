"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const settle_1 = require("./settle");
exports.metadata = {
    summary: "Bulk updates the status of Investments",
    operationId: "bulkUpdateInvestmentStatus",
    tags: ["Admin", "Investments"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of Investment IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["COMPLETED", "CANCELLED", "REJECTED"],
                            description: "New status to apply to the Investments",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Investment"),
    requiresAuth: true,
    permission: "edit.investment",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk Update Investment Status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating investment IDs and status");
    const settled = [];
    const failed = [];
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status to ${status} for ${ids.length} investment(s)`);
    for (const id of ids) {
        try {
            const outcome = await (0, settle_1.applyAdminGeneralInvestmentStatus)(id, status, ctx);
            settled.push({ id, payout: outcome.payout, refund: outcome.refund });
        }
        catch (error) {
            failed.push({ id, reason: (error === null || error === void 0 ? void 0 : error.message) || "unknown error" });
            console_1.logger.error("ADMIN_FIN", `Bulk status change to ${status} failed for investment ${id}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
    }
    if (settled.length === 0 && failed.length > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `No investments could be set to ${status}. ` +
                failed.map((f) => `${String(f.id).slice(0, 8)}: ${f.reason}`).join("; "),
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return {
        message: `Status updated for ${settled.length} of ${ids.length} investment(s)`,
        settled,
        failed,
    };
};
