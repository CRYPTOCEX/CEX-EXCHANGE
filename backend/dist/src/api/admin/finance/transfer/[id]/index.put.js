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
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/finance/transaction/utils");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
async function getLastCandles() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/queries")));
        return module.getLastCandles();
    }
    catch (error) {
        return [];
    }
}
exports.metadata = {
    summary: "Updates an existing transaction",
    operationId: "updateTransaction",
    tags: ["Admin", "Wallets", "Transactions"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the transaction to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated data for the transaction",
        content: {
            "application/json": {
                schema: utils_1.transactionUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Transaction"),
    requiresAuth: true,
    permission: "edit.transfer",
    logModule: "ADMIN_FIN",
    logTitle: "Update Transfer",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, amount, fee, description, referenceId, metadata: requestMetadata, } = body;
    const transaction = await db_1.models.transaction.findOne({
        where: { id },
    });
    if (!transaction)
        throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
    if (transaction.status !== "PENDING") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only pending transactions can be updated" });
    }
    transaction.amount = amount;
    transaction.fee = fee;
    transaction.description = description;
    transaction.referenceId = referenceId;
    return await db_1.sequelize.transaction(async (t) => {
        const metadata = parseMetadata(transaction.metadata);
        const wallet = await db_1.models.wallet.findOne({
            where: { id: transaction.walletId },
            transaction: t,
        });
        if (!wallet)
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        let price = 1;
        const fromCurrency = metadata.fromCurrency;
        if (!fromCurrency)
            throw (0, error_1.createError)({ statusCode: 400, message: "From currency not found" });
        const descriptionParts = (transaction.description || "").split(" ");
        const fromType = descriptionParts[2];
        if (fromType === "FIAT") {
            const currency = await db_1.models.currency.findOne({
                where: { id: fromCurrency },
                transaction: t,
            });
            if (!currency)
                throw (0, error_1.createError)({ statusCode: 404, message: "Currency not found" });
            if (currency.price === null || typeof currency.price === "undefined")
                throw (0, error_1.createError)({ statusCode: 400, message: "Currency price not found" });
            price = currency.price;
        }
        else if (fromType === "SPOT") {
            if (fromCurrency !== "USDT") {
                const redis = redis_1.RedisSingleton.getInstance();
                const cachedData = await redis.get("exchange:tickers");
                const tickers = cachedData ? JSON.parse(cachedData) : {};
                if (!tickers[fromCurrency]) {
                    const exchange = await exchange_1.default.startExchange(ctx);
                    const ticker = await exchange.fetchTicker(`${fromCurrency}/USDT`);
                    if (!ticker || !ticker.last) {
                        throw (0, error_1.createError)({ statusCode: 500, message: "Unable to fetch current market price" });
                    }
                    price = ticker.last;
                }
                else {
                    price = tickers[fromCurrency].last;
                }
            }
        }
        else if (fromType === "ECO") {
            const candles = await getLastCandles();
            const candle = candles.find((c) => c.symbol === fromCurrency);
            if (!candle)
                throw (0, error_1.createError)({ statusCode: 500, message: "Unable to fetch candle data for the currency" });
            price = candle.close;
        }
        const amountToAdd = Number(transaction.amount) * price;
        const idempotencyKey = `admin_transfer_approve_${transaction.id}`;
        await wallet_1.walletService.credit({
            idempotencyKey,
            userId: transaction.userId,
            walletId: wallet.id,
            walletType: wallet.type,
            currency: wallet.currency,
            amount: amountToAdd,
            operationType: "TRANSFER",
            referenceId: transaction.id,
            description: `Transfer approved - ${amountToAdd} ${wallet.currency}`,
            metadata: {
                transactionId: transaction.id,
                originalAmount: transaction.amount,
                price,
                fromCurrency: metadata.fromCurrency,
                fromType,
            },
            transaction: t,
        });
        if (requestMetadata) {
            metadata.message = requestMetadata.message;
        }
        transaction.metadata = JSON.stringify(metadata);
        transaction.status = status;
        await transaction.save({ transaction: t });
        return { message: "Transaction updated successfully" };
    });
};
function parseMetadata(metadataString) {
    let metadata = {};
    try {
        metadataString = metadataString.replace(/\\/g, "");
        metadata = JSON.parse(metadataString) || {};
    }
    catch (e) {
        console_1.logger.error("TRANSFER", "Invalid JSON in metadata", e);
    }
    return metadata;
}
