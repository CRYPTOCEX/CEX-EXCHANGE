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
const index_get_1 = require("../../currency/[type]/[code]/[method]/index.get");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Initiates a spot deposit transaction",
    description: "This endpoint initiates a spot deposit transaction for the user",
    operationId: "initiateSpotDeposit",
    tags: ["Finance", "Deposit"],
    requiresAuth: true,
    logModule: "SPOT_DEPOSIT",
    logTitle: "Initiate spot deposit",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: { type: "string" },
                        chain: { type: "string" },
                        trx: { type: "string" },
                    },
                    required: ["currency", "chain", "trx"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Spot deposit transaction initiated successfully",
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
    const { currency, chain, trx } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing network configuration");
    const provider = await exchange_1.default.getProvider();
    const parsedChain = provider === "xt" ? (0, index_get_1.handleNetworkMappingReverse)(chain) : chain;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user account");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate transaction");
    const existingTransaction = await db_1.models.transaction.findOne({
        where: { referenceId: trx, type: "DEPOSIT" },
    });
    if (existingTransaction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.warn("Transaction already exists");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Transaction already exists",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding or creating SPOT wallet");
    const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "SPOT", currency);
    const wallet = walletResult.wallet;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency");
    const currencyData = await db_1.models.exchangeCurrency.findOne({
        where: { currency },
    });
    if (!currencyData) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Currency not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Currency not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating deposit transaction record");
    const transaction = await db_1.models.transaction.create({
        userId: user.id,
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: 0,
        status: "PENDING",
        description: `${currency} deposit transaction initiated`,
        metadata: JSON.stringify({ currency, chain: parsedChain, trx }),
        referenceId: trx,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Spot deposit initiated: ${currency} on ${parsedChain}`);
    return {
        transaction,
        currency: wallet.currency,
        chain: parsedChain,
        trx: trx,
        method: "SPOT",
    };
};
