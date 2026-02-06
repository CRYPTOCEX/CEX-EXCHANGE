"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.metadata = void 0;
exports.getWalletQuery = getWalletQuery;
exports.getCurrency = getCurrency;
exports.mapChainNameToChainId = mapChainNameToChainId;
const utils_1 = require("@b/api/auth/utils");
const emails_1 = require("@b/utils/emails");
const error_1 = require("@b/utils/error");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
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
    var _a, _b, _c;
    const { params, ctx } = data;
    const { id } = params;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching transaction");
        const transaction = await db_1.models.transaction.findOne({
            where: { id },
        });
        if (!transaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        if (transaction.status !== "PENDING") {
            throw (0, error_1.createError)({ statusCode: 400, message: "Transaction is not pending" });
        }
        const { amount, userId } = transaction;
        const { currency, chain, address, memo } = transaction.metadata;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching wallet and currency data");
        const wallet = (await getWalletQuery(userId, currency));
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        const currencyData = await getCurrency(currency);
        if (!currencyData) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
        }
        const fee = ((_b = (_a = currencyData.chains) === null || _a === void 0 ? void 0 : _a.find((c) => c.network === chain)) === null || _b === void 0 ? void 0 : _b.withdrawFee) || 0;
        const withdrawAmount = Number(amount) + Number(fee);
        if (withdrawAmount > wallet.balance) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Your withdraw amount including fee is higher than your balance"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing exchange");
        const exchange = await exchange_1.default.startExchange();
        const provider = await exchange_1.default.provider;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing withdrawal");
        let withdrawResponse, withdrawStatus;
        switch (provider) {
            case "kucoin":
                try {
                    const chainId = mapChainNameToChainId(chain);
                    const transferProcess = await exchange.transfer(currency, withdrawAmount, "main", "trade");
                    if (transferProcess.id) {
                        try {
                            withdrawResponse = await exchange.withdraw(currency, withdrawAmount, address, memo, { chain: chainId });
                            if (withdrawResponse.id) {
                                try {
                                    const withdrawals = await exchange.fetchWithdrawals(currency);
                                    const withdrawData = withdrawals.find((w) => w.id === withdrawResponse.id);
                                    if (withdrawData) {
                                        withdrawResponse.fee =
                                            withdrawAmount * fee + ((_c = withdrawData.fee) === null || _c === void 0 ? void 0 : _c.cost);
                                        switch (withdrawData.status) {
                                            case "completed":
                                            case "ok":
                                                withdrawStatus = "COMPLETED";
                                                break;
                                            case "cancelled":
                                            case "canceled":
                                                withdrawStatus = "CANCELLED";
                                                break;
                                            case "failed":
                                                withdrawStatus = "FAILED";
                                                break;
                                            default:
                                                withdrawStatus = "PENDING";
                                                break;
                                        }
                                    }
                                }
                                catch (error) {
                                    withdrawResponse.fee = fee;
                                }
                            }
                        }
                        catch (error) {
                            console_1.logger.error("WALLET", `Withdrawal failed: ${error.message}`, error);
                            throw (0, error_1.createError)({ statusCode: 500, message: `Withdrawal failed: ${error.message}` });
                        }
                    }
                }
                catch (error) {
                    console_1.logger.error("WALLET", `Transfer failed: ${error.message}`, error);
                    throw (0, error_1.createError)({ statusCode: 500, message: `Transfer failed: ${error.message}` });
                }
                break;
            case "binance":
            case "okx":
                try {
                    withdrawResponse = await exchange.withdraw(currency, withdrawAmount, address, memo, { network: chain });
                    withdrawResponse.fee = Number(withdrawResponse.fee) || fee;
                    switch (withdrawResponse.status) {
                        case "completed":
                        case "ok":
                            withdrawStatus = "COMPLETED";
                            break;
                        case "canceled":
                            withdrawStatus = "CANCELLED";
                            break;
                        case "failed":
                            withdrawStatus = "FAILED";
                            break;
                        default:
                            withdrawStatus = "PENDING";
                            break;
                    }
                }
                catch (error) {
                    console_1.logger.error("WALLET", `Withdrawal failed: ${error.message}`, error);
                    throw (0, error_1.createError)({ statusCode: 500, message: `Withdrawal failed: ${error.message}` });
                }
                break;
            default:
                break;
        }
        if (!withdrawResponse ||
            !withdrawResponse.id ||
            !withdrawStatus ||
            withdrawStatus === "FAILED" ||
            withdrawStatus === "CANCELLED") {
            throw (0, error_1.createError)({ statusCode: 500, message: "Withdrawal failed" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating transaction status");
        await db_1.models.transaction.update({
            status: withdrawStatus,
            referenceId: withdrawResponse.id,
        }, {
            where: { id },
        });
        const updatedTransaction = await db_1.models.transaction.findOne({
            where: { id },
        });
        if (!updatedTransaction) {
            throw (0, error_1.createError)(500, "Transaction not found");
        }
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending confirmation email");
            const userData = (await (0, exports.getUserById)(userId, ctx));
            (0, emails_1.sendSpotWalletWithdrawalConfirmationEmail)(userData, updatedTransaction.get({ plain: true }), wallet);
        }
        catch (error) {
            console_1.logger.error("WALLET", `Withdrawal confirmation email failed: ${error.message}`, error);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Withdrawal approved successfully");
        return {
            message: "Withdrawal approved successfully",
        };
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
async function getWalletQuery(userId, currency) {
    const wallet = await db_1.models.wallet.findOne({
        where: {
            userId,
            currency,
            type: "SPOT",
        },
        include: [
            {
                model: db_1.models.transaction,
                as: "transactions",
                order: [["createdAt", "DESC"]],
            },
        ],
    });
    if (!wallet) {
        throw (0, error_1.createError)(404, "Wallet not found");
    }
    return wallet.get({ plain: true });
}
async function getCurrency(symbol) {
    const currency = await db_1.models.exchangeCurrency.findOne({
        where: {
            currency: symbol,
        },
    });
    if (!currency) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Currency details not found" });
    }
    return currency.get({ plain: true });
}
function mapChainNameToChainId(chainName) {
    const chainMap = {
        BEP20: "bsc",
        BEP2: "bnb",
        ERC20: "eth",
        TRC20: "trx",
    };
    return chainMap[chainName] || chainName;
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
