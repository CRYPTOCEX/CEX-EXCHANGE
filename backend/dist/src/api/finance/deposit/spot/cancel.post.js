"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Cancels a pending spot deposit",
    description: "Cancels a pending spot deposit transaction for the authenticated user. Only transactions in PENDING status can be cancelled. No wallet credit is reversed because pending deposits are never credited.",
    operationId: "cancelSpotDeposit",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "SPOT_DEPOSIT",
    logTitle: "Cancel spot deposit",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        transactionId: {
                            type: "string",
                            description: "The deposit transaction id (UUID)",
                        },
                        trxId: {
                            type: "string",
                            description: "Alias for transactionId",
                        },
                        trx: {
                            type: "string",
                            description: "The on-chain transaction hash stored as referenceId (alternative to transactionId)",
                        },
                        reason: {
                            type: "string",
                            description: "Optional reason for cancellation",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Deposit cancelled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request or transaction not cancellable",
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transaction"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { transactionId, trxId, trx, reason } = body || {};
    const id = transactionId || trxId;
    if (!id && !trx) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "transactionId or trx is required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Locating pending deposit transaction");
    const where = { userId: user.id, type: "DEPOSIT" };
    if (id && trx) {
        where[sequelize_1.Op.or] = [{ id }, { referenceId: trx }];
    }
    else if (id) {
        where.id = id;
    }
    else {
        where.referenceId = trx;
    }
    const transaction = await db_1.models.transaction.findOne({ where });
    if (!transaction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transaction not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    }
    if (transaction.status !== "PENDING") {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Transaction is not pending (status=${transaction.status})`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot cancel transaction with status ${transaction.status}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Stopping the verification watcher");
    const { stopVerificationSchedule } = await Promise.resolve().then(() => __importStar(require("./index.ws")));
    stopVerificationSchedule(transaction.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Releasing the deposit reference and cancelling");
    const released = await (0, utils_1.releaseDepositReference)(transaction.id, "CANCELLED", reason
        ? `${transaction.description || "Deposit cancelled"} (reason: ${reason})`
        : transaction.description || "Deposit cancelled");
    if (released === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Transaction ${transaction.id} left PENDING before it could be cancelled`);
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This deposit was settled while you were cancelling it and can no longer be cancelled.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Spot deposit ${transaction.id} cancelled`);
    return { message: "Deposit cancelled" };
};
