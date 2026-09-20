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
const index_put_1 = __importDefault(require("./[id]/index.put"));
exports.metadata = {
    summary: "Bulk approve or reject pending transfers",
    operationId: "bulkUpdateTransferStatus",
    tags: ["Admin", "Wallets"],
    requiresAuth: true,
    permission: "edit.transfer",
    logModule: "ADMIN_FIN",
    logTitle: "Bulk transfer decision",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: { type: "array", items: { type: "string" } },
                        status: {
                            type: "string",
                            enum: ["COMPLETED", "REJECTED"],
                        },
                        reason: {
                            type: "string",
                            description: "Operator's justification. Required for REJECTED — stored on the transaction and sent to the sender.",
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
            message: "A reason is required when rejecting a transfer",
        });
    }
    const transactions = await db_1.models.transaction.findAll({
        where: { id: ids },
        attributes: ["id", "status", "type"],
    });
    const byId = new Map(transactions.map((t) => [t.id, t]));
    const failures = [];
    let succeeded = 0;
    for (const id of ids) {
        const row = byId.get(id);
        if (!row) {
            failures.push({ id, error: "Transaction not found" });
            continue;
        }
        if (row.status !== "PENDING") {
            failures.push({ id, error: `Already ${row.status}` });
            continue;
        }
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`${status === "COMPLETED" ? "Approving" : "Rejecting"} ${id}`);
            const delegateData = {
                params: { id },
                body: {
                    status,
                    ...(trimmedReason ? { metadata: { message: trimmedReason } } : {}),
                },
                query: {},
                user,
                ctx,
            };
            await (0, index_put_1.default)(delegateData);
            succeeded++;
        }
        catch (error) {
            const message = (error === null || error === void 0 ? void 0 : error.message) || "Unknown failure";
            console_1.logger.error("ADMIN_FIN", `Bulk transfer ${status} failed for ${id}: ${message}`);
            failures.push({ id, error: String(message).slice(0, 500) });
        }
    }
    if (succeeded === 0 && failures.length > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `No transfers were ${status === "COMPLETED" ? "approved" : "rejected"}: ${failures[0].error}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ""}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${succeeded} succeeded, ${failures.length} failed`);
    return {
        message: failures.length === 0
            ? `${succeeded} transfer${succeeded === 1 ? "" : "s"} ${status === "COMPLETED" ? "approved" : "rejected"}.`
            : `${succeeded} of ${ids.length} processed. ${failures.length} could not be: ${failures
                .slice(0, 3)
                .map((f) => f.error)
                .join("; ")}`,
        succeeded,
        failed: failures.length,
        failures,
    };
};
