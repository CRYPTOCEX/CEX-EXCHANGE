"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.parseAddresses = parseAddresses;
exports.processInternalTransfer = processInternalTransfer;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const safe_imports_1 = require("@b/utils/safe-imports");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const uuid_1 = require("uuid");
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
const ledger_1 = require("@b/utils/pool-backing/ledger");
const settings_1 = require("@b/utils/pool-backing/settings");
const finance_availability_1 = require("@b/utils/finance-availability");
const utils_2 = require("../currency/utils");
const kyc_1 = require("@b/utils/kyc");
const transfer_security_1 = require("@b/utils/transfer-security");
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
                        transferToken: {
                            type: "string",
                            description: "Single-use token from POST /api/finance/transfer/verification/verify, proving the transfer was confirmed with a Transfer PIN or a one-time code. Required only when an admin has enabled transfer verification.",
                            nullable: true,
                        },
                        nonce: {
                            type: "string",
                            description: "Optional client-minted idempotency nonce, unique per submission. A replay of the same nonce is refused (409) instead of moving the funds a second time.",
                            maxLength: 64,
                            pattern: "^[A-Za-z0-9_-]+$",
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
    var _a;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying user exists in database");
    const userPk = await db_1.models.user.findByPk(user.id);
    if (!userPk) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    if (userPk.status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Sender account is ${userPk.status}`);
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Your account is not active. Please contact support.",
        });
    }
    if ((0, system_accounts_1.isSystemAccount)(userPk)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Sender is a platform system account");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `${(0, system_accounts_1.describeSystemAccount)(userPk)} does not transfer by hand; the settlement engine moves its money.`,
        });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.TRANSFER_WALLETS, "transfer between wallets");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing transfer request parameters");
    const { fromType, toType, amount, transferType, clientId, fromCurrency, toCurrency, transferToken, nonce, } = body;
    if (nonce !== undefined && nonce !== null && nonce !== "") {
        if (typeof nonce !== "string" ||
            nonce.length > 64 ||
            !/^[A-Za-z0-9_-]+$/.test(nonce)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid nonce");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid nonce: use up to 64 letters, digits, '_' or '-'",
            });
        }
    }
    const transferId = typeof nonce === "string" && nonce ? `${user.id}_${nonce}` : (0, uuid_1.v4)();
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
    if (transferType === "client") {
        if (clientId && String(clientId) === String(user.id)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Client transfer to self");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "You cannot transfer to your own account",
            });
        }
        if (toCurrency && toCurrency !== fromCurrency) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Client transfers cannot change currency (${fromCurrency} -> ${toCurrency})`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Client transfers must use the same currency for sender and recipient",
            });
        }
        if (toType && toType !== fromType) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Client transfers cannot change wallet type (${fromType} -> ${toType})`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Client transfers must use the same wallet type for sender and recipient",
            });
        }
    }
    await (0, transfer_security_1.assertTransferSecurity)(user.id, transferType === "client" ? "client" : "wallet", clientId, transferToken, ctx);
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating destination currency availability");
    await (0, finance_availability_1.assertCurrencyEnabled)((toType || fromType), toCurrency || fromCurrency, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating transfer fees");
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const walletTransferFeePercentage = (0, utils_1.getTransferFeePercentage)(settings);
    const transferFeeAmount = (0, utils_1.calculateTransferFee)(parsedAmount, walletTransferFeePercentage);
    const totalDeduction = parsedAmount;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking source wallet balance");
    const availableBalance = fromWallet.balance;
    if (availableBalance < totalDeduction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Insufficient balance: available=${availableBalance} (balance=${fromWallet.balance}, inOrder=${(_a = fromWallet.inOrder) !== null && _a !== void 0 ? _a : 0}) < ${totalDeduction}`);
        throw (0, error_1.createError)(400, "Insufficient balance to cover transfer");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Executing transfer transaction");
    const transaction = await performTransaction(transferType, fromWallet, toWallet, parsedAmount, fromCurrency, toCurrency, user.id, toUser === null || toUser === void 0 ? void 0 : toUser.id, fromType, toType, currencyData, transferId);
    if (transferType === "client") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending transfer notification emails");
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
function systemRecipientRefusal(subject) {
    return (0, error_1.createError)({
        statusCode: 403,
        message: `Transfers to ${(0, system_accounts_1.describeSystemAccount)(subject)} are refused: it is funded only by the ` +
            `settlement engine, and a balance sent to it by hand would be a liability nothing tracks.`,
    });
}
async function handleClientTransfer(clientId, currency, walletType) {
    if (!clientId)
        throw (0, error_1.createError)({ statusCode: 400, message: "Client ID is required" });
    if ((0, system_accounts_1.isSystemAccount)(clientId))
        throw systemRecipientRefusal(clientId);
    const toUser = await db_1.models.user.findByPk(clientId);
    if (!toUser)
        throw (0, error_1.createError)({ statusCode: 404, message: "Target user not found" });
    if ((0, system_accounts_1.isSystemAccount)(toUser))
        throw systemRecipientRefusal(toUser);
    if (toUser.status !== "ACTIVE")
        throw (0, error_1.createError)({ statusCode: 403, message: "Recipient account is inactive" });
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
    const settings = await cacheManager.getSettings();
    const spotWalletsRow = settings.get("spotWallets");
    const isSpotEnabled = settings.has("spotWallets")
        ? spotWalletsRow === true || spotWalletsRow === "true"
        : true;
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
async function performTransaction(transferType, fromWallet, toWallet, parsedAmount, fromCurrency, toCurrency, userId, clientId, fromType, toType, currencyData, transferId) {
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const walletTransferFeePercentage = (0, utils_1.getTransferFeePercentage)(settings);
    const walletTransferSpread = Number(settings.get("walletTransferSpread")) || 0;
    console_1.logger.info("TRANSFER", `Transfer spread configured: ${walletTransferSpread}%`);
    const transferFeeAmount = (0, utils_1.calculateTransferFee)(parsedAmount, walletTransferFeePercentage);
    let targetReceiveAmount = parsedAmount - transferFeeAmount;
    if (fromCurrency !== toCurrency) {
        console_1.logger.info("TRANSFER", `Calculating exchange rate from ${fromCurrency} to ${toCurrency}`);
        const exchangeRate = await getExchangeRate(fromCurrency, fromType, toCurrency, toType, walletTransferSpread);
        targetReceiveAmount = (parsedAmount - transferFeeAmount) * exchangeRate;
        console_1.logger.info("TRANSFER", `Converted amount: ${parsedAmount - transferFeeAmount} ${fromCurrency} = ${targetReceiveAmount} ${toCurrency} (rate: ${exchangeRate})`);
    }
    const totalDeducted = parsedAmount;
    const backingDrafts = (0, ledger_1.isBackingRelevantPair)(fromType, toType)
        ? (0, ledger_1.classifyTransfer)({
            fromType,
            toType,
            fromCurrency: fromWallet.currency,
            toCurrency: toWallet.currency,
            received: targetReceiveAmount,
            sentNetOfFee: parsedAmount - transferFeeAmount,
        })
        : [];
    const backingSettings = backingDrafts.length
        ? await (0, settings_1.getPoolBackingSettings)()
        : null;
    return await db_1.sequelize.transaction(async (t) => {
        var _a;
        console_1.logger.info("TRANSFER", "Starting database transaction");
        if (backingSettings && backingSettings.mode !== "off") {
            for (const draft of backingDrafts) {
                if (draft.side === "ecosystem")
                    continue;
                const anchor = await (0, ledger_1.withCurrencyAnchor)(draft.currency, t);
                await (0, ledger_1.assertWithinCap)({
                    currency: draft.currency,
                    addAmount: draft.amount,
                    settings: backingSettings,
                    t,
                    anchor,
                    source: draft.source,
                });
            }
        }
        const walletIdsToLock = [fromWallet.id, toWallet.id].sort();
        const lockedWallets = await db_1.models.wallet.findAll({
            where: { id: walletIdsToLock },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        const lockedFromWallet = lockedWallets.find((w) => w.id === fromWallet.id);
        const lockedToWallet = lockedWallets.find((w) => w.id === toWallet.id);
        if (!lockedFromWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Source wallet not found" });
        }
        if (!lockedToWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Destination wallet not found" });
        }
        if (lockedFromWallet.balance < totalDeducted) {
            throw (0, error_1.createError)(400, "Insufficient balance to cover transfer and fees.");
        }
        console_1.logger.info("TRANSFER", "Processing complete transfer");
        const transactionIds = await handleCompleteTransfer({
            fromWallet: lockedFromWallet,
            toWallet: lockedToWallet,
            parsedAmount,
            targetReceiveAmount,
            transferType,
            fromType,
            fromCurrency,
            currencyData,
            transferId,
            t,
        });
        console_1.logger.info("TRANSFER", "Retrieving transaction records");
        const fromTransfer = await db_1.models.transaction.findByPk(transactionIds.fromTransactionId, { transaction: t });
        const toTransfer = await db_1.models.transaction.findByPk(transactionIds.toTransactionId, { transaction: t });
        if (!fromTransfer) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to retrieve outgoing transaction record" });
        }
        if (backingDrafts.length) {
            await (0, ledger_1.recordTransferObligations)({
                fromType,
                toType,
                fromCurrency: fromWallet.currency,
                toCurrency: toWallet.currency,
                received: targetReceiveAmount,
                sentNetOfFee: parsedAmount - transferFeeAmount,
                outgoingTransactionId: transactionIds.fromTransactionId,
                incomingTransactionId: transactionIds.toTransactionId,
                chains: (_a = transactionIds.chains) !== null && _a !== void 0 ? _a : [],
                userId,
                t,
            });
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
async function getExchangeRate(fromCurrency, fromType, toCurrency, toType, spreadPercentage = 0) {
    try {
        const { rate } = await (0, utils_2.getCrossWalletRate)(fromCurrency, fromType, toCurrency, toType, spreadPercentage);
        return rate;
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)(400, `Unable to fetch exchange rate between ${fromCurrency} and ${toCurrency}: ${error.message}`);
    }
}
async function handleCompleteTransfer({ fromWallet, toWallet, parsedAmount, targetReceiveAmount, transferType, fromType, fromCurrency, currencyData, transferId, t, }) {
    if (fromType === "ECO" && transferType === "client") {
        console_1.logger.info("TRANSFER", "Handling ECO client balance transfer");
        return await handleEcoClientBalanceTransfer({
            fromWallet,
            toWallet,
            parsedAmount,
            targetReceiveAmount,
            fromCurrency,
            currencyData,
            transferId,
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
            transferId,
            t,
        });
    }
}
async function handleEcoClientBalanceTransfer({ fromWallet, toWallet, parsedAmount, targetReceiveAmount, fromCurrency, currencyData, transferId, t, }) {
    console_1.logger.info("TRANSFER", "Parsing ECO wallet addresses");
    const fromAddresses = parseAddresses(fromWallet.address);
    const toAddresses = parseAddresses(toWallet.address);
    const netToRecipient = Number.isFinite(targetReceiveAmount) && targetReceiveAmount > 0
        ? Math.min(targetReceiveAmount, parsedAmount)
        : parsedAmount;
    const netRatio = parsedAmount > 0 ? netToRecipient / parsedAmount : 0;
    console_1.logger.info("TRANSFER", `Distributing ${parsedAmount} ${fromCurrency} across chains (crediting ${netToRecipient} net of fee)`);
    let remainingAmount = parsedAmount;
    const chainsTouched = [];
    for (const [chain, chainInfo] of (0, utils_1.getSortedChainBalances)(fromAddresses)) {
        if (remainingAmount <= 0)
            break;
        const transferableAmount = Math.min(chainInfo.balance, remainingAmount);
        const creditAmount = transferableAmount * netRatio;
        console_1.logger.info("TRANSFER", `Transferring ${transferableAmount} from chain: ${chain} (crediting ${creditAmount})`);
        chainInfo.balance -= transferableAmount;
        toAddresses[chain] = toAddresses[chain] || { balance: 0 };
        toAddresses[chain].balance += creditAmount;
        chainsTouched.push(chain);
        console_1.logger.info("TRANSFER", `Updating private ledger for sender wallet on chain: ${chain}`);
        await (0, utils_1.updatePrivateLedger)(fromWallet.id, 0, fromCurrency, chain, -transferableAmount, t);
        console_1.logger.info("TRANSFER", `Updating private ledger for recipient wallet on chain: ${chain}`);
        await (0, utils_1.updatePrivateLedger)(toWallet.id, 0, fromCurrency, chain, creditAmount, t);
        remainingAmount -= transferableAmount;
    }
    if (remainingAmount > 0) {
        console_1.logger.warn("TRANSFER", `Chain map covers only ${parsedAmount - remainingAmount} of ${parsedAmount} ${fromCurrency} for wallet ${fromWallet.id}; ${remainingAmount} attributed to no chain (wallet.balance is the authority)`);
    }
    if (chainsTouched.length > 0) {
        console_1.logger.info("TRANSFER", `Persisting chain balances for chains: ${chainsTouched.join(", ")}`);
        await fromWallet.update({ address: JSON.stringify(fromAddresses) }, { transaction: t });
        await toWallet.update({ address: JSON.stringify(toAddresses) }, { transaction: t });
    }
    console_1.logger.info("TRANSFER", "Updating wallet balances");
    const transactionIds = await (0, utils_1.updateWalletBalances)(fromWallet, toWallet, parsedAmount, netToRecipient, currencyData.precision, t, `transfer_${transferId}`);
    return transactionIds;
}
async function handleNonClientTransfer({ fromWallet, toWallet, parsedAmount, fromCurrency, targetReceiveAmount, currencyData, transferId, t, }) {
    let chains = [];
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
        chains = (await deductFromEcoWallet(fromWallet, parsedAmount, fromCurrency, t)).map((leg) => ({ chain: String(leg.chain), amount: Number(leg.amount) || 0 }));
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
    const transactionIds = await (0, utils_1.updateWalletBalances)(fromWallet, toWallet, parsedAmount, targetReceiveAmount, currencyData.precision, t, `transfer_${transferId}`);
    return { ...transactionIds, chains };
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
        console_1.logger.warn("TRANSFER", `Chain map covers only ${amount - remainingAmount} of ${amount} ${currency} for wallet ${wallet.id}; ${remainingAmount} attributed to no chain (wallet.balance is the authority)`);
    }
    if (deductionDetails.length > 0) {
        console_1.logger.info("TRANSFER", "Updating wallet address data");
        await wallet.update({
            address: JSON.stringify(addresses),
        }, { transaction: t });
    }
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
    if (deductionDetails.length > 0) {
        console_1.logger.info("TRANSFER", "Updating wallet address data");
        await wallet.update({
            address: JSON.stringify(addresses),
        }, { transaction: t });
    }
    console_1.logger.info("TRANSFER", "Successfully added to ECO wallet");
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
    const walletTransferFeePercentage = (0, utils_1.getTransferFeePercentage)(settings);
    const transferFeeAmount = (parsedAmount * walletTransferFeePercentage) / 100;
    const targetReceiveAmount = parsedAmount - transferFeeAmount;
    const transaction = await db_1.sequelize.transaction(async (t) => {
        var _a;
        const walletIdsToLock = [fromWallet.id, toWallet.id].sort();
        const lockedWallets = await db_1.models.wallet.findAll({
            where: { id: walletIdsToLock },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        const lockedFromWallet = lockedWallets.find((w) => w.id === fromWallet.id);
        const lockedToWallet = lockedWallets.find((w) => w.id === toWallet.id);
        if (!lockedFromWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Sender wallet not found" });
        }
        if (!lockedToWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Recipient wallet not found" });
        }
        if (lockedFromWallet.balance < parsedAmount) {
            throw (0, error_1.createError)(400, "Insufficient balance.");
        }
        let precision = 8;
        if (lockedFromWallet.type === "ECO" && lockedToWallet.type === "ECO") {
            const deductionDetails = await deductFromEcoWallet(lockedFromWallet, parsedAmount, currency, t);
            await addToEcoWallet(lockedToWallet, deductionDetails, currency, t);
            const currencyData = await (0, utils_1.getCurrencyData)(lockedFromWallet.type, lockedFromWallet.currency);
            precision = (_a = currencyData === null || currencyData === void 0 ? void 0 : currencyData.precision) !== null && _a !== void 0 ? _a : 8;
        }
        const transferId = (0, uuid_1.v4)();
        const { fromTransactionId, toTransactionId } = await (0, utils_1.updateWalletBalances)(lockedFromWallet, lockedToWallet, parsedAmount, targetReceiveAmount, precision, t, `internal_transfer_${transferId}`);
        if (transferFeeAmount > 0) {
            await (0, utils_1.recordAdminProfit)({
                userId: fromUserId,
                transferFeeAmount,
                fromCurrency: currency,
                fromType: "ECO",
                toType: "ECO",
                transactionId: fromTransactionId,
                t,
            });
        }
        const outgoingTransfer = await db_1.models.transaction.findByPk(fromTransactionId, {
            transaction: t,
        });
        const incomingTransfer = await db_1.models.transaction.findByPk(toTransactionId, {
            transaction: t,
        });
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
