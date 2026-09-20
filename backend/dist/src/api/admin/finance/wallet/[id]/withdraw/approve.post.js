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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.metadata = void 0;
const utils_1 = require("@b/api/auth/utils");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const utils_2 = require("@b/api/finance/utils");
const tx_hash_1 = require("@b/api/finance/withdraw/tx-hash");
const refund_safety_1 = require("@b/api/finance/withdraw/refund-safety");
const exchange_status_1 = require("@b/api/finance/withdraw/exchange-status");
const funding = require("@b/utils/exchange-funding");
const { SUPPORTED_PROVIDERS } = funding;
const { ensureWithdrawableBalance } = require("@b/utils/pool-backing/exchange-io");
exports.metadata = {
    summary: "Approves a spot wallet withdrawal request",
    operationId: "approveSpotWalletWithdrawal",
    tags: ["Admin", "Wallets"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the wallet withdrawal to approve",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "Withdrawal request approved successfully",
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
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet"),
        500: query_1.serverErrorResponse,
    },
    permission: "edit.wallet",
    requiresAuth: true,
    logModule: "ADMIN_FIN",
    logTitle: "Approve Withdrawal",
};
exports.default = async (data) => {
    var _a;
    const { params, ctx } = data;
    const { id } = params;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching transaction");
        const transaction = await db_1.models.transaction.findOne({
            where: { id },
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        (0, system_accounts_1.assertNotSystemAccount)(transaction.userId, "paid out by hand (the settlement engine moves that account's money)");
        const approvalWallet = transaction.walletId
            ? await db_1.models.wallet.findByPk(transaction.walletId)
            : null;
        const walletKind = approvalWallet === null || approvalWallet === void 0 ? void 0 : approvalWallet.type;
        if (walletKind === "ECO") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Ecosystem withdrawals are settled on-chain by the ecosystem queue and cannot be approved here.",
            });
        }
        if (walletKind === "FIAT") {
            return await approveFiatWithdrawal(transaction, ctx);
        }
        return await approveSpotWithdrawal(transaction, approvalWallet, ctx);
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: (error === null || error === void 0 ? void 0 : error.statusCode) || 500,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to approve withdrawal",
        });
    }
};
async function approveSpotWithdrawal(transaction, wallet, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var _o, _p, _q, _r, _s, _t, _u, _v;
    const id = transaction.id;
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Transaction is not pending" });
    }
    if (transaction.type !== "WITHDRAW") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Not a withdrawal transaction" });
    }
    if (!wallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    if (wallet.type !== "SPOT") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${wallet.type} withdrawals are not paid out through the exchange and cannot be approved here.`,
        });
    }
    if ((0, refund_safety_1.wasDispatched)(transaction)) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This withdrawal has already been sent to the exchange, so approving it would pay it out a second time. " +
                "Its status is settled by the withdrawal reconciler against what the exchange actually did." +
                (transaction.referenceId ? ` Provider reference: ${transaction.referenceId}.` : ""),
        });
    }
    const meta = (0, utils_2.parseTransactionMetadata)(transaction.metadata);
    const currency = wallet.currency;
    const chain = typeof meta.chain === "string" && meta.chain.length > 0 ? meta.chain : null;
    const toAddress = typeof meta.toAddress === "string" && meta.toAddress.length > 0
        ? meta.toAddress
        : null;
    const memo = meta.memo !== undefined && meta.memo !== null && meta.memo !== ""
        ? String(meta.memo)
        : undefined;
    if (!toAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This withdrawal has no destination address recorded on it, so there is nothing to pay out. Reject it instead and the debit is returned.",
        });
    }
    if (!chain) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This withdrawal has no network recorded on it, so it cannot be paid out. Reject it instead and the debit is returned.",
        });
    }
    const requestedAmount = (0, exchange_status_1.requestedWithdrawAmount)(transaction);
    if (!(requestedAmount > 0)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "The amount to pay out cannot be determined from this withdrawal's record. Reject it instead and the debit is returned.",
        });
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Initializing exchange");
    const exchange = await exchange_1.default.startExchange();
    if (!exchange) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Exchange not found" });
    }
    const provider = await exchange_1.default.getProvider();
    if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Withdrawals cannot be paid out through the active exchange provider (${provider !== null && provider !== void 0 ? provider : "none"}). Reject it instead and the debit is returned.`,
        });
    }
    if (meta.provider && meta.provider !== provider) throw (0, error_1.createError)({ statusCode: 409, message: "This withdrawal belongs to a different exchange provider; restore that provider before approving" });
    meta.provider = provider;
    const prepared = await funding.prepareWithdrawal(exchange, provider, currency, chain, toAddress, memo, requestedAmount);
    const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
    const settings = await CacheManager.getInstance().getSettings();
    const platformAbsorbsChainFee = typeof meta.chainFeePaidByPlatform === "boolean"
        ? meta.chainFeePaidByPlatform
        : settings.has("withdrawChainFee") &&
            settings.get("withdrawChainFee") === "true";
    const currencyRow = await db_1.models.exchangeCurrency.findOne({
        where: { currency },
    });
    const precision = funding.validateWithdrawalAmount(exchange, prepared.currency, prepared.network, requestedAmount, Number(currencyRow?.precision) || 8);
    const chainFee = prepared.fee;
    const chainFeeSplit = (0, exchange_status_1.splitChainFee)({
        amount: requestedAmount,
        chainFee,
        platformAbsorbsChainFee,
        precision,
    });
    const submitAmount = chainFeeSplit.submitToExchange;
    if (!(submitAmount > 0)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "The amount to submit to the exchange is not positive. Reject it instead and the debit is returned.",
        });
    }
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Claiming transaction");
    const [claimed] = await db_1.models.transaction.update({ status: "PROCESSING", metadata: JSON.stringify(meta) }, { where: { id, status: "PENDING" } });
    if (claimed === 0) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "Withdrawal is already being processed",
        });
    }
    (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Executing withdrawal via ${provider} exchange`);
    let withdrawResponse;
    try {
        await ensureWithdrawableBalance(exchange, provider, currency, submitAmount);
        withdrawResponse = await exchange.withdraw(currency, submitAmount, toAddress, memo, prepared.params);
        if (!withdrawResponse || !withdrawResponse.id) {
            const error = new Error("Exchange returned no withdrawal reference; reconciliation is required");
            error.name = "BadResponse";
            throw error;
        }
    }
    catch (error) {
        if ((0, exchange_status_1.isIndeterminateExchangeError)(error)) {
            console_1.logger.error("WALLET", `Exchange did not answer the withdrawal request for ${id}; leaving it PROCESSING for reconciliation`, error);
            await db_1.models.transaction.update({
                status: "PROCESSING",
                metadata: JSON.stringify({ ...meta, provider, error: error.message }),
            }, { where: { id } });
            throw (0, error_1.createError)({
                statusCode: 502,
                message: "The exchange did not confirm whether it accepted the withdrawal. It is being reconciled — do not retry it.",
            });
        }
        console_1.logger.error("WALLET", `Withdrawal failed: ${error.message}`, error);
        await refundFailedDispatch(transaction, wallet, `Exchange refused the withdrawal: ${error.message}`, "FAILED", null, ctx);
    }
    if (!withdrawResponse || !withdrawResponse.id) {
        await refundFailedDispatch(transaction, wallet, "No withdrawal response from exchange", "FAILED", null, ctx);
    }
    let withdrawStatus;
    let withdrawData = null;
    let exchangeFee = 0;
    try {
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _h === void 0 ? void 0 : _h.call(ctx, "Fetching withdrawal details");
        const withdrawals = await exchange.fetchWithdrawals(currency);
        withdrawData = (_r = (withdrawals !== null && withdrawals !== void 0 ? withdrawals : []).find((w) => String(w?.id) === String(withdrawResponse.id))) !== null && _r !== void 0 ? _r : null;
        withdrawStatus = (0, exchange_status_1.normalizeExchangeWithdrawStatus)((_s = withdrawData === null || withdrawData === void 0 ? void 0 : withdrawData.status) !== null && _s !== void 0 ? _s : withdrawResponse.status);
        exchangeFee = platformAbsorbsChainFee
            ? Number((_j = withdrawData === null || withdrawData === void 0 ? void 0 : withdrawData.fee) === null || _j === void 0 ? void 0 : _j.cost) || chainFee
            : 0;
    }
    catch (followUpError) {
        console_1.logger.error("WALLET", `Withdrawal ${id} was dispatched (${withdrawResponse.id}) but its confirmation could not be read; leaving it PROCESSING`, followUpError);
        await db_1.models.transaction.update({
            status: "PROCESSING",
            metadata: JSON.stringify({
                ...meta,
                error: followUpError.message,
                dispatchedButUnconfirmed: true,
                providerWithdrawId: withdrawResponse.id,
            }),
        }, { where: { id } });
        throw (0, error_1.createError)({
            statusCode: 502,
            message: "The withdrawal was sent to the exchange but its confirmation could not be read. It is being reconciled — do not retry it.",
        });
    }
    if ((0, exchange_status_1.isTerminalFailure)(withdrawStatus)) {
        await refundFailedDispatch(transaction, wallet, `Exchange returned status: ${withdrawStatus}`, withdrawStatus, withdrawResponse.id, ctx);
    }
    (_k = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _k === void 0 ? void 0 : _k.call(ctx, "Updating transaction status");
    const onChainHash = (_t = (0, tx_hash_1.extractExchangeTxHash)(withdrawData)) !== null && _t !== void 0 ? _t : (0, tx_hash_1.extractExchangeTxHash)(withdrawResponse);
    await db_1.models.transaction.update({
        status: withdrawStatus,
        referenceId: withdrawResponse.id,
        ...(onChainHash ? { trxId: onChainHash } : {}),
        metadata: JSON.stringify({
            ...meta,
            exchangeAmount: submitAmount,
            withdrawResponse: {
                id: withdrawResponse.id,
                status: (_v = (_u = withdrawData === null || withdrawData === void 0 ? void 0 : withdrawData.status) !== null && _u !== void 0 ? _u : withdrawResponse.status) !== null && _v !== void 0 ? _v : null,
                fee: exchangeFee,
                txid: onChainHash,
            },
        }),
    }, { where: { id } });
    await (0, utils_2.collectWithdrawalFeeOnSettlement)(await db_1.models.transaction.findByPk(id), ctx);
    const updatedTransaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!updatedTransaction) {
        throw (0, error_1.createError)(500, "Transaction not found");
    }
    try {
        (_l = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _l === void 0 ? void 0 : _l.call(ctx, "Sending confirmation email");
        const userData = (await (0, exports.getUserById)(transaction.userId, ctx));
        const plainWallet = typeof wallet.get === "function" ? wallet.get({ plain: true }) : wallet;
        await (0, emails_1.sendSpotWalletWithdrawalConfirmationEmail)(userData, updatedTransaction.get({ plain: true }), plainWallet);
    }
    catch (error) {
        console_1.logger.error("WALLET", `Withdrawal confirmation email failed: ${error.message}`, error);
    }
    (_m = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _m === void 0 ? void 0 : _m.call(ctx, "Withdrawal approved successfully");
    return {
        message: "Withdrawal approved successfully",
    };
}
async function refundFailedDispatch(transaction, wallet, failureReason, newStatus, exchangeWithdrawId, ctx) {
    var _a;
    const id = transaction.id;
    const refundAmount = (0, exchange_status_1.refundableDebit)(transaction);
    const meta = (0, utils_2.parseTransactionMetadata)(transaction.metadata);
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Refunding user after exchange failure");
    await db_1.sequelize.transaction(async (t) => {
        if (refundAmount > 0) {
            try {
                await wallet_1.walletService.credit({
                    idempotencyKey: `withdraw_approve_refund_${id}`,
                    userId: transaction.userId,
                    walletId: wallet.id,
                    walletType: "SPOT",
                    currency: wallet.currency,
                    amount: refundAmount,
                    operationType: "REFUND_WITHDRAWAL",
                    referenceId: id,
                    description: "Refund for failed admin withdraw approval",
                    metadata: {
                        transactionId: id,
                        failureReason,
                    },
                    transaction: t,
                });
            }
            catch (refundError) {
                if ((refundError === null || refundError === void 0 ? void 0 : refundError.code) !== "DUPLICATE_OPERATION")
                    throw refundError;
            }
        }
        const [flipped] = await db_1.models.transaction.update({
            status: newStatus,
            metadata: JSON.stringify({
                ...meta,
                failureReason,
                refunded: refundAmount > 0,
                refundedAt: new Date().toISOString(),
                ...(exchangeWithdrawId ? { exchangeWithdrawId } : {}),
            }),
        }, { where: { id, status: "PROCESSING" }, transaction: t });
        if (flipped === 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "The withdrawal was finalised by another request while the exchange was refusing it; nothing was refunded here.",
            });
        }
    });
    throw (0, error_1.createError)({
        statusCode: 500,
        message: `Withdrawal failed: ${failureReason}. The customer has been refunded.`,
    });
}
const getUserById = async (id, ctx) => {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching user by ID");
    const user = await db_1.models.user.findOne({
        where: { id },
        include: utils_1.userInclude,
    });
    if (!user) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "User fetched successfully");
    return {
        ...user.get({ plain: true }),
        password: undefined,
    };
};
exports.getUserById = getUserById;
async function approveFiatWithdrawal(transaction, ctx) {
    var _a, _b;
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Transaction is not pending" });
    }
    const meta = (0, utils_2.parseTransactionMetadata)(transaction.metadata);
    const dispatched = !!meta.transfiOrderId || /^OR-/.test(String(transaction.referenceId || ""));
    if (dispatched) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This withdrawal is being executed by a payout provider and cannot be approved by hand. " +
                "Its status is set by the provider webhook or the payout reconciler. " +
                `Provider reference: ${meta.transfiOrderId || transaction.referenceId}.`,
        });
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Completing fiat withdrawal (manual settlement)");
    const [claimed] = await db_1.models.transaction.update({ status: "COMPLETED" }, { where: { id: transaction.id, status: "PENDING" } });
    if (claimed === 0) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This withdrawal was settled or rejected by another request; nothing was changed. Reload and check its current status.",
        });
    }
    const settled = await db_1.models.transaction.findByPk(transaction.id);
    await (0, utils_2.collectWithdrawalFeeOnSettlement)(settled, ctx);
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Fiat withdrawal marked completed");
    return { message: "Withdrawal approved" };
}
