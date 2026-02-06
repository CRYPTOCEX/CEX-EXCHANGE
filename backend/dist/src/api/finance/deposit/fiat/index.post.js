"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
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
    const { methodId, amount, currency, customFields } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating deposit method");
    const method = await db_1.models.depositMethod.findByPk(methodId);
    if (!method) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Deposit method not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Deposit method not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
    const currencyData = await db_1.models.currency.findOne({
        where: { id: currency },
    });
    if (!currencyData) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Currency not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating deposit fees");
    const parsedAmount = parseFloat(amount);
    const fixedFee = method.fixedFee || 0;
    const percentageFee = method.percentageFee || 0;
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
                method: method.title,
                ...customFields,
            }),
            description: `Deposit ${parsedAmount} ${wallet.currency} by ${method.title}`,
        }, { transaction: t });
        if (taxAmount > 0) {
            await db_1.models.adminProfit.create({
                amount: taxAmount,
                currency: wallet.currency,
                type: "DEPOSIT",
                transactionId: trx.id,
                description: `Admin profit from deposit fee of ${taxAmount} ${wallet.currency} by ${method.title} for user (${user.id})`,
            }, { transaction: t });
        }
        return trx;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Fiat deposit created: ${parsedAmount} ${currency} via ${method.title}`);
    return {
        transaction: depositTransaction,
        currency,
        method: method.title,
    };
};
