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
const settingsParser_1 = require("@b/utils/settingsParser");
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, chain, amount, toAddress, memo } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal request parameters");
    if (!amount || !toAddress || !currency) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields: amount, toAddress, or currency");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid input" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency configuration");
    const currencyData = await db_1.models.exchangeCurrency.findOne({
        where: { currency },
    });
    if (!currencyData) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Currency not found: ${currency}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Connecting to exchange provider");
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Exchange connection failed");
        throw (0, error_1.createError)(500, "Exchange not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching exchange currency data");
    const isXt = provider === "xt";
    const currencies = await exchange.fetchCurrencies();
    const exchangeCurrency = Object.values(currencies).find((c) => isXt ? c.code === currency : c.id === currency);
    if (!exchangeCurrency) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Currency ${currency} not available on exchange`);
        throw (0, error_1.createError)(404, `Currency ${currency} is not available for withdrawal on the exchange. Please contact support if you believe this is an error.`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal amount and precision");
    const rawPrecision = (_d = (_c = (_b = (exchangeCurrency.networks &&
        ((_a = exchangeCurrency.networks[chain]) === null || _a === void 0 ? void 0 : _a.precision))) !== null && _b !== void 0 ? _b : exchangeCurrency.precision) !== null && _c !== void 0 ? _c : currencyData.precision) !== null && _d !== void 0 ? _d : 8;
    // BUG-001: exchanges may return precision as a STEP SIZE (e.g. 1e-8) rather than a
    // decimal count. Convert step size -> decimal count before comparing against the
    // number of decimals in the user's amount.
    const maxDecimals = Number.isInteger(rawPrecision)
        ? rawPrecision
        : countDecimals(rawPrecision);
    const actualDecimals = countDecimals(amount);
    if (actualDecimals > maxDecimals) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Amount exceeds precision: ${actualDecimals} > ${maxDecimals}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Amount has too many decimal places for ${currency} on ${chain}. Max allowed is ${maxDecimals} decimal places. Your amount has ${actualDecimals} decimal places.`,
        });
    }
    const netConf = (_f = (_e = exchangeCurrency.networks) === null || _e === void 0 ? void 0 : _e[chain]) !== null && _f !== void 0 ? _f : {};
    const minWithdraw = (_h = (_g = netConf.min_withdraw) !== null && _g !== void 0 ? _g : exchangeCurrency.min_withdraw) !== null && _h !== void 0 ? _h : 0;
    const maxWithdraw = (_k = (_j = netConf.max_withdraw) !== null && _j !== void 0 ? _j : exchangeCurrency.max_withdraw) !== null && _k !== void 0 ? _k : 0;
    if (minWithdraw && amount < minWithdraw) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Amount below minimum: ${amount} < ${minWithdraw}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Minimum withdrawal for ${currency} on ${chain} is ${minWithdraw}`,
        });
    }
    if (maxWithdraw && amount > maxWithdraw) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Amount exceeds maximum: ${amount} > ${maxWithdraw}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum withdrawal for ${currency} on ${chain} is ${maxWithdraw}`,
        });
    }
    // BUG-016: do NOT Math.abs() — negative amounts must be rejected, not silently flipped.
    const parsedWithdrawAmount = parseFloat(amount);
    if (!(parsedWithdrawAmount > 0) || !isFinite(parsedWithdrawAmount)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid amount: must be positive number");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Amount must be a positive number",
        });
    }
    const totalWithdrawAmount = parsedWithdrawAmount;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating withdrawal fees");
    let fixedFee = 0;
    if (exchangeCurrency.networks && exchangeCurrency.networks[chain]) {
        fixedFee =
            exchangeCurrency.networks[chain].fee ||
                ((_l = exchangeCurrency.networks[chain].fees) === null || _l === void 0 ? void 0 : _l.withdraw) ||
                0;
    }
    const percentageFee = currencyData.fee || 0;
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    // BUG-018: withdrawalRestrictions flag. It is honored here, but there is no real
    // per-user gating field (e.g. user.canWithdraw / KYC status) reachable in this scope,
    // so the flag is wired but kept NON-blocking by default to avoid blocking all users.
    const withdrawalRestrictions = (0, settingsParser_1.getBooleanSetting)(settings, "withdrawalRestrictions", false);
    if (withdrawalRestrictions) {
        const userCanWithdraw = (userPk === null || userPk === void 0 ? void 0 : userPk.canWithdraw);
        if (userCanWithdraw === false) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawals are restricted for this account");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Withdrawals are currently restricted for your account. Please complete verification or contact support.",
            });
        }
    }
    // BUG-002: settings are stored as strings; a toggled-off boolean becomes "false",
    // and parseFloat("false") === NaN poisons all downstream fee math. Use the guarded helpers.
    const withdrawChainFeeEnabled = (0, settingsParser_1.getBooleanSetting)(settings, "withdrawChainFee", false);
    const spotWithdrawFee = (0, settingsParser_1.getNumericSetting)(settings, "spotWithdrawFee", 0);
    const combinedPercentageFee = percentageFee + spotWithdrawFee;
    const percentageFeeAmount = parseFloat(Math.max((totalWithdrawAmount * combinedPercentageFee) / 100, 0).toFixed(maxDecimals));
    const isAdmin = await (0, fees_1.isSuperAdmin)(user.id);
    const internalFeeAmount = isAdmin ? 0 : percentageFeeAmount;
    const externalFeeAmount = withdrawChainFeeEnabled ? 0 : fixedFee;
    // BUG-007: compute the full deduction (withdraw + internal fee) BEFORE the balance check.
    const totalDeductionAmount = parseFloat((totalWithdrawAmount + internalFeeAmount).toFixed(maxDecimals));
    const netWithdrawAmount = parseFloat((totalWithdrawAmount - externalFeeAmount).toFixed(maxDecimals));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing withdrawal transaction");
    const result = await db_1.sequelize.transaction(async (t) => {
        var _a, _b;
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
        const availableBalance = wallet.balance - ((_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0);
        if (availableBalance < totalDeductionAmount) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient balance: available=${availableBalance} (balance=${wallet.balance}, inOrder=${(_b = wallet.inOrder) !== null && _b !== void 0 ? _b : 0}) < ${totalDeductionAmount}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient funds. Required: ${totalDeductionAmount} ${currency} (${totalWithdrawAmount} + ${internalFeeAmount} fee). Available: ${availableBalance} ${currency}.`,
            });
        }
        const newBalance = parseFloat((wallet.balance - totalDeductionAmount).toFixed(maxDecimals));
        if (newBalance < 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Calculated balance would be negative: ${newBalance}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deducting funds from wallet via wallet service");
        // BUG-011: the old key (user/currency/amount only) permanently blocked a user from
        // ever repeating an identical withdrawal. The key now scopes to wallet/chain/
        // destination/amount within a coarse 30s idempotency window: genuine double-submits
        // and network retries within the window still dedupe (preventing double-debit), but a
        // deliberate repeat withdrawal after the window is allowed through.
        // pass2 #26: include memo/tag so two otherwise-identical withdrawals that differ only by
        // memo (common on memo-based chains) are not wrongly deduped within the window.
        const idempotencyWindow = Math.floor(Date.now() / 30000);
        const idempotencyKey = `spot_withdraw_${wallet.id}_${chain}_${toAddress}_${memo || ""}_${totalWithdrawAmount}_${idempotencyWindow}`;
        // BUG-010 (withdraw side): in manual-approval mode the transaction must land as
        // PENDING so the admin approve endpoint can process it. When approval is enabled
        // (auto-process) it stays COMPLETED.
        const debitStatus = (0, settingsParser_1.getBooleanSetting)(settings, "withdrawApproval", false)
            ? "COMPLETED"
            : "PENDING";
        const walletResult = await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: "SPOT",
            currency,
            amount: totalDeductionAmount,
            operationType: "WITHDRAW",
            status: debitStatus,
            description: `Withdrawal of ${totalWithdrawAmount} ${currency} (net: ${netWithdrawAmount}) to ${toAddress} via ${chain}`,
            metadata: {
                chain,
                toAddress,
                memo,
                totalAmount: totalWithdrawAmount,
                netAmount: netWithdrawAmount,
                fee: internalFeeAmount,
            },
            transaction: t,
        });
        wallet.balance = newBalance;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording admin profit from fees");
        await (0, fees_1.collectPlatformFee)({
            userId: user.id,
            currency: wallet.currency,
            walletType: "SPOT",
            chain,
            feeAmount: internalFeeAmount,
            type: "WITHDRAW",
            description: `Platform fee from spot withdrawal of ${internalFeeAmount} ${wallet.currency} on ${chain}`,
            referenceId: walletResult.transactionId,
            metadata: { userId: user.id, chain, toAddress },
            transaction: t,
        });
        return { transactionId: walletResult.transactionId, wallet };
    });
    const dbTransaction = await db_1.models.transaction.findByPk(result.transactionId);
    if (!dbTransaction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transaction record not found after creation");
        throw (0, error_1.createError)({ statusCode: 500, message: "Transaction record not found" });
    }
    const resultWithTx = { ...result, dbTransaction };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking withdrawal approval settings");
    const withdrawApprovalEnabled = (0, settingsParser_1.getBooleanSetting)(settings, "withdrawApproval", false);
    if (withdrawApprovalEnabled) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Auto-approval enabled, proceeding with exchange withdrawal");
        let withdrawResponse;
        let withdrawStatus = "PENDING";
        const providerWithdrawAmount = withdrawChainFeeEnabled
            ? netWithdrawAmount
            : netWithdrawAmount;
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
            switch (provider) {
                case "kucoin":
                    // Step 1: transfer to trade account + submit withdrawal. A failure HERE is safe
                    // to refund because the funds have not left the exchange yet.
                    try {
                        ctx === null || ctx === void 0 ? void 0 : ctx.step("Transferring funds to trade account (KuCoin)");
                        const transferResult = await exchange.transfer(currency, providerWithdrawAmount, "main", "trade");
                        if (!transferResult || !transferResult.id) {
                            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer to trade account failed");
                            throw (0, error_1.createError)({ statusCode: 500, message: "Transfer to trade account failed" });
                        }
                        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initiating withdrawal to external address");
                        withdrawResponse = await exchange.withdraw(currency, providerWithdrawAmount, toAddress, memo, { network: chain });
                    }
                    catch (submitError) {
                        ctx === null || ctx === void 0 ? void 0 : ctx.fail("KuCoin withdrawal failed: " + submitError.message);
                        throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal request failed. Please try again or contact support." });
                    }
                    if (!withdrawResponse || !withdrawResponse.id) {
                        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal response invalid from exchange");
                        throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal response invalid" });
                    }
                    // Step 2: pass2 #10 FIX — the withdrawal was accepted and funds have left the
                    // exchange. Post-processing failures must NOT trigger the outer refund (that
                    // would double-spend). Mark PENDING and let the cron reconcile.
                    try {
                        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching withdrawal details");
                        const withdrawals = await exchange.fetchWithdrawals(currency);
                        const withdrawData = withdrawals.find((w) => w.id === withdrawResponse.id);
                        if (withdrawData) {
                            withdrawResponse.fee = withdrawChainFeeEnabled
                                ? ((_m = withdrawData.fee) === null || _m === void 0 ? void 0 : _m.cost) || fixedFee
                                : 0;
                            const rawStatus = (withdrawData.status || "").toString().toLowerCase();
                            if (rawStatus === "ok" || rawStatus === "completed") {
                                withdrawStatus = "COMPLETED";
                            }
                            else if (rawStatus === "canceled" || rawStatus === "cancelled") {
                                withdrawStatus = "CANCELLED";
                            }
                            else if (rawStatus === "failed") {
                                withdrawStatus = "FAILED";
                            }
                            else {
                                withdrawStatus = "PENDING";
                            }
                        }
                        else {
                            withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                            withdrawStatus = "PENDING";
                        }
                    }
                    catch (postError) {
                        console_1.logger.warn("WITHDRAW", `KuCoin withdrawal accepted (id=${withdrawResponse.id}) but status fetch failed: ${postError.message}. Marking PENDING for cron reconciliation.`);
                        withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                        withdrawStatus = "PENDING";
                    }
                    break;
                case "binance":
                case "binanceus":
                case "kraken":
                case "okx":
                case "bybit":
                case "mexc":
                case "gate":
                case "bitget":
                    // Step 1: Submit withdrawal. Only this call's failure should trigger the outer refund.
                    try {
                        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initiating withdrawal to external address");
                        withdrawResponse = await exchange.withdraw(currency, providerWithdrawAmount, toAddress, memo, { network: chain });
                    }
                    catch (submitError) {
                        if (submitError.message && submitError.message.includes('-4026')) {
                            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Exchange reported insufficient funds (error -4026)");
                            throw (0, error_1.createError)({
                                statusCode: 400,
                                message: `Insufficient funds available for withdrawal. Please try a smaller amount or contact support for assistance.`
                            });
                        }
                        else if (submitError.message && submitError.message.includes('insufficient')) {
                            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Exchange reported insufficient funds");
                            throw (0, error_1.createError)({
                                statusCode: 400,
                                message: `Insufficient funds available for withdrawal. Please contact support for assistance.`
                            });
                        }
                        else {
                            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${provider} withdrawal failed: ` + submitError.message);
                            throw (0, error_1.createError)({ statusCode: 500, message: `Withdrawal request failed. Please try again or contact support.` });
                        }
                    }
                    if (!withdrawResponse || !withdrawResponse.id) {
                        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal response invalid from exchange");
                        throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal response invalid" });
                    }
                    // Step 2: Exchange accepted the withdrawal. From here, post-processing failures must NOT
                    // trigger the outer refund (would cause double-spend). Mark PENDING and let the cron reconcile.
                    try {
                        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching withdrawal details");
                        const withdrawals = await exchange.fetchWithdrawals(currency);
                        const withdrawData = withdrawals.find((w) => w.id === withdrawResponse.id);
                        if (withdrawData) {
                            withdrawResponse.fee = withdrawChainFeeEnabled
                                ? ((_o = withdrawData.fee) === null || _o === void 0 ? void 0 : _o.cost) || fixedFee
                                : 0;
                            const rawStatus = (withdrawData.status || "").toString().toLowerCase();
                            if (rawStatus === "ok" || rawStatus === "completed") {
                                withdrawStatus = "COMPLETED";
                            }
                            else if (rawStatus === "canceled" || rawStatus === "cancelled") {
                                withdrawStatus = "CANCELLED";
                            }
                            else if (rawStatus === "failed") {
                                withdrawStatus = "FAILED";
                            }
                            else {
                                withdrawStatus = "PENDING";
                            }
                        }
                        else {
                            withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                            withdrawStatus = "PENDING";
                        }
                    }
                    catch (postError) {
                        console_1.logger.warn("WITHDRAW", `Withdrawal accepted by ${provider} (id=${withdrawResponse.id}) but status fetch failed: ${postError.message}. Marking PENDING for cron reconciliation.`);
                        withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                        withdrawStatus = "PENDING";
                    }
                    break;
                case "xt":
                    // Step 1: submit. A failure here is safe to refund (funds did not leave).
                    try {
                        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initiating withdrawal to external address");
                        withdrawResponse = await exchange.withdraw(currency, providerWithdrawAmount, toAddress, memo, { network: chain });
                    }
                    catch (submitError) {
                        ctx === null || ctx === void 0 ? void 0 : ctx.fail("XT withdrawal failed: " + submitError.message);
                        throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal request failed. Please try again or contact support." });
                    }
                    if (!withdrawResponse || !withdrawResponse.id) {
                        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal response invalid from exchange");
                        throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal response invalid" });
                    }
                    // Step 2: pass2 #10 FIX — funds left the exchange; post-processing failures must
                    // NOT trigger the outer refund (double-spend). Mark PENDING for cron reconcile.
                    try {
                        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching withdrawal details");
                        const withdrawals = await exchange.fetchWithdrawals(currency);
                        const withdrawData = withdrawals.find((w) => w.id === withdrawResponse.id);
                        if (withdrawData) {
                            withdrawResponse.fee = withdrawChainFeeEnabled
                                ? ((_p = withdrawData.fee) === null || _p === void 0 ? void 0 : _p.cost) || fixedFee
                                : 0;
                            const statusMapping = {
                                SUCCESS: "COMPLETED",
                                SUBMIT: "PENDING",
                                REVIEW: "PENDING",
                                AUDITED: "PROCESSING",
                                AUDITED_AGAIN: "PROCESSING",
                                PENDING: "PENDING",
                                FAIL: "FAILED",
                                CANCEL: "CANCELLED",
                            };
                            withdrawStatus =
                                statusMapping[withdrawData.status] ||
                                    (withdrawData.status ? withdrawData.status.toUpperCase() : "PENDING");
                        }
                        else {
                            withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                            withdrawStatus = "PENDING";
                        }
                    }
                    catch (postError) {
                        console_1.logger.warn("WITHDRAW", `XT withdrawal accepted (id=${withdrawResponse.id}) but status fetch failed: ${postError.message}. Marking PENDING for cron reconciliation.`);
                        withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                        withdrawStatus = "PENDING";
                    }
                    break;
                default:
                    ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Unsupported provider: ${provider}`);
                    throw (0, error_1.createError)({ statusCode: 400, message: "Withdrawal method not currently available. Please contact support." });
            }
            if (!withdrawResponse ||
                !withdrawResponse.id ||
                withdrawStatus === "FAILED" ||
                withdrawStatus === "CANCELLED") {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal failed or was cancelled by exchange");
                throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal failed" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating transaction with exchange reference");
            await db_1.models.transaction.update({
                status: withdrawStatus,
                referenceId: withdrawResponse.id,
                metadata: JSON.stringify({
                    ...JSON.parse(resultWithTx.dbTransaction.metadata),
                    withdrawResponse,
                }),
            }, { where: { id: resultWithTx.dbTransaction.id } });
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending withdrawal confirmation email");
            const userRecord = await db_1.models.user.findOne({
                where: { id: user.id },
            });
            if (userRecord) {
                await (0, emails_1.sendTransactionStatusUpdateEmail)(userRecord, resultWithTx.dbTransaction, result.wallet, result.wallet.balance, null);
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Withdrawn ${totalWithdrawAmount} ${currency} (net: ${netWithdrawAmount}) to ${toAddress} via ${chain}`);
            return {
                message: "Withdrawal completed successfully",
                transaction: resultWithTx.dbTransaction,
                currency: result.wallet.currency,
                method: chain,
                balance: result.wallet.balance,
            };
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Rolling back transaction due to exchange error");
            await db_1.sequelize.transaction(async (t) => {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancelling transaction record");
                await db_1.models.transaction.update({
                    status: "CANCELLED",
                    metadata: JSON.stringify({
                        ...JSON.parse(resultWithTx.dbTransaction.metadata),
                        error: error.message,
                    }),
                }, { where: { id: resultWithTx.dbTransaction.id }, transaction: t });
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
            // pass2 #11 FIX: the platform fee was credited to the super admin during the initial
            // debit. When the withdrawal is refunded the user is made whole, so leaving the fee on
            // the admin wallet mints unbacked funds. Reverse it BEST-EFFORT — wrapped so it can
            // never block or undo the user's refund above; failures are logged for reconciliation.
            if (internalFeeAmount > 0) {
                try {
                    const superAdmin = await (0, fees_1.getSuperAdmin)();
                    if (superAdmin && superAdmin.id !== user.id) {
                        const adminWallet = await wallet_1.walletCreationService.getOrCreateWallet(superAdmin.id, "SPOT", currency);
                        await wallet_1.walletService.debit({
                            idempotencyKey: `platform_fee_reversal_${resultWithTx.dbTransaction.id}`,
                            userId: superAdmin.id,
                            walletId: adminWallet.id,
                            walletType: "SPOT",
                            currency,
                            amount: internalFeeAmount,
                            operationType: "ADMIN_ADJUSTMENT",
                            description: `Reversal of platform fee for refunded withdrawal ${resultWithTx.dbTransaction.id}`,
                            metadata: { originalTransactionId: resultWithTx.dbTransaction.id, reason: "withdrawal_refund_fee_reversal" },
                        });
                    }
                }
                catch (feeReversalError) {
                    console_1.logger.error("WITHDRAW", `Failed to reverse platform fee for refunded withdrawal ${resultWithTx.dbTransaction.id}: ${feeReversalError.message}. Manual reconciliation may be needed.`);
                }
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Withdrawal failed: " + error.message);
            throw (0, error_1.createError)(500, "Withdrawal failed: " + error.message);
        }
    }
    else {
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
