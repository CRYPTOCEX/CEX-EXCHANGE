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
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const withdraw_2fa_1 = require("@b/utils/withdraw-2fa");
const kyc_1 = require("@b/utils/kyc");
const finance_availability_1 = require("@b/utils/finance-availability");
exports.metadata = {
    summary: "Performs a custom fiat withdraw transaction",
    description: "Initiates a custom fiat withdraw transaction for the currently authenticated user",
    operationId: "createCustomFiatWithdraw",
    tags: ["Wallets"],
    requiresAuth: true,
    logModule: "FIAT_WITHDRAW",
    logTitle: "Process fiat withdrawal",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        methodId: { type: "string", description: "Withdraw method ID" },
                        amount: { type: "number", description: "Amount to withdraw" },
                        currency: { type: "string", description: "Currency to withdraw" },
                        customFields: {
                            type: "object",
                            description: "Custom data for the withdraw",
                        },
                        beneficiary: {
                            type: "object",
                            description: "Structured payout beneficiary (provider-backed methods only)",
                            properties: {
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                country: { type: "string" },
                                accountType: { type: "string" },
                                accountValue: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                phoneCode: { type: "string" },
                                paymentCode: { type: "string" },
                                paymentType: { type: "string" },
                            },
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
                    required: ["methodId", "amount", "currency", "customFields", "nonce"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Custom withdraw transaction initiated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            transaction: { type: "object" },
                            currency: { type: "string" },
                            method: { type: "string" },
                            balance: { type: "number" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Withdraw Method"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    var _b, _c;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { methodId, amount, currency, customFields, nonce, twoFactorToken } = body;
    if (typeof nonce !== "string" || !nonce.trim() || nonce.length > 128) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A valid withdrawal nonce is required",
        });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.WITHDRAW_WALLET, "withdraw funds");
    await (0, finance_availability_1.assertWalletTypeEnabled)("FIAT", "withdraw funds", ctx);
    await (0, withdraw_2fa_1.assertWithdrawTwoFactor)(user.id, twoFactorToken, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal method");
    const method = await (0, finance_availability_1.resolveEnabledWithdrawMethod)(methodId, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
    const currencyData = await (0, finance_availability_1.assertCurrencyEnabled)("FIAT", currency, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal amount and precision");
    const totalWithdrawAmount = parseFloat(amount);
    if (!Number.isFinite(totalWithdrawAmount) || totalWithdrawAmount <= 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid amount: must be a positive number");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Amount must be a positive number",
        });
    }
    const fiatPrecision = 2;
    const actualDecimals = (() => {
        var _a;
        const s = String(amount);
        if (s.includes("e-")) {
            const [, dec] = s.split("e-");
            return parseInt(dec, 10);
        }
        return ((_a = s.split(".")[1]) === null || _a === void 0 ? void 0 : _a.length) || 0;
    })();
    if (actualDecimals > fiatPrecision) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Amount exceeds precision: ${actualDecimals} > ${fiatPrecision}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Amount has too many decimal places for ${currency}. Max allowed is ${fiatPrecision} decimal places.`,
        });
    }
    const minAmount = (_b = method.minAmount) !== null && _b !== void 0 ? _b : 0;
    const maxAmount = (_c = method.maxAmount) !== null && _c !== void 0 ? _c : 0;
    if (minAmount && totalWithdrawAmount < minAmount) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Amount below minimum: ${totalWithdrawAmount} < ${minAmount}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Minimum withdrawal for ${method.title} is ${minAmount} ${currency}`,
        });
    }
    if (maxAmount && totalWithdrawAmount > maxAmount) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Amount exceeds maximum: ${totalWithdrawAmount} > ${maxAmount}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum withdrawal for ${method.title} is ${maxAmount} ${currency}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating withdrawal fees");
    const fixedFee = method.fixedFee || 0;
    const percentageFee = method.percentageFee || 0;
    const isAdmin = await (0, fees_1.isSuperAdmin)(user.id);
    const feeAmount = isAdmin ? 0 : parseFloat(Math.max((totalWithdrawAmount * percentageFee) / 100 + fixedFee, 0).toFixed(2));
    const netReceiveAmount = parseFloat((totalWithdrawAmount - feeAmount).toFixed(2));
    if (!Number.isFinite(netReceiveAmount) || netReceiveAmount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Withdrawal fees must be less than the withdrawal amount",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing withdrawal transaction");
    const result = await db_1.sequelize.transaction(async (t) => {
        var _a;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Locking user wallet for update");
        const wallet = await db_1.models.wallet.findOne({
            where: { userId: user.id, currency: currency, type: "FIAT" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!wallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`${currency} FIAT wallet not found`);
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet balance");
        const availableBalance = wallet.balance;
        if (availableBalance < totalWithdrawAmount) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient balance: available=${availableBalance} (balance=${wallet.balance}, inOrder=${(_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0}) < ${totalWithdrawAmount}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deducting funds from wallet via wallet service");
        const idempotencyKey = `fiat_withdraw_nonce_${user.id}_${nonce.trim()}`;
        const walletResult = await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: "FIAT",
            currency,
            amount: netReceiveAmount,
            fee: feeAmount,
            operationType: "WITHDRAW",
            description: `Withdrawal of ${netReceiveAmount} ${currency} (fee: ${feeAmount}) via ${method.title}`,
            metadata: {
                ...customFields,
                method: method.title,
                totalAmount: totalWithdrawAmount,
                netAmount: netReceiveAmount,
                fee: feeAmount,
            },
            transaction: t,
        });
        wallet.balance -= totalWithdrawAmount;
        await db_1.models.transaction.update({ status: "PENDING" }, { where: { id: walletResult.transactionId }, transaction: t });
        const trx = await db_1.models.transaction.findByPk(walletResult.transactionId, { transaction: t });
        return {
            transaction: trx,
            currency: wallet.currency,
            method: method.title,
            balance: wallet.balance,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Withdrawn ${totalWithdrawAmount} ${currency} (net: ${netReceiveAmount}) via ${method.title}`);
    try {
        const dispatched = await maybeDispatchToProvider({
            method,
            transaction: result.transaction,
            currency,
            netReceiveAmount,
            beneficiary: (body === null || body === void 0 ? void 0 : body.beneficiary) || customFields,
            ctx,
        });
        if (dispatched) {
            return { ...result, dispatch: dispatched };
        }
    }
    catch (error) {
        console_1.logger.error("FIAT_WITHDRAW", `provider dispatch raised unexpectedly for ${(_a = result.transaction) === null || _a === void 0 ? void 0 : _a.id}: ${error === null || error === void 0 ? void 0 : error.message}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Withdrawal recorded; provider dispatch deferred to an operator");
    }
    return result;
};
async function maybeDispatchToProvider(args) {
    const { method, transaction, currency, netReceiveAmount, beneficiary, ctx } = args;
    const alias = method.gatewayAlias || undefined;
    if (!alias)
        return null;
    const gateway = await db_1.models.withdrawGateway.findOne({
        where: { alias, status: true },
    });
    if (!gateway) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Withdrawal method is bound to '${alias}', which is not enabled — left for manual settlement`);
        return null;
    }
    if (!gateway.autoDispatch) {
        await transaction.update({
            metadata: JSON.stringify({
                ...safeMeta(transaction),
                dispatchProvider: alias,
                awaitingApproval: true,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Withdrawal queued for ${gateway.title} dispatch on approval`);
        return { provider: alias, status: "AWAITING_APPROVAL" };
    }
    if (alias !== "transfi") {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn(`No dispatch adapter for '${alias}' — left for manual settlement`);
        return null;
    }
    const { dispatchTransfiPayout } = await Promise.resolve().then(() => __importStar(require("./transfi/dispatch")));
    const bene = normaliseBeneficiary(beneficiary, currency);
    if (!bene) {
        await transaction.update({
            metadata: JSON.stringify({
                ...safeMeta(transaction),
                dispatchProvider: alias,
                dispatchBlocked: "beneficiary details incomplete",
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Beneficiary details incomplete — withdrawal left for manual settlement");
        return { provider: alias, status: "MANUAL", reason: "beneficiary details incomplete" };
    }
    const outcome = await dispatchTransfiPayout({
        transactionId: transaction.id,
        currency,
        amount: netReceiveAmount,
        beneficiary: bene.beneficiary,
        paymentCode: bene.paymentCode,
        paymentType: bene.paymentType,
        additionalPaymentDetails: bene.additionalPaymentDetails,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`TransFi dispatch: ${outcome.kind}`);
    return { provider: alias, ...outcome };
}
function safeMeta(row) {
    try {
        return JSON.parse((row === null || row === void 0 ? void 0 : row.metadata) || "{}");
    }
    catch (_a) {
        return {};
    }
}
function normaliseBeneficiary(b, currency) {
    if (!b || typeof b !== "object")
        return null;
    const required = ["firstName", "lastName", "country", "accountType", "accountValue"];
    if (required.some((k) => !String(b[k] || "").trim()))
        return null;
    const extras = {};
    for (const k of ["firstName", "lastName", "email", "phone", "phoneCode"]) {
        if (b[k])
            extras[k] = String(b[k]);
    }
    return {
        beneficiary: {
            firstName: String(b.firstName).trim(),
            lastName: String(b.lastName).trim(),
            country: String(b.country).trim().toUpperCase(),
            accountType: String(b.accountType),
            accountValue: String(b.accountValue).trim(),
        },
        paymentCode: String(b.paymentCode || ""),
        paymentType: String(b.paymentType || ""),
        additionalPaymentDetails: extras,
    };
}
