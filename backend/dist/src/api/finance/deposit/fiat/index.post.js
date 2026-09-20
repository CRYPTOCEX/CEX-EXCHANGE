"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
const kyc_1 = require("@b/utils/kyc");
const finance_availability_1 = require("@b/utils/finance-availability");
exports.metadata = {
    summary: "Performs a custom fiat deposit transaction",
    description: "Initiates a custom fiat deposit transaction for the currently authenticated user",
    operationId: "createCustomFiatDeposit",
    tags: ["Wallets"],
    requiresAuth: true,
    logModule: "FIAT_DEPOSIT",
    logTitle: "Create custom fiat deposit",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        methodId: { type: "string", description: "Deposit method ID" },
                        amount: { type: "number", description: "Amount to deposit" },
                        currency: { type: "string", description: "Currency to deposit" },
                        customFields: {
                            type: "object",
                            description: "Custom data for the deposit",
                        },
                    },
                    required: ["methodId", "amount", "currency", "customFields"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Custom deposit transaction initiated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            transaction: { type: "object" },
                            currency: { type: "string" },
                            method: { type: "string" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Deposit Method"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.DEPOSIT_WALLET, "deposit funds");
    await (0, finance_availability_1.assertWalletTypeEnabled)("FIAT", "deposit funds", ctx);
    const { methodId, amount, currency, customFields } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating deposit method/gateway");
    const method = await (0, finance_availability_1.resolveEnabledDepositMethod)(methodId, ctx);
    const methodTitle = method.title;
    const fixedFee = method.fixedFee || 0;
    const percentageFee = method.percentageFee || 0;
    const minAmount = method.minAmount || 0;
    const maxAmount = method.maxAmount || null;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
    const currencyData = await (0, finance_availability_1.assertCurrencyEnabled)("FIAT", currency, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating deposit amount");
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid deposit amount");
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid deposit amount" });
    }
    if (minAmount > 0 && parsedAmount < minAmount) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Amount below minimum");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Amount is below the minimum of ${minAmount} ${currency}`,
        });
    }
    if (maxAmount != null && maxAmount > 0 && parsedAmount > maxAmount) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Amount above maximum");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Amount exceeds the maximum of ${maxAmount} ${currency}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating deposit fees");
    const taxAmount = parseFloat(Math.max((parsedAmount * percentageFee) / 100 + fixedFee, 0).toFixed(2));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing deposit transaction");
    const depositTransaction = await db_1.sequelize.transaction(async (t) => {
        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency, t);
        const wallet = walletResult.wallet;
        const trx = await db_1.models.transaction.create({
            userId: user.id,
            walletId: wallet.id,
            type: "DEPOSIT",
            amount: parsedAmount,
            fee: taxAmount,
            status: "PENDING",
            metadata: JSON.stringify({
                ...(customFields && typeof customFields === "object" ? customFields : {}),
                method: methodTitle,
            }),
            description: `Deposit ${parsedAmount} ${wallet.currency} by ${methodTitle}`,
        }, { transaction: t });
        return trx;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Fiat deposit created: ${parsedAmount} ${currency} via ${methodTitle}`);
    return {
        transaction: depositTransaction,
        currency,
        method: methodTitle,
    };
};
