"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const emails_1 = require("@b/utils/emails");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const utils_1 = require("@b/api/finance/utils");
const withdraw_2fa_1 = require("@b/utils/withdraw-2fa");
const kyc_1 = require("@b/utils/kyc");
const tx_hash_1 = require("@b/api/finance/withdraw/tx-hash");
const exchange_status_1 = require("@b/api/finance/withdraw/exchange-status");
const funding = require("@b/utils/exchange-funding");
const { ensureWithdrawableBalance } = require("@b/utils/pool-backing/exchange-io");
const finance_availability_1 = require("@b/utils/finance-availability");
function countDecimals(value) {
    var _a;
    if (Number.isInteger(value))
        return 0;
    const s = value.toString();
    if (s.includes("e-")) {
        const [_, decimals] = s.split("e-");
        return parseInt(decimals, 10);
    }
    const parts = s.split(".");
    return ((_a = parts[1]) === null || _a === void 0 ? void 0 : _a.length) || 0;
}
exports.metadata = {
    summary: "Performs a withdraw transaction",
    description: "Initiates a withdraw transaction for the currently authenticated user",
    operationId: "createWithdraw",
    tags: ["Wallets"],
    requiresAuth: true,
    logModule: "SPOT_WITHDRAW",
    logTitle: "Process spot withdrawal",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: {
                            type: "string",
                            description: "Currency to withdraw",
                        },
                        chain: {
                            type: "string",
                            description: "Withdraw method ID",
                        },
                        amount: {
                            type: "number",
                            description: "Amount to withdraw",
                        },
                        toAddress: {
                            type: "string",
                            description: "Withdraw toAddress",
                        },
                        nonce: {
                            type: "string",
                            description: "Optional client-generated nonce to make this withdrawal idempotent. A network retry with the same nonce will be de-duplicated by the wallet service.",
                        },
                        twoFactorToken: {
                            type: "string",
                            description: "Single-use token from /api/finance/withdraw/verification/verify. Required only when the admin has enabled per-withdrawal 2FA verification.",
                        },
                    },
                    required: ["currency", "chain", "amount", "toAddress"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Withdraw transaction initiated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Withdraw"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    var _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, chain, amount, toAddress, memo, nonce, twoFactorToken } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal request parameters");
    if (!amount || !toAddress || !currency) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields: amount, toAddress, or currency");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid input" });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.WITHDRAW_WALLET, "withdraw funds");
    await (0, finance_availability_1.assertWalletTypeEnabled)("SPOT", "withdraw funds", ctx);
    await (0, withdraw_2fa_1.assertWithdrawTwoFactor)(user.id, twoFactorToken, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency configuration");
    const currencyData = await (0, finance_availability_1.assertCurrencyEnabled)("SPOT", currency, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Connecting to exchange provider");
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Exchange connection failed");
        throw (0, error_1.createError)(500, "Exchange not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching exchange currency data");
    const prepared = await funding.prepareWithdrawal(exchange, provider, currency, chain, toAddress, memo, amount);
    const precision = funding.validateWithdrawalAmount(exchange, prepared.currency, prepared.network, amount, currencyData.precision);
    const totalWithdrawAmount = Number(amount);
    const fixedFee = prepared.fee;
    const percentageFee = currencyData.fee || 0;
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const withdrawChainFeeEnabled = settings.has("withdrawChainFee") &&
        settings.get("withdrawChainFee") === "true";
    const spotWithdrawFee = cache_1.CacheManager.toNumber(settings.get("spotWithdrawFee"), 0, { min: 0, max: 100 });
    const combinedPercentageFee = percentageFee + spotWithdrawFee;
    const percentageFeeAmount = parseFloat(Math.max((totalWithdrawAmount * combinedPercentageFee) / 100, 0).toFixed(precision));
    if (!Number.isFinite(percentageFeeAmount)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Fee calculation produced a non-numeric result (percentageFee=${percentageFee}, spotWithdrawFee=${spotWithdrawFee}, precision=${precision})`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Withdrawal fees are misconfigured for this currency. Please contact support.",
        });
    }
    const isAdmin = await (0, fees_1.isSuperAdmin)(user.id);
    const internalFeeAmount = isAdmin ? 0 : percentageFeeAmount;
    const totalDeductionAmount = parseFloat((totalWithdrawAmount + internalFeeAmount).toFixed(precision));
    const chainFeeSplit = (0, exchange_status_1.splitChainFee)({
        amount: totalWithdrawAmount,
        chainFee: fixedFee,
        platformAbsorbsChainFee: withdrawChainFeeEnabled,
        precision,
    });
    const netWithdrawAmount = chainFeeSplit.destinationReceives;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing withdrawal transaction");
    const result = await db_1.sequelize.transaction(async (t) => {
        var _a;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Locking user wallet for update");
        const wallet = await db_1.models.wallet.findOne({
            where: { userId: user.id, currency: currency, type: "SPOT" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!wallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${currency} SPOT wallet not found`);
            throw (0, error_1.createError)({ statusCode: 404, message: `${currency} wallet not found in your spot wallets. Please ensure you have a ${currency} spot wallet before attempting withdrawal.` });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet balance");
        const availableBalance = wallet.balance;
        if (availableBalance < totalDeductionAmount) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient balance: available=${availableBalance} (balance=${wallet.balance}, inOrder=${(_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0}) < ${totalDeductionAmount}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        const newBalance = parseFloat((wallet.balance - totalDeductionAmount).toFixed(precision));
        if (newBalance < 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Calculated balance would be negative: ${newBalance}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deducting funds from wallet via wallet service");
        const idempotencyKey = nonce
            ? `spot_withdraw_nonce_${user.id}_${nonce}`
            : `spot_withdraw_${wallet.id}_${chain}_${toAddress}_${totalDeductionAmount.toFixed(precision)}`;
        const walletResult = await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: "SPOT",
            currency,
            amount: totalDeductionAmount,
            operationType: "WITHDRAW",
            description: `Withdrawal of ${totalWithdrawAmount} ${currency} (net: ${netWithdrawAmount}) to ${toAddress} via ${chain}`,
            metadata: {
                provider,
                chain,
                toAddress,
                memo,
                totalAmount: totalWithdrawAmount,
                netAmount: netWithdrawAmount,
                fee: internalFeeAmount,
                chainFee: fixedFee,
                chainFeePaidByPlatform: withdrawChainFeeEnabled,
            },
            transaction: t,
        });
        wallet.balance = newBalance;
        return { transactionId: walletResult.transactionId, wallet };
    });
    const dbTransaction = await db_1.models.transaction.findByPk(result.transactionId);
    if (!dbTransaction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transaction record not found after creation");
        throw (0, error_1.createError)({ statusCode: 500, message: "Transaction record not found" });
    }
    const resultWithTx = { ...result, dbTransaction };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking withdrawal approval settings");
    const autoApproveFromNew = settings.has("withdrawAutoApprove")
        ? settings.get("withdrawAutoApprove") === "true"
        : undefined;
    const autoApproveFromLegacy = settings.has("withdrawApproval")
        ? settings.get("withdrawApproval") === "true"
        : undefined;
    const withdrawAutoApprove = autoApproveFromNew !== undefined
        ? autoApproveFromNew
        : autoApproveFromLegacy !== undefined
            ? autoApproveFromLegacy
            : false;
    if (withdrawAutoApprove) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Auto-approval enabled, proceeding with exchange withdrawal");
        await db_1.models.transaction.update({ status: "PROCESSING" }, { where: { id: resultWithTx.dbTransaction.id } });
        resultWithTx.dbTransaction.status = "PROCESSING";
        let withdrawResponse;
        let withdrawStatus = "PROCESSING";
        const providerWithdrawAmount = chainFeeSplit.submitToExchange;
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating exchange balance");
            let exchangeBalance;
            try {
                const balance = await exchange.fetchBalance();
                exchangeBalance = balance.free[currency] || 0;
                if (exchangeBalance < providerWithdrawAmount) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient exchange balance: ${exchangeBalance} < ${providerWithdrawAmount}`);
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Insufficient exchange balance. Available: ${exchangeBalance} ${currency}, Required: ${providerWithdrawAmount} ${currency}. Please contact support to refill the exchange account.`
                    });
                }
            }
            catch (balanceError) {
                ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Could not verify exchange balance for ${currency}`);
                console_1.logger.warn("WITHDRAW", `Could not fetch exchange balance for ${currency}`, balanceError);
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Executing withdrawal via ${provider} exchange`);
            await ensureWithdrawableBalance(exchange, provider, currency, providerWithdrawAmount);
            withdrawResponse = await exchange.withdraw(currency, providerWithdrawAmount, toAddress, memo, prepared.params);
            if (!withdrawResponse || !withdrawResponse.id) {
                const error = new Error("Exchange returned no withdrawal reference; reconciliation is required");
                error.name = "BadResponse";
                throw error;
            }
            const withdrawals = await exchange.fetchWithdrawals(currency);
            const withdrawData = (withdrawals || []).find(item => String(item.id) === String(withdrawResponse.id));
            withdrawResponse.fee = withdrawChainFeeEnabled ? (withdrawData?.fee?.cost ?? fixedFee) : 0;
            withdrawStatus = (0, exchange_status_1.normalizeExchangeWithdrawStatus)(withdrawData?.status ?? withdrawResponse.status);
            if (!withdrawResponse ||
                !withdrawResponse.id ||
                (0, exchange_status_1.isTerminalFailure)(withdrawStatus)) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal failed or was cancelled by exchange");
                withdrawResponse = undefined;
                throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal failed" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating transaction with exchange reference");
            const onChainHash = (0, tx_hash_1.extractExchangeTxHash)(withdrawResponse);
            await db_1.models.transaction.update({
                status: withdrawStatus,
                referenceId: withdrawResponse.id,
                ...(onChainHash ? { trxId: onChainHash } : {}),
                metadata: JSON.stringify({
                    ...JSON.parse(resultWithTx.dbTransaction.metadata),
                    withdrawResponse,
                }),
            }, { where: { id: resultWithTx.dbTransaction.id } });
            await (0, utils_1.collectWithdrawalFeeOnSettlement)(await db_1.models.transaction.findByPk(resultWithTx.dbTransaction.id), ctx);
            resultWithTx.dbTransaction.status = withdrawStatus;
            resultWithTx.dbTransaction.referenceId = withdrawResponse.id;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending withdrawal confirmation email");
            const userRecord = await db_1.models.user.findOne({
                where: { id: user.id },
            });
            if (userRecord) {
                await (0, emails_1.sendTransactionStatusUpdateEmail)(userRecord, resultWithTx.dbTransaction, result.wallet, result.wallet.balance, null);
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Withdrawn ${totalWithdrawAmount} ${currency} (net: ${netWithdrawAmount}) to ${toAddress} via ${chain}`);
            return {
                message: withdrawStatus === "COMPLETED"
                    ? "Withdrawal completed successfully"
                    : "Withdrawal submitted to the exchange and awaiting its confirmation",
                transaction: resultWithTx.dbTransaction,
                currency: result.wallet.currency,
                method: chain,
                balance: result.wallet.balance,
            };
        }
        catch (error) {
            if (withdrawResponse) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal was dispatched to the exchange but the follow-up failed; leaving it PROCESSING for reconciliation");
                await db_1.models.transaction.update({
                    status: "PROCESSING",
                    metadata: JSON.stringify({
                        ...JSON.parse(resultWithTx.dbTransaction.metadata),
                        error: error.message,
                        dispatchedButUnconfirmed: true,
                        providerWithdrawId: (_t = withdrawResponse === null || withdrawResponse === void 0 ? void 0 : withdrawResponse.id) !== null && _t !== void 0 ? _t : null,
                    }),
                }, { where: { id: resultWithTx.dbTransaction.id } });
                throw (0, error_1.createError)({
                    statusCode: 502,
                    message: "The withdrawal was sent to the exchange but its confirmation could not be read. It is being reconciled — do not retry it.",
                });
            }
            if ((0, exchange_status_1.isIndeterminateExchangeError)(error)) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("The exchange did not answer the withdrawal request; leaving it PROCESSING for reconciliation rather than refunding blind");
                await db_1.models.transaction.update({
                    status: "PROCESSING",
                    metadata: JSON.stringify({
                        ...JSON.parse(resultWithTx.dbTransaction.metadata),
                        error: error.message,
                    }),
                }, { where: { id: resultWithTx.dbTransaction.id } });
                throw (0, error_1.createError)({
                    statusCode: 502,
                    message: "The exchange did not confirm whether it accepted the withdrawal. It is being reconciled — do not retry it.",
                });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Rolling back transaction due to exchange error");
            await db_1.sequelize.transaction(async (t) => {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancelling transaction record");
                const [cancelled] = await db_1.models.transaction.update({
                    status: "CANCELLED",
                    metadata: JSON.stringify({
                        ...JSON.parse(resultWithTx.dbTransaction.metadata),
                        error: error.message,
                    }),
                }, {
                    where: { id: resultWithTx.dbTransaction.id, status: "PROCESSING" },
                    transaction: t,
                });
                if (cancelled === 0) {
                    console_1.logger.warn("WITHDRAW", `Not refunding ${resultWithTx.dbTransaction.id}: it is no longer PROCESSING, so the ` +
                        `reconciler has already settled it against what the exchange did. Refunding here ` +
                        `would pay the customer on top of that settlement.`);
                    throw (0, error_1.createError)({
                        statusCode: 409,
                        message: "This withdrawal has already been settled by the reconciler against what the exchange " +
                            "reported. It has not been refunded here; check its final status before acting.",
                    });
                }
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Refunding user wallet via wallet service");
                const refundIdempotencyKey = `spot_withdraw_refund_${resultWithTx.dbTransaction.id}`;
                await wallet_1.walletService.credit({
                    idempotencyKey: refundIdempotencyKey,
                    userId: user.id,
                    walletId: result.wallet.id,
                    walletType: "SPOT",
                    currency,
                    amount: totalDeductionAmount,
                    operationType: "REFUND_WITHDRAWAL",
                    referenceId: resultWithTx.dbTransaction.id,
                    description: `Refund for failed withdrawal ${resultWithTx.dbTransaction.id}`,
                    metadata: {
                        originalTransactionId: resultWithTx.dbTransaction.id,
                        reason: error.message,
                    },
                    transaction: t,
                });
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal failed: " + error.message);
            throw (0, error_1.createError)(500, "Withdrawal failed: " + error.message);
        }
    }
    else {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Marking withdrawal as pending approval");
        await db_1.sequelize.transaction(async (t) => {
            await db_1.models.transaction.update({ status: "PENDING" }, { where: { id: resultWithTx.dbTransaction.id }, transaction: t });
        });
        resultWithTx.dbTransaction.status = "PENDING";
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Withdrawal request submitted for approval: ${totalWithdrawAmount} ${currency} to ${toAddress} via ${chain}`);
        return {
            message: "Withdrawal request submitted and pending approval",
            transaction: resultWithTx.dbTransaction,
            currency: result.wallet.currency,
            method: chain,
            balance: result.wallet.balance,
        };
    }
};
