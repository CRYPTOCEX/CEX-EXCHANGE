"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const approve_post_1 = __importDefault(require("../../wallet/[id]/withdraw/approve.post"));
const reject_post_1 = __importDefault(require("../../wallet/[id]/withdraw/reject.post"));
exports.metadata = {
    summary: "Bulk approve or reject withdrawal requests",
    operationId: "bulkUpdateWithdrawalStatus",
    tags: ["Admin", "Wallets"],
    requiresAuth: true,
    permission: "edit.withdraw",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk withdrawal decision",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Transaction ids to decide",
                        },
                        status: {
                            type: "string",
                            enum: ["COMPLETED", "REJECTED"],
                            description: "COMPLETED approves and pays out; REJECTED refunds and notifies.",
                        },
                        reason: {
                            type: "string",
                            description: "Operator's justification. Required for REJECTED — it is emailed to the customer and stored on the transaction.",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Decision applied",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            succeeded: { type: "number" },
                            failed: { type: "number" },
                            failures: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        error: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transaction"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { ids, status, reason } = body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No records selected" });
    }
    if (status !== "COMPLETED" && status !== "REJECTED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "status must be COMPLETED or REJECTED",
        });
    }
    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (status === "REJECTED" && trimmedReason.length < 3) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A reason is required when rejecting a withdrawal",
        });
    }
    const transactions = await db_1.models.transaction.findAll({
        where: { id: ids, type: "WITHDRAW" },
        attributes: ["id", "status"],
    });
    const byId = new Map(transactions.map((t) => [t.id, t.status]));
    const failures = [];
    let succeeded = 0;
    for (const id of ids) {
        const current = byId.get(id);
        if (!current) {
            failures.push({ id, error: "Not a withdrawal transaction" });
            continue;
        }
        if (current !== "PENDING" && current !== "PROCESSING") {
            failures.push({ id, error: `Already ${current}` });
            continue;
        }
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`${status === "COMPLETED" ? "Approving" : "Rejecting"} ${id}`);
            const delegateData = {
                params: { id },
                body: status === "REJECTED" ? { message: trimmedReason } : {},
                query: {},
                user,
                ctx,
            };
            if (status === "COMPLETED") {
                await (0, approve_post_1.default)(delegateData);
            }
            else {
                await (0, reject_post_1.default)(delegateData);
            }
            succeeded++;
        }
        catch (error) {
            const message = (error === null || error === void 0 ? void 0 : error.message) || (error === null || error === void 0 ? void 0 : error.statusMessage) || "Unknown failure";
            console_1.logger.error("ADMIN_FIN", `Bulk withdrawal ${status} failed for ${id}: ${message}`);
            failures.push({ id, error: String(message).slice(0, 500) });
        }
    }
    if (succeeded === 0 && failures.length > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `No withdrawals were ${status === "COMPLETED" ? "approved" : "rejected"}: ${failures[0].error}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ""}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${succeeded} succeeded, ${failures.length} failed`);
    return {
        message: failures.length === 0
            ? `${succeeded} withdrawal${succeeded === 1 ? "" : "s"} ${status === "COMPLETED" ? "approved" : "rejected"}.`
            : `${succeeded} of ${ids.length} processed. ${failures.length} could not be: ${failures
                .slice(0, 3)
                .map((f) => f.error)
                .join("; ")}`,
        succeeded,
        failed: failures.length,
        failures,
    };
};
