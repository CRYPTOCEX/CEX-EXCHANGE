"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
const security_1 = require("@b/api/(ext)/copy-trading/utils/security");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
const errors_1 = require("@b/services/wallet/errors");
const fundIdempotency_1 = require("@b/api/(ext)/copy-trading/utils/fundIdempotency");
exports.metadata = {
    summary: "Remove Funds from Market Allocation",
    description: "Removes funds from a specific market allocation within a subscription.",
    operationId: "removeFundsFromAllocation",
    tags: ["Copy Trading", "Followers", "Allocations"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Remove funds from allocation",
    middleware: ["copyTradingFunds"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Subscription (follower) ID",
        },
        {
            name: "allocationId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Allocation ID",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            minimum: 0.00000001,
                            maximum: 10000000,
                            description: "Amount to remove",
                        },
                        currency: {
                            type: "string",
                            enum: ["BASE", "QUOTE"],
                            description: "Which currency to remove (BASE or QUOTE)",
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Funds removed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            allocation: { type: "object" },
                            alreadyProcessed: {
                                type: "boolean",
                                description: "True when the caller replayed its own idempotency-key and no funds were moved a second time.",
                            },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Allocation not found" },
        429: { description: "Too Many Requests" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, body, headers, ctx } = data;
    const { id, allocationId } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!(0, security_1.isValidUUID)(id) || !(0, security_1.isValidUUID)(allocationId)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid ID format" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request");
    const validation = (0, security_1.validateFundOperation)(body);
    if (!validation.valid) {
        (0, security_1.throwValidationError)(validation);
    }
    const { amount } = validation.sanitized;
    const currencyType = body.currency;
    if (!currencyType || !["BASE", "QUOTE"].includes(currencyType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Currency type must be BASE or QUOTE",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscription");
    const subscription = await db_1.models.copyTradingFollower.findByPk(id);
    if (!subscription) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Subscription not found" });
    }
    if (subscription.userId !== user.id) {
        throw (0, error_1.createError)({ statusCode: 403, message: "Access denied" });
    }
    if (subscription.status === "STOPPED") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot remove funds from a stopped subscription",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching allocation");
    const allocation = await db_1.models.copyTradingFollowerAllocation.findOne({
        where: { id: allocationId, followerId: id },
    });
    if (!allocation) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Allocation not found" });
    }
    const allocationData = allocation;
    const [baseCurrency, quoteCurrency] = allocationData.symbol.split("/");
    const targetCurrency = currencyType === "BASE" ? baseCurrency : quoteCurrency;
    const isBinaryAllocation = allocationData.marketType === "BINARY";
    if (isBinaryAllocation && currencyType === "BASE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Binary allocations only hold a quote-currency stake budget",
        });
    }
    const destinationWalletType = isBinaryAllocation
        ? "SPOT"
        : "ECO";
    let availableAmount;
    let usedAmount;
    if (currencyType === "BASE") {
        availableAmount = allocationData.baseAmount - allocationData.baseUsedAmount;
        usedAmount = allocationData.baseUsedAmount;
    }
    else {
        availableAmount = allocationData.quoteAmount - allocationData.quoteUsedAmount;
        usedAmount = allocationData.quoteUsedAmount;
    }
    if (amount > availableAmount) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot remove ${amount} ${targetCurrency}. Only ${availableAmount} available (${usedAmount} in use)`,
        });
    }
    const ctWallet = await db_1.models.wallet.findOne({
        where: { userId: user.id, currency: targetCurrency, type: "COPY_TRADING" },
        attributes: ["balance", "inOrder"],
    });
    const freeBalance = ctWallet ? parseFloat(ctWallet.balance.toString()) : 0;
    if (amount > freeBalance) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot remove ${amount} ${targetCurrency}. Only ${freeBalance} is free; the rest is locked in open copy orders. Stop the subscription or cancel orders to free it.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing funds from allocation");
    const { key: transferIdempotencyKey } = (0, fundIdempotency_1.buildFundOperationIdempotencyKey)({
        operation: "remove_funds",
        allocationId,
        currencyType,
        clientKey: headers === null || headers === void 0 ? void 0 : headers["idempotency-key"],
    });
    let alreadyProcessed = false;
    await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b;
        const lockedAllocation = await db_1.models.copyTradingFollowerAllocation.findByPk(allocation.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!lockedAllocation) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "This allocation no longer exists.",
            });
        }
        const stillAvailable = currencyType === "BASE"
            ? Number((_a = lockedAllocation.baseAmount) !== null && _a !== void 0 ? _a : 0)
            : Number((_b = lockedAllocation.quoteAmount) !== null && _b !== void 0 ? _b : 0);
        if (amount > stillAvailable) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `This allocation now holds ${stillAvailable} ${targetCurrency}, which is less than the ` +
                    `${amount} requested — another withdrawal settled first. Refresh and try again.`,
            });
        }
        let transferResult;
        try {
            transferResult = await wallet_1.walletService.transfer({
                idempotencyKey: transferIdempotencyKey,
                fromUserId: user.id,
                toUserId: user.id,
                fromWalletType: "COPY_TRADING",
                toWalletType: destinationWalletType,
                fromCurrency: targetCurrency,
                toCurrency: targetCurrency,
                amount,
                description: `Transfer ${amount} ${targetCurrency} from CT to ${destinationWalletType} wallet (remove funds from ${allocationData.symbol})`,
                metadata: {
                    allocationId,
                    symbol: allocationData.symbol,
                    currencyType,
                },
                transaction,
            });
        }
        catch (transferError) {
            if (transferError instanceof errors_1.DuplicateOperationError ||
                (transferError === null || transferError === void 0 ? void 0 : transferError.name) === "DuplicateOperationError") {
                alreadyProcessed = true;
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Remove-funds transfer already processed for ${allocationData.symbol} (idempotent retry)`);
                return;
            }
            throw transferError;
        }
        if (currencyType === "BASE") {
            await lockedAllocation.update({ baseAmount: (0, sequelize_1.literal)(`GREATEST(0, baseAmount - ${amount})`) }, { transaction });
        }
        else {
            await lockedAllocation.update({ quoteAmount: (0, sequelize_1.literal)(`GREATEST(0, quoteAmount - ${amount})`) }, { transaction });
        }
        await (0, settings_core_1.createCopyTradingTransaction)({
            userId: user.id,
            leaderId: subscription.leaderId,
            followerId: id,
            type: "DEALLOCATION",
            amount: -amount,
            currency: targetCurrency,
            balanceBefore: transferResult.fromResult.previousBalance,
            balanceAfter: transferResult.fromResult.newBalance,
            description: `Transfer ${amount} ${targetCurrency} from CT to ${destinationWalletType} wallet (remove funds from ${allocationData.symbol})`,
            metadata: JSON.stringify({
                allocationId,
                symbol: allocationData.symbol,
                currencyType,
            }),
        }, transaction);
        await (0, settings_core_1.createCopyTradingTransaction)({
            userId: user.id,
            leaderId: subscription.leaderId,
            followerId: id,
            type: "DEALLOCATION",
            amount,
            currency: targetCurrency,
            balanceBefore: transferResult.toResult.previousBalance,
            balanceAfter: transferResult.toResult.newBalance,
            description: `Received ${amount} ${targetCurrency} in ${destinationWalletType} wallet (remove funds from ${allocationData.symbol})`,
            metadata: JSON.stringify({
                allocationId,
                symbol: allocationData.symbol,
                currencyType,
            }),
        }, transaction);
        await (0, settings_core_1.createAuditLog)({
            entityType: "ALLOCATION",
            entityId: allocationId,
            action: "DEALLOCATE",
            oldValue: {
                baseAmount: allocationData.baseAmount,
                quoteAmount: allocationData.quoteAmount,
            },
            newValue: {
                baseAmount: currencyType === "BASE"
                    ? allocationData.baseAmount - amount
                    : allocationData.baseAmount,
                quoteAmount: currencyType === "QUOTE"
                    ? allocationData.quoteAmount - amount
                    : allocationData.quoteAmount,
            },
            userId: user.id,
        }, transaction);
    });
    await allocation.reload();
    if (alreadyProcessed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Remove funds already applied for ${allocationData.symbol} (retry)`);
        return {
            message: `This withdrawal was already applied to ${allocationData.symbol}; nothing was moved again.`,
            alreadyProcessed: true,
            allocation: allocation.toJSON(),
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Removed ${amount} ${targetCurrency} from ${allocationData.symbol}`);
    return {
        message: `Successfully removed ${amount} ${targetCurrency} from ${allocationData.symbol}`,
        allocation: allocation.toJSON(),
    };
};
