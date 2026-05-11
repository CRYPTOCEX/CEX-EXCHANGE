"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const transaction_handler_1 = require("@b/api/(ext)/forex/account/transaction-handler");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const forex_fraud_detector_1 = require("@b/api/(ext)/forex/utils/forex-fraud-detector");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Withdraws money from the specified Forex account",
    description: "Allows a user to withdraw money from their Forex account into their wallet.",
    operationId: "withdrawForexAccount",
    tags: ["Forex", "Accounts"],
    rateLimit: {
        windowMs: 60000,
        max: 5
    },
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Forex account ID" },
        },
    ],
    requiresAuth: true,
    logModule: "FOREX",
    logTitle: "Withdraw from forex account",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: { type: "string", description: "Wallet type" },
                        currency: { type: "string", description: "Currency code" },
                        chain: {
                            type: "string",
                            description: "Blockchain network",
                            nullable: true,
                        },
                        amount: { type: "number", description: "Amount to withdraw" },
                    },
                    required: ["type", "currency", "amount"],
                },
            },
        },
    },
    responses: {
        201: {
            description: "Withdrawal successfully processed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
                            transaction: {
                                type: "object",
                                properties: {
                                    id: { type: "string", description: "Transaction ID" },
                                    userId: { type: "string", description: "User ID" },
                                    walletId: { type: "string", description: "Wallet ID" },
                                    type: { type: "string", description: "Transaction type" },
                                    status: { type: "string", description: "Transaction status" },
                                    amount: { type: "number", description: "Transaction amount" },
                                    fee: { type: "number", description: "Transaction fee" },
                                    description: {
                                        type: "string",
                                        description: "Transaction description",
                                    },
                                    metadata: {
                                        type: "object",
                                        description: "Transaction metadata",
                                    },
                                    createdAt: {
                                        type: "string",
                                        description: "Transaction creation date",
                                    },
                                    updatedAt: {
                                        type: "string",
                                        description: "Transaction update date",
                                    },
                                },
                            },
                            balance: { type: "number", description: "Wallet balance" },
                            currency: { type: "string", description: "Currency code" },
                            chain: {
                                type: "string",
                                description: "Blockchain network",
                                nullable: true,
                            },
                            type: { type: "string", description: "Wallet type" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Account"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, body, req, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { amount, type, currency, chain } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal amount");
        if (!amount || amount <= 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Amount is required and must be greater than zero" });
        }
        let updatedAccountBalance;
        let taxAmount = 0;
        const result = await db_1.sequelize.transaction(async (t) => {
            var _a, _b, _c, _d;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying forex account");
            const account = await db_1.models.forexAccount.findByPk(id, {
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!account) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Account not found" });
            }
            if (account.userId !== user.id) {
                throw (0, error_1.createError)({ statusCode: 403, message: "Access denied: You can only withdraw from your own forex accounts" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking account balance");
            if (((_a = account.balance) !== null && _a !== void 0 ? _a : 0) < amount) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient balance" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking withdrawal limits");
            const now = new Date();
            const lastReset = account.lastWithdrawReset ? new Date(account.lastWithdrawReset) : new Date(0);
            const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
            let dailyWithdrawn = account.dailyWithdrawn || 0;
            let monthlyWithdrawn = account.monthlyWithdrawn || 0;
            if (daysSinceReset >= 1) {
                dailyWithdrawn = 0;
                if (daysSinceReset >= 30) {
                    monthlyWithdrawn = 0;
                }
            }
            const dailyLimit = account.dailyWithdrawLimit || 5000;
            if (dailyWithdrawn + amount > dailyLimit) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Daily withdrawal limit exceeded. You can withdraw up to ${dailyLimit - dailyWithdrawn} more today.` });
            }
            const monthlyLimit = account.monthlyWithdrawLimit || 50000;
            if (monthlyWithdrawn + amount > monthlyLimit) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Monthly withdrawal limit exceeded. You can withdraw up to ${monthlyLimit - monthlyWithdrawn} more this month.` });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${type} wallet for ${currency}`);
            const wallet = await db_1.models.wallet.findOne({
                where: { userId: user.id, type, currency },
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!wallet) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating transaction fees");
            const feeResult = await (0, transaction_handler_1.calculateTransactionFees)(type, wallet.currency, chain, amount, t, ctx);
            const { currencyData, taxAmount: calculatedFee, total } = feeResult;
            taxAmount = calculatedFee;
            if (((_b = account.balance) !== null && _b !== void 0 ? _b : 0) < total) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds to cover amount plus fees" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Running fraud detection checks");
            const fraudCheck = await forex_fraud_detector_1.ForexFraudDetector.checkWithdrawal(user.id, amount, currency, ctx);
            if (!fraudCheck.isValid) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: fraudCheck.reason || "Transaction flagged for security review"
                });
            }
            if (fraudCheck.riskScore >= 0.75) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "This withdrawal requires additional verification. Please contact support."
                });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deducting ${total} from forex account`);
            updatedAccountBalance = parseFloat((((_c = account.balance) !== null && _c !== void 0 ? _c : 0) - total).toFixed(2));
            const resetCounters = daysSinceReset >= 1;
            const accountUpdate = { balance: updatedAccountBalance };
            if (resetCounters) {
                accountUpdate.dailyWithdrawn = 0;
                if (daysSinceReset >= 30)
                    accountUpdate.monthlyWithdrawn = 0;
                accountUpdate.lastWithdrawReset = now;
            }
            await account.update(accountUpdate, { transaction: t });
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating PENDING forex withdrawal transaction (main wallet is credited on admin approval)");
            const accountIdForTx = (_d = account.accountId) !== null && _d !== void 0 ? _d : account.id;
            const pendingTx = await (0, transaction_handler_1.createForexTransaction)(user.id, wallet.id, "FOREX_WITHDRAW", amount, taxAmount, accountIdForTx, {
                forexAccountId: id,
                accountId: account.accountId,
                walletType: type,
                currency: currency,
                chain: chain,
                price: currencyData.price,
            }, t, ctx);
            const idempotencyKey = `forex_withdraw_${pendingTx.id}`;
            const metadataWithKey = {
                forexAccountId: id,
                accountId: account.accountId,
                walletType: type,
                currency: currency,
                chain: chain,
                price: currencyData.price,
                idempotencyKey,
                feeAmount: taxAmount,
                grossAmount: total,
            };
            await db_1.models.transaction.update({ metadata: JSON.stringify(metadataWithKey) }, { where: { id: pendingTx.id }, transaction: t });
            console_1.logger.info("FOREX_WITHDRAWAL", `User ${user.id} submitted PENDING forex withdrawal ${pendingTx.id} for ${amount} ${currency} from forex account ${account.id}. Wallet Type: ${type}, Chain: ${chain || 'N/A'}. Main wallet will be credited on admin approval; platform fee and withdraw counters are applied on approval.`);
            return pendingTx;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Submitted pending withdrawal of ${amount} ${currency} from forex account ${id}${taxAmount > 0 ? ` (fee: ${taxAmount})` : ''} — awaiting admin approval`);
        return {
            message: "Withdraw request submitted and pending approval",
            transaction: result,
            accountBalance: updatedAccountBalance,
            currency,
            chain,
            type,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to withdraw from forex account");
        console_1.logger.error("FOREX_WITHDRAWAL_ERROR", `Forex withdrawal failed for user ${user.id}, account ${id}: ${error.message}. Details: amount=${amount}, currency=${currency}, type=${type}, chain=${chain || 'N/A'}`, error);
        throw error;
    }
};
