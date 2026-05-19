"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const error_1 = require("@b/utils/error");
const tokens_1 = require("@b/api/(ext)/ecosystem/utils/tokens");
const query_1 = require("@b/utils/query");
const index_post_1 = require("@b/api/finance/transfer/index.post");
const withdrawalQueue_1 = __importDefault(require("../utils/withdrawalQueue"));
const safe_imports_1 = require("@b/utils/safe-imports");
const console_1 = require("@b/utils/console");
const uuid_1 = require("uuid");
function countDecimals(value) {
    var _a;
    if (Number.isInteger(value))
        return 0;
    const str = value.toString();
    if (str.includes("e-")) {
        const [_, exponent] = str.split("e-");
        return parseInt(exponent, 10);
    }
    const parts = str.split(".");
    return ((_a = parts[1]) === null || _a === void 0 ? void 0 : _a.length) || 0;
}
exports.metadata = {
    summary: "Withdraws funds to an external address",
    description: "Processes a withdrawal from the user's wallet to an external address.",
    operationId: "withdrawFunds",
    tags: ["Wallet", "Withdrawal"],
    requiresAuth: true,
    logModule: "ECO_WITHDRAW",
    logTitle: "Withdraw funds to external address",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currency: {
                            type: "string",
                            description: "Currency to withdraw",
                        },
                        chain: {
                            type: "string",
                            description: "Withdraw method ID",
                        },
                        amount: {
                            type: "number",
                            description: "Amount to withdraw",
                        },
                        toAddress: {
                            type: "string",
                            description: "Withdraw toAddress",
                        },
                    },
                    required: ["currency", "chain", "amount", "toAddress"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Withdrawal processed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message indicating the withdrawal has been processed.",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet"),
        500: query_1.serverErrorResponse,
    },
};
function sanitizeInput(input, maxLength = 255) {
    if (!input || typeof input !== 'string')
        return '';
    let sanitized = input
        .replace(/\0/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim();
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
}
function validateAddressFormat(address) {
    if (!address || typeof address !== 'string')
        return false;
    const suspiciousPatterns = [
        /[<>'"]/,
        /\$\{.*\}/,
        /\.\.\//,
        /__proto__|constructor|prototype/i,
        /javascript:/i,
        /data:/i,
        /on\w+\s*=/i,
        /script|iframe|object|embed/i,
        /union.*select/i,
        /exec\(|eval\(|system\(/i,
    ];
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(address)) {
            console_1.logger.error("SECURITY", `Suspicious pattern detected in address: ${pattern}`);
            return false;
        }
    }
    const validAddressPattern = /^[a-zA-Z0-9]+$/;
    return validAddressPattern.test(address);
}
exports.default = async (data) => {
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const { currency: rawCurrency, chain: rawChain, amount, toAddress: rawToAddress } = body;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing input parameters");
        const currency = sanitizeInput(rawCurrency, 10);
        const chain = sanitizeInput(rawChain, 20);
        const toAddress = sanitizeInput(rawToAddress, 200);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal request");
        if (!currency || !chain || !toAddress) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required parameters");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Missing required parameters",
            });
        }
        if (!validateAddressFormat(toAddress)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid address format detected");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid address format. Address contains invalid characters or suspicious patterns.",
            });
        }
        console_1.logger.info("ECO_WITHDRAW", `Starting withdrawal: userId=${user.id}, currency=${currency}, chain=${chain}, amount=${amount}, toAddress=${toAddress === null || toAddress === void 0 ? void 0 : toAddress.substring(0, 10)}...`);
        if (!chain) {
            console_1.logger.error("ECO_WITHDRAW", `Chain parameter missing`);
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Chain parameter is required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Chain parameter is required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal amount");
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0 || !isFinite(parsedAmount)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid amount provided");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid amount. Must be a positive number.",
            });
        }
        const finalAmount = Math.abs(parsedAmount);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking if address is internal");
        console_1.logger.debug("ECO_WITHDRAW", `Checking if address is internal...`);
        const recipientWallet = await findWalletByAddress(toAddress);
        if (recipientWallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing as internal transfer");
            console_1.logger.info("ECO_WITHDRAW", `Address is internal, processing as transfer`);
            const result = await (0, index_post_1.processInternalTransfer)(user.id, recipientWallet.userId, currency, chain, finalAmount);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Internal transfer of ${finalAmount} ${currency} completed`);
            return result;
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing as external withdrawal");
            console_1.logger.info("ECO_WITHDRAW", `Address is external, processing withdrawal`);
            const result = await storeWithdrawal(user.id, currency, chain, finalAmount, toAddress, ctx);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Withdrawal of ${finalAmount} ${currency} to ${chain} submitted`);
            return result;
        }
    }
    catch (error) {
        console_1.logger.error("ECO_WITHDRAW", `Error in withdrawal`, error);
        if (error.message === "INSUFFICIENT_FUNDS") {
            console_1.logger.debug("ECO_WITHDRAW", "Insufficient funds error");
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Insufficient funds");
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Withdrawal failed: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to withdraw: ${error}`,
        });
    }
};
const storeWithdrawal = async (userId, currency, chain, amount, toAddress, ctx) => {
    var _a, _b, _c, _d, _e, _f, _g;
    console_1.logger.debug("ECO_WITHDRAW", `Starting storeWithdrawal: userId=${userId}, currency=${currency}, chain=${chain}, amount=${amount}, toAddress=${toAddress === null || toAddress === void 0 ? void 0 : toAddress.substring(0, 10)}...`);
    if (!chain || typeof chain !== "string") {
        console_1.logger.error("ECO_WITHDRAW", `Invalid chain parameter: ${chain}`);
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid or missing chain parameter" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating withdrawal address");
    if (!["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
        (0, wallet_1.validateAddress)(toAddress, chain);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving user wallet");
    console_1.logger.debug("ECO_WITHDRAW", `Looking for wallet: userId=${userId}, currency=${currency}, type=ECO`);
    const userWallet = await db_1.models.wallet.findOne({
        where: { userId, currency, type: "ECO" },
    });
    if (!userWallet) {
        console_1.logger.error("ECO_WITHDRAW", `Wallet not found for user ${userId}, currency ${currency}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "User wallet not found" });
    }
    if (userWallet.type !== "ECO") {
        console_1.logger.error("ECO_WITHDRAW", `Attempted withdrawal from non-ECO wallet: type=${userWallet.type}`);
        throw (0, error_1.createError)({ statusCode: 403, message: "Withdrawals are only allowed from ECO wallets" });
    }
    console_1.logger.debug("ECO_WITHDRAW", `Found wallet: walletId=${userWallet.id}, balance=${userWallet.balance}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching token configuration");
    console_1.logger.debug("ECO_WITHDRAW", `Fetching token settings for ${currency} on ${chain}`);
    const token = await (0, tokens_1.getEcosystemToken)(chain, currency);
    if (!token) {
        console_1.logger.error("ECO_WITHDRAW", `Token not found for ${currency} on ${chain}`);
        throw (0, error_1.createError)({ statusCode: 404, message: "Token not found" });
    }
    console_1.logger.debug("ECO_WITHDRAW", `Token found: currency=${token.currency}, decimals=${token.decimals}, precision=${token.precision}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating amount precision");
    const maxPrecision = (_b = (_a = token.precision) !== null && _a !== void 0 ? _a : token.decimals) !== null && _b !== void 0 ? _b : 8;
    const actualDecimals = countDecimals(amount);
    if (actualDecimals > maxPrecision) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Amount has too many decimal places for ${currency} on ${chain}. Max allowed is ${maxPrecision} decimal places. Your amount has ${actualDecimals} decimal places.`
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating withdrawal fees");
    let withdrawalFee = 0;
    if (token.fee) {
        const tokenFee = JSON.parse(token.fee);
        const currencyWithdrawalFee = (_c = tokenFee.percentage) !== null && _c !== void 0 ? _c : 0;
        const minimumWithdrawalFee = (_d = tokenFee.min) !== null && _d !== void 0 ? _d : 0;
        withdrawalFee = calculateWithdrawalFee(amount, currencyWithdrawalFee, minimumWithdrawalFee);
    }
    let activationFee = 0;
    let estimatedFee = 0;
    const evmChains = ["ETH", "BSC", "POLYGON", "FTM", "OPTIMISM", "ARBITRUM", "BASE", "CELO", "RSK", "AVAX"];
    const isNativeEVM = evmChains.includes(chain) && token.contractType === "NATIVE";
    if (isNativeEVM) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Estimating gas fees for ${chain}`);
        console_1.logger.debug("ECO_WITHDRAW", `Estimating gas for NATIVE ${currency} on ${chain}`);
        try {
            const { initializeProvider } = require("@b/api/(ext)/ecosystem/utils/provider");
            const provider = await initializeProvider(chain);
            const gasPrice = await provider.getFeeData();
            const gasLimit = 21000;
            const { ethers } = require("ethers");
            const gasCost = BigInt(gasLimit) * (gasPrice.gasPrice || gasPrice.maxFeePerGas || BigInt(0));
            estimatedFee = parseFloat(ethers.formatUnits(gasCost, token.decimals));
            console_1.logger.debug("ECO_WITHDRAW", `Estimated gas fee: ${estimatedFee} ${currency}, gasLimit=${gasLimit}, gasPrice=${(_e = gasPrice.gasPrice) === null || _e === void 0 ? void 0 : _e.toString()}`);
        }
        catch (error) {
            console_1.logger.error("ECO_WITHDRAW", `Failed to estimate gas: ${error.message}`);
            const fallbackGasFees = {
                ETH: 0.001,
                BSC: 0.0003,
                POLYGON: 0.01,
                ARBITRUM: 0.0001,
                OPTIMISM: 0.0001,
                BASE: 0.0001,
                AVAX: 0.001,
            };
            estimatedFee = fallbackGasFees[chain] || 0.001;
            console_1.logger.debug("ECO_WITHDRAW", `Using fallback gas estimate: ${estimatedFee} ${currency}`);
        }
    }
    if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating UTXO withdrawal for ${chain}`);
        console_1.logger.debug("ECO_WITHDRAW", `Pre-validating UTXO withdrawal for ${chain}`);
        const { calculateMinimumWithdrawal } = require("@b/api/(ext)/ecosystem/utils/utxo");
        try {
            const validationResult = await calculateMinimumWithdrawal(userWallet.id, chain, amount);
            if (!validationResult.isEconomical) {
                console_1.logger.error("ECO_WITHDRAW", `Withdrawal not economical: ${validationResult.reason}`);
                throw (0, error_1.createError)({ statusCode: 400, message: validationResult.reason });
            }
            console_1.logger.debug("ECO_WITHDRAW", `UTXO validation passed: withdrawal requires ${validationResult.utxoCount} UTXOs`);
        }
        catch (error) {
            console_1.logger.error("ECO_WITHDRAW", `UTXO validation error: ${error.message}`);
            throw error;
        }
    }
    else if (chain === "TRON") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Estimating TRON transaction fees");
        const TronService = await (0, safe_imports_1.getTronService)();
        if (!TronService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Tron service not available" });
        }
        const tronService = await TronService.getInstance();
        const isActivated = await tronService.isAddressActivated(toAddress);
        if (!isActivated) {
            activationFee = 1;
        }
        const walletData = await (0, wallet_1.getWalletData)(userWallet.id, chain);
        if (!walletData) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet data not found" });
        }
        const addresses = typeof userWallet.address === "string"
            ? JSON.parse(userWallet.address)
            : userWallet.address;
        const fromAddress = addresses[chain].address;
        if (token.contractType !== "NATIVE" && token.contract) {
            estimatedFee = await tronService.estimateTrc20TransactionFee(fromAddress, toAddress, token.contract, amount, token.decimals || 6);
        }
        else {
            const amountSun = Math.round(amount * 1e6);
            const estimatedFeeSun = await tronService.estimateTransactionFee(fromAddress, toAddress, amountSun);
            estimatedFee = estimatedFeeSun / 1e6;
        }
    }
    else if (chain === "XMR") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Estimating Monero transaction fees");
        const MoneroService = await (0, safe_imports_1.getMoneroService)();
        if (!MoneroService) {
            throw (0, error_1.createError)({ statusCode: 503, message: "Monero service not available" });
        }
        const moneroService = await MoneroService.getInstance();
        estimatedFee = await moneroService.estimateMoneroFee();
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating total fees and amounts");
    const isNativeTron = chain === "TRON" && token.contractType === "NATIVE";
    const isNetworkFeePaidFromAmount = isNativeEVM || chain === "XMR" || isNativeTron;
    const totalFee = isNetworkFeePaidFromAmount
        ? withdrawalFee + (isNativeTron ? 0 : activationFee)
        : withdrawalFee + activationFee + estimatedFee;
    const precision = (_g = (_f = token.precision) !== null && _f !== void 0 ? _f : token.decimals) !== null && _g !== void 0 ? _g : 8;
    const totalAmount = parseFloat((amount + totalFee).toFixed(precision));
    console_1.logger.debug("ECO_WITHDRAW", `Fee calculation: withdrawAmount=${amount}, withdrawalFee=${withdrawalFee}, activationFee=${activationFee}, estimatedNetworkFee=${estimatedFee}, totalFee=${totalFee}, totalToDeduct=${totalAmount}`);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying balance and creating withdrawal transaction");
    const withdrawNonce = (0, uuid_1.v4)();
    let transaction;
    await db_1.sequelize.transaction({
        isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    }, async (dbTransaction) => {
        const lockedWallet = await db_1.models.wallet.findOne({
            where: { id: userWallet.id },
            lock: sequelize_1.Transaction.LOCK.UPDATE,
            transaction: dbTransaction,
        });
        if (!lockedWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
        }
        const lockedWalletData = await db_1.models.walletData.findOne({
            where: {
                walletId: userWallet.id,
                chain: chain,
            },
            lock: sequelize_1.Transaction.LOCK.UPDATE,
            transaction: dbTransaction,
        });
        const platformBalance = Number(lockedWallet.balance);
        let availableBalance = platformBalance;
        if (token.contractType === "PERMIT" && lockedWalletData) {
            const privateLedger = await db_1.models.ecosystemPrivateLedger.findOne({
                where: {
                    walletId: userWallet.id,
                    index: lockedWalletData.index,
                    currency: currency,
                    chain: chain,
                },
                transaction: dbTransaction,
            });
            if (privateLedger && privateLedger.offchainDifference) {
                const offchainDiff = Number(privateLedger.offchainDifference) || 0;
                availableBalance = availableBalance - offchainDiff;
                console_1.logger.debug("ECO_WITHDRAW", `PERMIT token - adjusted for private ledger: platformBalance=${platformBalance}, offchainDifference=${offchainDiff}, adjustedAvailableBalance=${availableBalance}`);
            }
        }
        console_1.logger.debug("ECO_WITHDRAW", `Balance check: walletBalance=${lockedWallet.balance}, walletInOrder=${lockedWallet.inOrder}, walletDataBalance=${lockedWalletData === null || lockedWalletData === void 0 ? void 0 : lockedWalletData.balance}, contractType=${token.contractType}, platformAvailable=${platformBalance}, availableBalance=${availableBalance}, totalRequired=${totalAmount}`);
        if (availableBalance < totalAmount) {
            console_1.logger.error("ECO_WITHDRAW", `Insufficient funds: available ${availableBalance} < required ${totalAmount}`);
            throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds" });
        }
        await (0, wallet_1.decrementWalletBalance)(lockedWallet, chain, totalAmount, dbTransaction, withdrawNonce);
        transaction = await (0, wallet_1.createPendingTransaction)(userId, lockedWallet.id, currency, chain, amount, toAddress, withdrawalFee, token, dbTransaction, {
            activationFee,
            estimatedFee,
            totalAmount,
        });
        userWallet.balance = lockedWallet.balance - totalAmount;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding transaction to withdrawal queue");
    const withdrawalQueue = withdrawalQueue_1.default.getInstance();
    withdrawalQueue.addTransaction(transaction.id);
    return {
        transaction: transaction.get({ plain: true }),
        balance: userWallet.balance,
        method: chain,
        currency,
        message: "Withdrawal request submitted successfully",
        walletUpdate: {
            currency,
            balance: userWallet.balance,
            type: "ECO"
        }
    };
};
const calculateWithdrawalFee = (amount, currencyWithdrawalFee, minimumWithdrawalFee) => {
    const calculatedFee = (amount * currencyWithdrawalFee) / 100;
    return Math.max(calculatedFee, minimumWithdrawalFee);
};
async function findWalletByAddress(toAddress) {
    const wallets = await db_1.models.wallet.findAll({
        where: {
            type: "ECO",
        },
    });
    for (const wallet of wallets) {
        const addresses = (0, index_post_1.parseAddresses)(wallet.address);
        for (const chain in addresses) {
            if (addresses[chain].address === toAddress) {
                return wallet;
            }
        }
    }
    return null;
}
