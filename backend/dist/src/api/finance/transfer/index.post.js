"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.parseAddresses = parseAddresses;
exports.processInternalTransfer = processInternalTransfer;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const safe_imports_1 = require("@b/utils/safe-imports");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
async function getWalletByUserIdAndCurrency(userId, currency) {
    const walletUtils = await (0, safe_imports_1.getEcosystemWalletUtils)();
    if (!(0, safe_imports_1.isServiceAvailable)(walletUtils)) {
        throw (0, error_1.createError)({ statusCode: 503, message: "Ecosystem wallet extension is not installed or available" });
    }
    if (typeof walletUtils.getWalletByUserIdAndCurrency !== 'function') {
        throw (0, error_1.createError)({ statusCode: 500, message: "getWalletByUserIdAndCurrency function not found" });
    }
    return walletUtils.getWalletByUserIdAndCurrency(userId, currency);
}
const utils_1 = require("./utils");
const cache_1 = require("@b/utils/cache");
const utils_2 = require("../currency/utils");
exports.metadata = {
    summary: "Performs a transfer transaction",
    description: "Initiates a transfer transaction for the currently authenticated user",
    operationId: "createTransfer",
    tags: ["Finance", "Transfer"],
    requiresAuth: true,
    logModule: "TRANSFER",
    logTitle: "Process transfer transaction",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        fromType: {
                            type: "string",
                            description: "The type of wallet to transfer from",
                        },
                        toType: {
                            type: "string",
                            description: "The type of wallet to transfer to",
                        },
                        fromCurrency: {
                            type: "string",
                            description: "The currency to transfer from",
                        },
                        toCurrency: {
                            type: "string",
                            description: "The currency to transfer to",
                            nullable: true,
                        },
                        amount: { type: "number", description: "Amount to transfer" },
                        transferType: {
                            type: "string",
                            description: "Type of transfer: client or wallet",
                        },
                        clientId: {
                            type: "string",
                            description: "Client UUID for client transfers",
                            nullable: true,
                        },
                    },
                    required: [
                        "fromType",
                        "toType",
                        "amount",
                        "fromCurrency",
                        "transferType",
                    ],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Transfer transaction initiated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
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
    var _a, _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing transfer request parameters");
    const { fromType, toType, amount, transferType, clientId, fromCurrency, toCurrency, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating transfer request");
    if (toCurrency === "Select a currency") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid target currency selected");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Please select a target currency",
        });
    }
    if (transferType === "wallet" && fromType === toType) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Cannot transfer between same wallet type");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Wallet transfers must be between different wallet types",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user exists in database");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching source wallet (${fromCurrency} ${fromType})`);
    const fromWallet = await db_1.models.wallet.findOne({
        where: {
            userId: user.id,
            currency: fromCurrency,
            type: fromType,
        },
    });
    if (!fromWallet) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Source wallet not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    }
    let toWallet = null;
    let toUser = null;
    if (transferType === "client") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving destination wallet for client transfer`);
        ({ toWallet, toUser } = await handleClientTransfer(clientId, toCurrency || fromCurrency, toType || fromType));
    }
    else {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving destination wallet for wallet-to-wallet transfer`);
        toWallet = await handleWalletTransfer(user.id, fromType, toType, toCurrency);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating transfer amount");
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid transfer amount");
        throw (0, error_1.createError)(400, "Invalid transfer amount");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching currency data");
    const currencyData = await (0, utils_1.getCurrencyData)(fromType, fromCurrency);
    if (!currencyData) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid wallet type");
        throw (0, error_1.createError)(400, "Invalid wallet type");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating transfer fees");
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const walletTransferFeePercentage = settings.get("walletTransferFeePercentage") || 0;
    const transferFeeAmount = (0, utils_1.calculateTransferFee)(parsedAmount, walletTransferFeePercentage);
    const totalDeduction = parsedAmount;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking source wallet balance");
    const availableBalance = fromWallet.balance - ((_a = fromWallet.inOrder) !== null && _a !== void 0 ? _a : 0);
    if (availableBalance < totalDeduction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient balance: available=${availableBalance} (balance=${fromWallet.balance}, inOrder=${(_b = fromWallet.inOrder) !== null && _b !== void 0 ? _b : 0}) < ${totalDeduction}`);
        throw (0, error_1.createError)(400, "Insufficient balance to cover transfer");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Executing transfer transaction");
    const transaction = await performTransaction(transferType, fromWallet, toWallet, parsedAmount, fromCurrency, toCurrency, user.id, toUser === null || toUser === void 0 ? void 0 : toUser.id, fromType, toType, currencyData);
    if (transferType === "client") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending transfer notification emails");
        const userPk = await db_1.models.user.findByPk(user.id);
        await (0, utils_1.sendTransferEmails)(userPk, toUser, fromWallet, toWallet, parsedAmount, transaction);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Transfer completed: ${parsedAmount} ${fromCurrency} from ${fromType} to ${toCurrency || fromCurrency} ${toType}`);
    return {
        message: "Transfer initiated successfully",
        fromTransfer: transaction.fromTransfer,
        toTransfer: transaction.toTransfer,
        fromType,
        toType,
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
    };
};
async function handleClientTransfer(clientId, currency, walletType) {
    if (!clientId)
        throw (0, error_1.createError)({ statusCode: 400, message: "Client ID is required" });
    const toUser = await db_1.models.user.findByPk(clientId);
    if (!toUser)
        throw (0, error_1.createError)({ statusCode: 404, message: "Target user not found" });
    let toWallet;
    if (walletType === "ECO") {
        try {
            toWallet = await getWalletByUserIdAndCurrency(clientId, currency);
        }
        catch (error) {
            console_1.logger.warn("TRANSFER", "ECO extension not available, falling back to regular wallet", error);
            const result = await wallet_1.walletCreationService.getOrCreateWallet(clientId, walletType, currency);
            toWallet = result.wallet;
        }
    }
    else {
        const result = await wallet_1.walletCreationService.getOrCreateWallet(clientId, walletType, currency);
        toWallet = result.wallet;
    }
    if (!toWallet)
        throw (0, error_1.createError)({ statusCode: 404, message: "Target wallet not found" });
    return { toWallet, toUser };
}
async function handleWalletTransfer(userId, fromType, toType, toCurrency) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
    const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
    if (!isSpotEnabled && (fromType === "SPOT" || toType === "SPOT")) {
        throw (0, error_1.createError)(400, "Spot wallet transfers are currently disabled");
    }
    const validTransfers = {
        FIAT: isSpotEnabled ? ["SPOT", "ECO"] : ["ECO"],
        SPOT: ["FIAT", "ECO"],
        ECO: isSpotEnabled ? ["FIAT", "SPOT", "FUTURES"] : ["FIAT", "FUTURES"],
        FUTURES: ["ECO"],
    };
    if (!validTransfers[fromType] || !validTransfers[fromType].includes(toType))
        throw (0, error_1.createError)(400, "Invalid wallet type transfer");
    if (fromType === "FUTURES" && toType !== "ECO") {
        throw (0, error_1.createError)(400, "FUTURES wallet can only transfer to ECO wallet");
    }
    const result = await wallet_1.walletCreationService.getOrCreateWallet(userId, toType, toCurrency);
    return result.wallet;
}
async function performTransaction(transferType, fromWallet, toWallet, parsedAmount, fromCurrency, toCurrency, userId, clientId, fromType, toType, currencyData) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const walletTransferFeePercentage = settings.get("walletTransferFeePercentage") || 0;
    const transferFeeAmount = (0, utils_1.calculateTransferFee)(parsedAmount, walletTransferFeePercentage);
    let targetReceiveAmount = parsedAmount - transferFeeAmount;
    if (fromCurrency !== toCurrency) {
        console_1.logger.info("TRANSFER", `Calculating exchange rate from ${fromCurrency} to ${toCurrency}`);
        const exchangeRate = await getExchangeRate(fromCurrency, fromType, toCurrency, toType);
        targetReceiveAmount = (parsedAmount - transferFeeAmount) * exchangeRate;
        console_1.logger.info("TRANSFER", `Converted amount: ${parsedAmount - transferFeeAmount} ${fromCurrency} = ${targetReceiveAmount} ${toCurrency} (rate: ${exchangeRate})`);
    }
    const totalDeducted = parsedAmount;
    if (fromWallet.balance < totalDeducted) {
        throw (0, error_1.createError)(400, "Insufficient balance to cover transfer and fees.");
    }
    return await db_1.sequelize.transaction(async (t) => {
        console_1.logger.info("TRANSFER", "Starting database transaction");
        const requiresLedgerUpdate = (0, utils_1.requiresPrivateLedgerUpdate)(transferType, fromType, toType);
        const transferStatus = requiresLedgerUpdate ? "PENDING" : "COMPLETED";
        console_1.logger.info("TRANSFER", `Transfer status: ${transferStatus} (ledger update required: ${requiresLedgerUpdate})`);
        let transactionIds;
        if (!requiresLedgerUpdate) {
            console_1.logger.info("TRANSFER", "Processing complete transfer (no ledger update required)");
            transactionIds = await handleCompleteTransfer({
                fromWallet,
                toWallet,
                parsedAmount,
                targetReceiveAmount,
                transferType,
                fromType,
                fromCurrency,
                currencyData,
                t,
            });
        }
        else {
            console_1.logger.info("TRANSFER", "Processing pending transfer (ledger update required)");
            transactionIds = await handlePendingTransfer({
                fromWallet,
                toWallet,
                totalDeducted,
                targetReceiveAmount,
                transferStatus,
                currencyData,
                t,
            });
        }
        console_1.logger.info("TRANSFER", "Retrieving transaction records");
        const fromTransfer = await db_1.models.transaction.findByPk(transactionIds.fromTransactionId, { transaction: t });
        const toTransfer = transactionIds.toTransactionId
            ? await db_1.models.transaction.findByPk(transactionIds.toTransactionId, { transaction: t })
            : null;
        if (!fromTransfer) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to retrieve outgoing transaction record" });
        }
        if (transferFeeAmount > 0) {
            console_1.logger.info("TRANSFER", `Recording admin profit: ${transferFeeAmount} ${fromCurrency}`);
            await (0, utils_1.recordAdminProfit)({
                userId,
                transferFeeAmount,
                fromCurrency,
                fromType,
                toType,
                transactionId: transactionIds.fromTransactionId,
                t,
            });
        }
        console_1.logger.info("TRANSFER", "Database transaction completed successfully");
        return { fromTransfer, toTransfer };
    });
}
async function getExchangeRate(fromCurrency, fromType, toCurrency, toType) {
    try {
        let fromPriceUSD;
        switch (fromType) {
            case "FIAT":
                fromPriceUSD = await (0, utils_2.getFiatPriceInUSD)(fromCurrency);
                break;
            case "SPOT":
                fromPriceUSD = await (0, utils_2.getSpotPriceInUSD)(fromCurrency);
                break;
            case "ECO":
            case "FUTURES":
                fromPriceUSD = await (0, utils_2.getEcoPriceInUSD)(fromCurrency);
                break;
            default:
                throw (0, error_1.createError)(400, `Invalid fromType: ${fromType}`);
        }
        let toPriceUSD;
        switch (toType) {
            case "FIAT":
                toPriceUSD = await (0, utils_2.getFiatPriceInUSD)(toCurrency);
                break;
            case "SPOT":
                toPriceUSD = await (0, utils_2.getSpotPriceInUSD)(toCurrency);
                break;
            case "ECO":
            case "FUTURES":
                toPriceUSD = await (0, utils_2.getEcoPriceInUSD)(toCurrency);
                break;
            default:
                throw (0, error_1.createError)(400, `Invalid toType: ${toType}`);
        }
        if (!fromPriceUSD || fromPriceUSD <= 0) {
            throw (0, error_1.createError)(400, `Price not available for ${fromCurrency} in ${fromType} wallet`);
        }
        if (!toPriceUSD || toPriceUSD <= 0) {
            throw (0, error_1.createError)(400, `Price not available for ${toCurrency} in ${toType} wallet`);
        }
        const rate = fromPriceUSD / toPriceUSD;
        return rate;
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)(400, `Unable to fetch exchange rate between ${fromCurrency} and ${toCurrency}: ${error.message}`);
    }
}
async function handleCompleteTransfer({ fromWallet, toWallet, parsedAmount, targetReceiveAmount, transferType, fromType, fromCurrency, currencyData, t, }) {
    if (fromType === "ECO" && transferType === "client") {
        console_1.logger.info("TRANSFER", "Handling ECO client balance transfer");
        return await handleEcoClientBalanceTransfer({
            fromWallet,
            toWallet,
            parsedAmount,
            fromCurrency,
            currencyData,
            t,
        });
    }
    else {
        console_1.logger.info("TRANSFER", "Handling non-client transfer");
        return await handleNonClientTransfer({
            fromWallet,
            toWallet,
            parsedAmount,
            fromCurrency,
            targetReceiveAmount,
            currencyData,
            t,
        });
    }
}
async function handleEcoClientBalanceTransfer({ fromWallet, toWallet, parsedAmount, fromCurrency, currencyData, t, }) {
    console_1.logger.info("TRANSFER", "Parsing ECO wallet addresses");
    const fromAddresses = parseAddresses(fromWallet.address);
    const toAddresses = parseAddresses(toWallet.address);
    console_1.logger.info("TRANSFER", `Distributing ${parsedAmount} ${fromCurrency} across chains`);
    let remainingAmount = parsedAmount;
    for (const [chain, chainInfo] of (0, utils_1.getSortedChainBalances)(fromAddresses)) {
        if (remainingAmount <= 0)
            break;
        const transferableAmount = Math.min(chainInfo.balance, remainingAmount);
        console_1.logger.info("TRANSFER", `Transferring ${transferableAmount} from chain: ${chain}`);
        chainInfo.balance -= transferableAmount;
        toAddresses[chain] = toAddresses[chain] || { balance: 0 };
        toAddresses[chain].balance += transferableAmount;
        console_1.logger.info("TRANSFER", `Updating private ledger for sender wallet on chain: ${chain}`);
        await (0, utils_1.updatePrivateLedger)(fromWallet.id, 0, fromCurrency, chain, -transferableAmount, t);
        console_1.logger.info("TRANSFER", `Updating private ledger for recipient wallet on chain: ${chain}`);
        await (0, utils_1.updatePrivateLedger)(toWallet.id, 0, fromCurrency, chain, transferableAmount, t);
        remainingAmount -= transferableAmount;
    }
    if (remainingAmount > 0) {
        console_1.logger.error("TRANSFER", `Insufficient chain balance: ${remainingAmount} ${fromCurrency} remaining`);
        throw (0, error_1.createError)(400, "Insufficient chain balance across all addresses.");
    }
    console_1.logger.info("TRANSFER", "Updating wallet balances");
    const transactionIds = await (0, utils_1.updateWalletBalances)(fromWallet, toWallet, parsedAmount, parsedAmount, currencyData.precision, t, `transfer_eco_client_${fromWallet.id}_${toWallet.id}`);
    return transactionIds;
}
async function handleNonClientTransfer({ fromWallet, toWallet, parsedAmount, fromCurrency, targetReceiveAmount, currencyData, t, }) {
    if (fromWallet.type === "ECO" && toWallet.type === "ECO") {
        console_1.logger.info("TRANSFER", "Processing ECO to ECO wallet transfer");
        console_1.logger.info("TRANSFER", "Deducting from source ECO wallet");
        const deductionDetails = await deductFromEcoWallet(fromWallet, parsedAmount, fromCurrency, t);
        console_1.logger.info("TRANSFER", "Adding to destination ECO wallet");
        await addToEcoWallet(toWallet, deductionDetails, fromCurrency, t);
    }
    else if (fromWallet.type === "ECO" && (toWallet.type === "SPOT" || toWallet.type === "FIAT" || toWallet.type === "FUTURES")) {
        console_1.logger.info("TRANSFER", `Processing ECO to ${toWallet.type} wallet transfer`);
        console_1.logger.info("TRANSFER", "Deducting from source ECO wallet with ledger update");
        await deductFromEcoWallet(fromWallet, parsedAmount, fromCurrency, t);
        console_1.logger.info("TRANSFER", `Tokens moved from blockchain to ${toWallet.type} system (centralized)`);
    }
    else if ((fromWallet.type === "SPOT" || fromWallet.type === "FIAT" || fromWallet.type === "FUTURES") && toWallet.type === "ECO") {
        console_1.logger.info("TRANSFER", `Processing ${fromWallet.type} to ECO wallet transfer`);
        console_1.logger.info("TRANSFER", "Adding to destination ECO wallet with ledger update");
        const addresses = parseAddresses(toWallet.address);
        const firstChain = Object.keys(addresses)[0] || "ETH";
        const deductionDetails = [{ chain: firstChain, amount: targetReceiveAmount }];
        await addToEcoWallet(toWallet, deductionDetails, fromCurrency, t);
        console_1.logger.info("TRANSFER", `Tokens moved from ${fromWallet.type} system to blockchain (chain: ${firstChain})`);
    }
    console_1.logger.info("TRANSFER", `Updating wallet balances (deduct: ${parsedAmount}, add: ${targetReceiveAmount})`);
    const transactionIds = await (0, utils_1.updateWalletBalances)(fromWallet, toWallet, parsedAmount, targetReceiveAmount, currencyData.precision, t, `transfer_non_client_${fromWallet.id}_${toWallet.id}`);
    return transactionIds;
}
async function deductFromEcoWallet(wallet, amount, currency, t) {
    console_1.logger.info("TRANSFER", `Deducting ${amount} ${currency} from ECO wallet`);
    const addresses = parseAddresses(wallet.address);
    let remainingAmount = amount;
    const deductionDetails = [];
    for (const chain in addresses) {
        if (Object.prototype.hasOwnProperty.call(addresses, chain) &&
            addresses[chain].balance > 0) {
            const transferableAmount = Math.min(addresses[chain].balance, remainingAmount);
            console_1.logger.info("TRANSFER", `Deducting ${transferableAmount} ${currency} from chain: ${chain}`);
            addresses[chain].balance -= transferableAmount;
            deductionDetails.push({ chain, amount: transferableAmount });
            console_1.logger.info("TRANSFER", `Updating private ledger for deduction on chain: ${chain}`);
            await (0, utils_1.updatePrivateLedger)(wallet.id, 0, currency, chain, -transferableAmount, t);
            remainingAmount -= transferableAmount;
            if (remainingAmount <= 0)
                break;
        }
    }
    if (remainingAmount > 0) {
        console_1.logger.error("TRANSFER", `Insufficient chain balance: ${remainingAmount} ${currency} remaining`);
        throw (0, error_1.createError)(400, "Insufficient chain balance to complete the transfer");
    }
    console_1.logger.info("TRANSFER", "Updating wallet address data");
    await wallet.update({
        address: JSON.stringify(addresses),
    }, { transaction: t });
    console_1.logger.info("TRANSFER", `Successfully deducted from ${deductionDetails.length} chain(s)`);
    return deductionDetails;
}
async function addToEcoWallet(wallet, deductionDetails, currency, t) {
    console_1.logger.info("TRANSFER", `Adding to ECO wallet across ${deductionDetails.length} chain(s)`);
    const addresses = parseAddresses(wallet.address);
    for (const detail of deductionDetails) {
        const { chain, amount } = detail;
        console_1.logger.info("TRANSFER", `Adding ${amount} ${currency} to chain: ${chain}`);
        if (!addresses[chain]) {
            console_1.logger.info("TRANSFER", `Initializing new chain entry: ${chain}`);
            addresses[chain] = {
                address: null,
                network: null,
                balance: 0,
            };
        }
        addresses[chain].balance += amount;
        console_1.logger.info("TRANSFER", `Updating private ledger for addition on chain: ${chain}`);
        await (0, utils_1.updatePrivateLedger)(wallet.id, 0, currency, chain, amount, t);
    }
    console_1.logger.info("TRANSFER", "Updating wallet address data");
    await wallet.update({
        address: JSON.stringify(addresses),
    }, { transaction: t });
    console_1.logger.info("TRANSFER", "Successfully added to ECO wallet");
}
async function handlePendingTransfer({ fromWallet, toWallet, totalDeducted, targetReceiveAmount, transferStatus, currencyData, t, }) {
    const idempotencyKey = `pending_transfer_${fromWallet.id}_${toWallet.id}_${totalDeducted}`;
    console_1.logger.info("TRANSFER", `Debiting source wallet (current: ${fromWallet.balance}, deducting: ${totalDeducted})`);
    const fromResult = await wallet_1.walletService.debit({
        idempotencyKey: `${idempotencyKey}_from`,
        userId: fromWallet.userId,
        walletId: fromWallet.id,
        walletType: fromWallet.type,
        currency: fromWallet.currency,
        amount: totalDeducted,
        operationType: "OUTGOING_TRANSFER",
        description: `Transfer to wallet ${toWallet.id}`,
        relatedWalletId: toWallet.id,
        metadata: {
            targetWalletId: toWallet.id,
            targetAmount: targetReceiveAmount,
            transferStatus,
        },
        transaction: t,
    });
    let toTransactionId = null;
    if (transferStatus === "COMPLETED") {
        console_1.logger.info("TRANSFER", `Crediting destination wallet (current: ${toWallet.balance}, adding: ${targetReceiveAmount})`);
        const toResult = await wallet_1.walletService.credit({
            idempotencyKey: `${idempotencyKey}_to`,
            userId: toWallet.userId,
            walletId: toWallet.id,
            walletType: toWallet.type,
            currency: toWallet.currency,
            amount: targetReceiveAmount,
            operationType: "INCOMING_TRANSFER",
            description: `Transfer from wallet ${fromWallet.id}`,
            relatedWalletId: fromWallet.id,
            metadata: {
                sourceWalletId: fromWallet.id,
                sourceAmount: totalDeducted,
            },
            transaction: t,
        });
        toTransactionId = toResult.transactionId;
    }
    else {
        console_1.logger.info("TRANSFER", "Transfer is pending, destination wallet balance not updated yet");
    }
    return {
        fromTransactionId: fromResult.transactionId,
        toTransactionId,
    };
}
function parseAddresses(address) {
    if (!address) {
        return {};
    }
    if (typeof address === "string") {
        try {
            return JSON.parse(address);
        }
        catch (error) {
            console_1.logger.error("TRANSFER", "Failed to parse address JSON", error);
            return {};
        }
    }
    if (typeof address === "object") {
        return address;
    }
    return {};
}
async function processInternalTransfer(fromUserId, toUserId, currency, chain, amount) {
    const fromWallet = await db_1.models.wallet.findOne({
        where: {
            userId: fromUserId,
            currency: currency,
            type: "ECO",
        },
    });
    if (!fromWallet) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Sender wallet not found" });
    }
    const toWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(toUserId, "ECO", currency);
    const toWallet = toWalletResult.wallet;
    const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (fromWallet.balance < parsedAmount) {
        throw (0, error_1.createError)(400, "Insufficient balance.");
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const walletTransferFeePercentage = settings.get("walletTransferFeePercentage") || 0;
    const transferFeeAmount = (parsedAmount * walletTransferFeePercentage) / 100;
    const targetReceiveAmount = parsedAmount - transferFeeAmount;
    const transaction = await db_1.sequelize.transaction(async (t) => {
        var _a;
        let precision = 8;
        if (fromWallet.type === "ECO" && toWallet.type === "ECO") {
            const deductionDetails = await deductFromEcoWallet(fromWallet, parsedAmount, currency, t);
            await addToEcoWallet(toWallet, deductionDetails, currency, t);
            const currencyData = await (0, utils_1.getCurrencyData)(fromWallet.type, fromWallet.currency);
            precision = (_a = currencyData === null || currencyData === void 0 ? void 0 : currencyData.precision) !== null && _a !== void 0 ? _a : 8;
        }
        await (0, utils_1.updateWalletBalances)(fromWallet, toWallet, parsedAmount, targetReceiveAmount, precision, t, `transfer_${fromWallet.id}_${toWallet.id}`);
        const outgoingTransfer = await (0, utils_1.createTransferTransaction)(fromUserId, fromWallet.id, "OUTGOING_TRANSFER", parsedAmount, transferFeeAmount, currency, currency, fromWallet.id, toWallet.id, `Internal transfer to user ${toUserId}`, "COMPLETED", t);
        const incomingTransfer = await (0, utils_1.createTransferTransaction)(toUserId, toWallet.id, "INCOMING_TRANSFER", targetReceiveAmount, 0, currency, currency, fromWallet.id, toWallet.id, `Internal transfer from user ${fromUserId}`, "COMPLETED", t);
        if (transferFeeAmount > 0) {
            await (0, utils_1.recordAdminProfit)({
                userId: fromUserId,
                transferFeeAmount,
                fromCurrency: currency,
                fromType: "ECO",
                toType: "ECO",
                transactionId: outgoingTransfer.id,
                t,
            });
        }
        return { outgoingTransfer, incomingTransfer };
    });
    const userWallet = await db_1.models.wallet.findOne({
        where: { userId: fromUserId, currency, type: "ECO" },
    });
    return {
        transaction,
        balance: userWallet === null || userWallet === void 0 ? void 0 : userWallet.balance,
        method: chain,
        currency,
    };
}
