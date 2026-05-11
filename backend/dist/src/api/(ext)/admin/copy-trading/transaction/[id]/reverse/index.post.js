"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const wallet_1 = require("@b/services/wallet");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Reverse copy trading transaction",
    description: "Creates a reversing transaction to undo a previous copy trading transaction. Determines the appropriate reversal type based on the original transaction type, adjusts wallet balances, updates follower statistics, and creates an audit log. Validates that the transaction has not already been reversed and ensures wallet balance remains positive after reversal.",
    operationId: "adminReverseCopyTradingTransaction",
    tags: ["Admin", "Copy Trading", "Transactions"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Reverse copy trading transaction",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Transaction ID to reverse",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Reason for reversal",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Transaction reversed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            originalTransaction: {
                                type: "object",
                                description: "The original transaction that was reversed",
                            },
                            reversalTransaction: {
                                type: "object",
                                description: "The new reversing transaction",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        404: (0, errors_1.notFoundResponse)("Transaction"),
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { reason } = body || {};
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating reversal reason");
    if (!reason) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Reason is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Reason is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching original transaction");
    const originalTx = await db_1.models.copyTradingTransaction.findByPk(id, {
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName"],
            },
        ],
    });
    if (!originalTx) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transaction not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing reversal");
    const existingReversal = await db_1.models.copyTradingTransaction.findOne({
        where: {
            description: { [sequelize_1.Op.like]: `%Reversal of transaction ${id}%` },
        },
    });
    if (existingReversal) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transaction has already been reversed");
        throw (0, error_1.createError)({ statusCode: 400, message: "Transaction has already been reversed" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Determining reversal type");
    let reversalType;
    let walletAdjustment;
    switch (originalTx.type) {
        case "ALLOCATION":
            reversalType = "DEALLOCATION";
            walletAdjustment = originalTx.amount;
            break;
        case "DEALLOCATION":
            reversalType = "ALLOCATION";
            walletAdjustment = -originalTx.amount;
            break;
        case "TRADE_PROFIT":
            reversalType = "TRADE_LOSS";
            walletAdjustment = -originalTx.amount;
            break;
        case "TRADE_LOSS":
            reversalType = "TRADE_PROFIT";
            walletAdjustment = originalTx.amount;
            break;
        case "PROFIT_SHARE":
        case "FEE":
            reversalType = "REFUND";
            walletAdjustment = originalTx.amount;
            break;
        case "REFUND":
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Cannot reverse a refund transaction");
            throw (0, error_1.createError)({ statusCode: 400, message: "Cannot reverse a refund transaction" });
        default:
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot reverse transaction type: ${originalTx.type}`);
            throw (0, error_1.createError)({ statusCode: 400, message: `Cannot reverse transaction type: ${originalTx.type}` });
    }
    let reversalTx;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing reversal transaction");
    await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b, _c, _d, _e;
        if (walletAdjustment !== 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Adjusting wallet balance via wallet service");
            const currency = originalTx.currency || "USDT";
            const wallet = await wallet_1.walletCreationService.getOrCreateWallet(originalTx.userId, "SPOT", currency);
            const idempotencyKey = `ct_reversal_${id}`;
            if (walletAdjustment > 0) {
                await wallet_1.walletService.credit({
                    idempotencyKey,
                    userId: originalTx.userId,
                    walletId: wallet.id,
                    walletType: "SPOT",
                    currency,
                    amount: walletAdjustment,
                    operationType: "COPY_TRADING_REVERSAL",
                    referenceId: id,
                    description: `Reversal of transaction ${id}: ${reason}`,
                    metadata: {
                        originalTransactionId: id,
                        originalType: originalTx.type,
                        reversalType,
                        reversedBy: user.id,
                    },
                    transaction,
                });
            }
            else {
                const absAmount = Math.abs(walletAdjustment);
                if (wallet.balance < absAmount) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.fail("Reversal would result in negative wallet balance");
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Reversal would result in negative wallet balance",
                    });
                }
                await wallet_1.walletService.debit({
                    idempotencyKey,
                    userId: originalTx.userId,
                    walletId: wallet.id,
                    walletType: "SPOT",
                    currency,
                    amount: absAmount,
                    operationType: "COPY_TRADING_REVERSAL",
                    referenceId: id,
                    description: `Reversal of transaction ${id}: ${reason}`,
                    metadata: {
                        originalTransactionId: id,
                        originalType: originalTx.type,
                        reversalType,
                        reversedBy: user.id,
                    },
                    transaction,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating reversal transaction");
        reversalTx = await (0, utils_1.createCopyTradingTransaction)({
            userId: originalTx.userId,
            leaderId: (_a = originalTx.leaderId) !== null && _a !== void 0 ? _a : undefined,
            followerId: (_b = originalTx.followerId) !== null && _b !== void 0 ? _b : undefined,
            tradeId: (_c = originalTx.tradeId) !== null && _c !== void 0 ? _c : undefined,
            type: reversalType,
            amount: originalTx.amount,
            currency: originalTx.currency,
            fee: 0,
            balanceBefore: originalTx.balanceAfter,
            balanceAfter: originalTx.balanceAfter + walletAdjustment,
            description: `Reversal of transaction ${id}: ${reason}`,
            metadata: {
                originalTransactionId: id,
                reversedBy: user.id,
                reason,
            },
        });
        if (originalTx.followerId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating follower statistics");
            const follower = await db_1.models.copyTradingFollower.findByPk(originalTx.followerId, {
                transaction,
            });
            if (follower) {
                const followerAny = follower;
                let newAllocated = (_d = followerAny.allocatedAmount) !== null && _d !== void 0 ? _d : 0;
                let newProfit = (_e = followerAny.totalProfit) !== null && _e !== void 0 ? _e : 0;
                if (reversalType === "ALLOCATION") {
                    newAllocated += originalTx.amount;
                }
                else if (reversalType === "DEALLOCATION") {
                    newAllocated -= originalTx.amount;
                }
                else if (reversalType === "PROFIT") {
                    newProfit += originalTx.amount;
                }
                else if (reversalType === "LOSS") {
                    newProfit -= originalTx.amount;
                }
                await followerAny.update({
                    allocatedAmount: Math.max(0, newAllocated),
                    totalProfit: newProfit,
                }, { transaction });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
        await (0, utils_1.createAuditLog)({
            entityType: "TRANSACTION",
            entityId: id,
            action: "REVERSE",
            oldValue: originalTx.toJSON(),
            newValue: { reversalTransactionId: reversalTx.id, reason },
            adminId: user.id,
            reason,
        });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Transaction reversed successfully");
    return {
        message: "Transaction reversed successfully",
        originalTransaction: originalTx.toJSON(),
        reversalTransaction: reversalTx,
    };
};
