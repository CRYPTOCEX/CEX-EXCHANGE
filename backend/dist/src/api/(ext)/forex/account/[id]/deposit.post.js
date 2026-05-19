"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const transaction_handler_1 = require("@b/api/(ext)/forex/account/transaction-handler");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const forex_fraud_detector_1 = require("@b/api/(ext)/forex/utils/forex-fraud-detector");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deposits money into a specified Forex account",
    description: "Allows a user to deposit money from their wallet into a Forex account.",
    operationId: "depositForexAccount",
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
    logTitle: "Deposit to forex account",
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
                        amount: { type: "number", description: "Amount to deposit" },
                        requestNonce: {
                            type: "string",
                            description: "Client-supplied idempotency nonce. Required to deduplicate retries of the same logical deposit request so that network retries cannot cause a double-debit.",
                        },
                    },
                    required: ["type", "currency", "amount", "requestNonce"],
                },
            },
        },
    },
    responses: {
        201: {
            description: "Deposit successfully processed",
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
                                        format: "date-time",
                                        description: "Transaction creation date",
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
                            type: { type: "string", description: "Deposit method type" },
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
    const { amount, type, currency, chain, requestNonce } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating deposit amount");
        if (!amount || amount <= 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Amount is required and must be greater than zero" });
        }
        if (!requestNonce || typeof requestNonce !== "string" || requestNonce.length < 8 || requestNonce.length > 128) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "requestNonce is required (string, 8-128 chars) to prevent duplicate deposits",
            });
        }
        let updatedBalance;
        let taxAmount = 0;
        const result = await db_1.sequelize.transaction(async (t) => {
            var _a;
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying forex account");
            const account = await db_1.models.forexAccount.findByPk(id, {
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!account) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Account not found" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Running fraud detection checks");
            const fraudCheck = await forex_fraud_detector_1.ForexFraudDetector.checkDeposit(user.id, amount, currency, ctx);
            if (!fraudCheck.isValid) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: fraudCheck.reason || "Deposit flagged for security review"
                });
            }
            if (account.userId !== user.id) {
                throw (0, error_1.createError)({ statusCode: 403, message: "Access denied: You can only deposit to your own forex accounts" });
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
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking wallet balance");
            if (wallet.balance < amount) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient balance" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating transaction fees");
            const feeResult = await (0, transaction_handler_1.calculateTransactionFees)(type, wallet.currency, chain, amount, t, ctx);
            const { currencyData, taxAmount: calculatedFee, total } = feeResult;
            taxAmount = calculatedFee;
            if (wallet.balance < total) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deducting ${total} ${currency} from wallet`);
            const idempotencyKey = `forex_deposit_${user.id}_${id}_${requestNonce}`;
            const debitResult = await wallet_1.walletService.debit({
                idempotencyKey,
                userId: user.id,
                walletId: wallet.id,
                walletType: type,
                currency,
                amount: total,
                operationType: "FOREX_DEPOSIT",
                fee: taxAmount,
                description: `Deposit to Forex account ${account.accountId}`,
                metadata: {
                    forexAccountId: id,
                    accountId: account.accountId,
                    walletType: type,
                    chain: chain,
                    price: currencyData.price,
                },
                transaction: t,
            });
            await account.update({ balance: ((_a = account.balance) !== null && _a !== void 0 ? _a : 0) + amount }, { transaction: t });
            if (taxAmount > 0) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Collecting forex deposit platform fee");
                await (0, fees_1.collectPlatformFee)({
                    userId: user.id,
                    currency,
                    walletType: type,
                    chain,
                    feeAmount: taxAmount,
                    type: "FOREX_DEPOSIT",
                    description: `Forex deposit fee for account ${account.accountId}`,
                    referenceId: debitResult.transactionId,
                    metadata: {
                        forexAccountId: id,
                        accountId: account.accountId,
                        walletType: type,
                        chain,
                    },
                    transaction: t,
                });
            }
            updatedBalance = debitResult.newBalance;
            console_1.logger.info("FOREX_DEPOSIT", `User ${user.id} deposited ${amount} ${currency} to forex account ${account.id}. Wallet Type: ${type}, Chain: ${chain || 'N/A'}`);
            return debitResult;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deposited ${amount} ${currency} to forex account ${id}${taxAmount > 0 ? ` (fee: ${taxAmount})` : ''}`);
        return {
            message: "Deposit successful",
            transaction: result,
            balance: updatedBalance,
            currency,
            chain,
            type,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to deposit to forex account");
        console_1.logger.error("FOREX_DEPOSIT_ERROR", `Forex deposit failed for user ${user.id}, account ${id}: ${error.message}. Details: amount=${amount}, currency=${currency}, type=${type}, chain=${chain || 'N/A'}`, error);
        throw error;
    }
};
