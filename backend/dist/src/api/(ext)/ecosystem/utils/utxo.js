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
exports.calculateUTXOFee = exports.broadcastRawUtxoTransaction = exports.verifyUTXOTransaction = exports.fetchUtxoTransaction = exports.fetchRawUtxoTransaction = exports.fetchUTXOWalletBalance = exports.fetchUTXOTransactions = exports.createUTXOWallet = exports.cancelWatchAddress = exports.watchAddressBlockCypher = void 0;
exports.createTransactionDetailsForUTXO = createTransactionDetailsForUTXO;
exports.recordUTXO = recordUTXO;
exports.getCurrentUtxoFeeRatePerByte = getCurrentUtxoFeeRatePerByte;
exports.handleUTXOWithdrawal = handleUTXOWithdrawal;
exports.calculateMinimumWithdrawal = calculateMinimumWithdrawal;
exports.consolidateUTXOs = consolidateUTXOs;
const assert = __importStar(require("assert"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = __importDefault(require("ecpair"));
const ecc = __importStar(require("tiny-secp256k1"));
const ws_1 = __importDefault(require("ws"));
const blockchain_1 = require("./blockchain");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const encrypt_1 = require("../../../../utils/encrypt");
const wallet_1 = require("./wallet");
const UTXOProviderFactory_1 = require("./utxo/providers/UTXOProviderFactory");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class TransactionBroadcastedError extends Error {
    constructor(message, txid) {
        super(message);
        this.name = "TransactionBroadcastedError";
        this.txid = txid;
    }
}
const BTC_NETWORK = process.env.BTC_NETWORK || "mainnet";
const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;
const BTC_NODE = process.env.BTC_NODE || "blockcypher";
const LTC_NODE = process.env.LTC_NODE || "blockcypher";
const DOGE_NODE = process.env.DOGE_NODE || "blockcypher";
const DASH_NODE = process.env.DASH_NODE || "blockcypher";
const wsConnections = new Map();
bitcoin.initEccLib(ecc);
const ECPair = (0, ecpair_1.default)(ecc);
function getUtxoNetwork(chain) {
    switch (chain) {
        case "BTC":
            return BTC_NETWORK === "mainnet"
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;
        case "LTC":
            return blockchain_1.litecoinNetwork;
        case "DOGE":
            return blockchain_1.dogecoinNetwork;
        case "DASH":
            return blockchain_1.dashNetwork;
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported UTXO chain: ${chain}` });
    }
}
const getUtxoProvider = (chain) => {
    switch (chain) {
        case "BTC":
            return BTC_NODE;
        case "LTC":
            return LTC_NODE;
        case "DOGE":
            return DOGE_NODE;
        case "DASH":
            return DASH_NODE;
        default:
            return "blockcypher";
    }
};
const providers = {
    haskoin: {
        BTC: `https://api.haskoin.com/btc${BTC_NETWORK === "mainnet" ? "" : "test"}`,
    },
    blockcypher: {
        BTC: `https://api.blockcypher.com/v1/btc/${BTC_NETWORK === "mainnet" ? "main" : "test3"}`,
        LTC: "https://api.blockcypher.com/v1/ltc/main",
        DASH: "https://api.blockcypher.com/v1/dash/main",
        DOGE: "https://api.blockcypher.com/v1/doge/main",
    },
};
const watchAddressBlockCypher = (chain, address, callback) => {
    const network = chain === "BTC" ? (BTC_NETWORK === "mainnet" ? "main" : "test3") : "main";
    const ws = new ws_1.default(`wss://socket.blockcypher.com/v1/${chain.toLowerCase()}/${network}?token=${BLOCKCYPHER_TOKEN}`);
    ws.on("open", function open() {
        ws.send(JSON.stringify({ event: "unconfirmed-tx", address: address }));
    });
    ws.on("message", function incoming(data) {
        const messageString = data.toString();
        const message = JSON.parse(messageString);
        if (message && message.hash) {
            callback(message);
            (0, exports.cancelWatchAddress)(chain, address);
        }
    });
    ws.on("close", function close() {
        console_1.logger.info("UTXO", `WebSocket disconnected from ${chain} address: ${address}`);
    });
    ws.on("error", function error(err) {
        console_1.logger.error("UTXO", "Watch address error", err);
    });
    const wsKey = `${chain}_${address.toLowerCase()}`;
    wsConnections.set(wsKey, ws);
};
exports.watchAddressBlockCypher = watchAddressBlockCypher;
const cancelWatchAddress = (chain, address) => {
    const wsKey = `${chain}_${address.toLowerCase()}`;
    const ws = wsConnections.get(wsKey);
    if (ws) {
        try {
            ws.close();
            console_1.logger.info("UTXO", `WebSocket for ${chain} address ${address} has been successfully closed.`);
        }
        catch (error) {
            console_1.logger.error("UTXO", "Cancel watch address error", error);
        }
        finally {
            wsConnections.delete(wsKey);
        }
    }
    else {
        console_1.logger.info("UTXO", `No active WebSocket found for ${chain} address ${address}.`);
    }
};
exports.cancelWatchAddress = cancelWatchAddress;
async function createTransactionDetailsForUTXO(id, transaction, address, chain) {
    const txHash = transaction.hash;
    const inputs = transaction.inputs.map((input) => ({
        prevHash: input.prev_hash,
        outputIndex: input.output_index,
        value: (0, blockchain_1.satoshiToStandardUnit)(input.output_value, chain),
        addresses: input.addresses,
        script: input.script,
    }));
    const outputs = transaction.outputs
        .filter((output) => output.addresses.includes(address))
        .map((output) => ({
        value: (0, blockchain_1.satoshiToStandardUnit)(output.value, chain),
        addresses: output.addresses,
        script: output.script,
    }));
    const amount = outputs.reduce((acc, output) => acc + output.value, 0);
    const txDetails = {
        id,
        address,
        chain,
        hash: txHash,
        from: inputs.map((input) => input.addresses).flat(),
        to: outputs.map((output) => output.addresses).flat(),
        amount,
        inputs,
        outputs,
    };
    return txDetails;
}
async function recordUTXO(walletId, transactionId, index, amount, script, status) {
    await db_1.models.ecosystemUtxo.create({
        walletId: walletId,
        transactionId: transactionId,
        index: index,
        amount: amount,
        script: script,
        status: status,
    });
}
const constructApiUrl = (chain, operation, address = "", txHash = "", provider = "") => {
    if (provider === "")
        provider = getUtxoProvider(chain);
    switch (provider) {
        case "haskoin": {
            const haskoinBaseURL = providers.haskoin[chain];
            switch (operation) {
                case "fetchBalance":
                    return `${haskoinBaseURL}/address/${address}/balance`;
                case "fetchTransactions":
                    return `${haskoinBaseURL}/address/${address}/transactions/full`;
                case "fetchTransaction":
                    return `${haskoinBaseURL}/transaction/${txHash}`;
                case "fetchRawTransaction":
                    return `${haskoinBaseURL}/transaction/${txHash}/raw`;
                case "broadcastTransaction":
                    return `${haskoinBaseURL}/transactions/full`;
                default:
                    throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported operation for Haskoin: ${operation}` });
            }
        }
        case "blockcypher":
        default: {
            const blockcypherBaseURL = providers.blockcypher[chain];
            switch (operation) {
                case "fetchBalance":
                    return `${blockcypherBaseURL}/addrs/${address}/balance`;
                case "fetchTransactions":
                    return `${blockcypherBaseURL}/addrs/${address}`;
                case "fetchTransaction":
                    return `${blockcypherBaseURL}/txs/${txHash}`;
                case "fetchRawTransaction":
                    return `${blockcypherBaseURL}/txs/${txHash}?includeHex=true`;
                case "broadcastTransaction":
                    return `${blockcypherBaseURL}/txs/push`;
                default:
                    throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported operation for BlockCypher: ${operation}` });
            }
        }
    }
};
const fetchFromApi = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!data || typeof data !== "object") {
            throw (0, error_1.createError)({ statusCode: 500, message: "Invalid response structure" });
        }
        return data;
    }
    catch (error) {
        console_1.logger.error("UTXO", "Fetch from API error", error);
        throw error;
    }
};
const createUTXOWallet = (chain) => {
    const network = getUtxoNetwork(chain);
    if (!network) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported UTXO chain: ${chain}` });
    }
    const keyPair = ECPair.makeRandom({ network });
    const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network,
    });
    if (chain === "BTC" && network === bitcoin.networks.testnet) {
        assert.strictEqual(address.startsWith("m") || address.startsWith("n"), true);
    }
    const privateKey = keyPair.toWIF();
    return {
        address,
        data: {
            privateKey,
        },
    };
};
exports.createUTXOWallet = createUTXOWallet;
const fetchUTXOTransactions = async (chain, address) => {
    try {
        const provider = await (0, UTXOProviderFactory_1.getUTXOProvider)(chain);
        console_1.logger.info("UTXO", `Using ${provider.getName()} for fetching transactions`);
        return await provider.fetchTransactions(address);
    }
    catch (error) {
        console_1.logger.error("UTXO", "Fetch transactions error", error);
        return [];
    }
};
exports.fetchUTXOTransactions = fetchUTXOTransactions;
const fetchUTXOWalletBalance = async (chain, address) => {
    try {
        const provider = await (0, UTXOProviderFactory_1.getUTXOProvider)(chain);
        const balanceSatoshis = await provider.getBalance(address);
        return (0, blockchain_1.satoshiToStandardUnit)(balanceSatoshis, chain);
    }
    catch (error) {
        console_1.logger.error("UTXO", "Fetch wallet balance error", error);
        return 0;
    }
};
exports.fetchUTXOWalletBalance = fetchUTXOWalletBalance;
const fetchRawUtxoTransaction = async (txHash, chain) => {
    try {
        const provider = await (0, UTXOProviderFactory_1.getUTXOProvider)(chain);
        return await provider.fetchRawTransaction(txHash);
    }
    catch (error) {
        console_1.logger.error("UTXO", "Fetch raw transaction error", error);
        throw error;
    }
};
exports.fetchRawUtxoTransaction = fetchRawUtxoTransaction;
const fetchUtxoTransaction = async (txHash, chain) => {
    try {
        const provider = await (0, UTXOProviderFactory_1.getUTXOProvider)(chain);
        return await provider.fetchTransaction(txHash);
    }
    catch (error) {
        console_1.logger.error("UTXO", "Fetch transaction error", error);
        return null;
    }
};
exports.fetchUtxoTransaction = fetchUtxoTransaction;
function formatTransactionData(data, provider) {
    var _a;
    switch (provider) {
        case "haskoin":
            return {
                hash: data.txid,
                block_height: (_a = data.block) === null || _a === void 0 ? void 0 : _a.height,
                inputs: data.inputs,
                outputs: data.outputs.map((output) => ({
                    addresses: [output.addresses],
                    script: output.pkscript,
                    value: output.value,
                    spent: output.spent,
                    spender: output.spender,
                })),
            };
        case "blockcypher":
        default:
            return {
                hash: data.hash,
                block_height: data.block_height,
                inputs: data.inputs,
                outputs: data.outputs.map((output) => ({
                    addresses: output.addresses,
                    script: output.script,
                    value: output.value,
                    spender: output.spent_by,
                })),
            };
    }
}
const verifyUTXOTransaction = async (chain, txHash) => {
    const url = constructApiUrl(chain, "fetchTransaction", "", txHash);
    const startTime = Date.now();
    const maxDuration = 1800 * 1000;
    const retryInterval = 30 * 1000;
    const provider = getUtxoProvider(chain);
    while (Date.now() - startTime < maxDuration) {
        try {
            const txData = await fetchFromApi(url);
            let confirmed = false;
            let fee = 0;
            switch (provider) {
                case "haskoin":
                    confirmed = !!txData.block;
                    fee = txData.fee;
                    break;
                case "blockcypher":
                default:
                    confirmed = txData.confirmations >= 1;
                    fee = txData.fee ? (0, blockchain_1.satoshiToStandardUnit)(txData.fee, chain) : 0;
                    break;
            }
            if (confirmed) {
                return { confirmed, fee };
            }
        }
        catch (error) {
            console_1.logger.error("UTXO", "Verify transaction error", error);
        }
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
    return { confirmed: false, fee: 0 };
};
exports.verifyUTXOTransaction = verifyUTXOTransaction;
const broadcastRawUtxoTransaction = async (rawTxHex, chain) => {
    if (!rawTxHex) {
        console_1.logger.error("UTXO", "Error broadcasting transaction: No transaction data provided");
        return {
            success: false,
            error: "No transaction data provided",
            txid: null,
        };
    }
    try {
        const provider = await (0, UTXOProviderFactory_1.getUTXOProvider)(chain);
        console_1.logger.info("UTXO", `Broadcasting transaction using ${provider.getName()}`);
        return await provider.broadcastTransaction(rawTxHex);
    }
    catch (error) {
        console_1.logger.error("UTXO", "Broadcast transaction error", error);
        return { success: false, error: error.message, txid: null };
    }
};
exports.broadcastRawUtxoTransaction = broadcastRawUtxoTransaction;
const calculateUTXOFee = async (toAddress, amount, chain) => {
    const feeRatePerByte = await getCurrentUtxoFeeRatePerByte(chain);
    if (!feeRatePerByte) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch current fee rate" });
    }
    const inputs = [];
    const outputs = [];
    let totalInputValue = 0;
    const utxos = await db_1.models.ecosystemUtxo.findAll({
        where: { status: false },
        order: [["amount", "DESC"]],
    });
    if (utxos.length === 0)
        throw (0, error_1.createError)({ statusCode: 400, message: "No UTXOs available for withdrawal" });
    for (const utxo of utxos) {
        inputs.push(utxo);
        totalInputValue += utxo.amount;
        if (totalInputValue >= amount) {
            break;
        }
    }
    outputs.push({ toAddress, amount });
    const estimatedTxSize = inputs.length * 180 + outputs.length * 34 + 10;
    const transactionFee = estimatedTxSize * feeRatePerByte;
    return transactionFee;
};
exports.calculateUTXOFee = calculateUTXOFee;
async function getCurrentUtxoFeeRatePerByte(chain) {
    try {
        const provider = await (0, UTXOProviderFactory_1.getUTXOProvider)(chain);
        return await provider.getFeeRate();
    }
    catch (error) {
        console_1.logger.error("UTXO", "Get fee rate error", error);
        return 1;
    }
}
async function handleUTXOWithdrawal(transaction) {
    const metadata = typeof transaction.metadata === "string"
        ? JSON.parse(transaction.metadata)
        : transaction.metadata;
    const chain = metadata.chain;
    const toAddress = metadata.toAddress;
    const amountToSend = (0, blockchain_1.standardUnitToSatoshi)(transaction.amount, chain);
    const flatFee = (0, blockchain_1.standardUnitToSatoshi)(transaction.fee, chain);
    const wallet = await db_1.models.wallet.findByPk(transaction.walletId);
    if (!wallet)
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    const validationResult = await calculateMinimumWithdrawal(wallet.id, chain, transaction.amount);
    if (!validationResult.isEconomical) {
        console_1.logger.warn("UTXO", `Withdrawal validation failed: ${JSON.stringify(validationResult)}`);
        const shouldConsolidate = await shouldAutoConsolidateUTXOs(wallet.id, chain);
        if (shouldConsolidate.shouldConsolidate) {
            console_1.logger.info("UTXO", `Auto consolidation triggered for wallet ${wallet.id}, chain ${chain}: ${shouldConsolidate.reason}`);
            const consolidationResult = await consolidateUTXOs(wallet.id, chain, 10);
            if (consolidationResult.success) {
                console_1.logger.success("UTXO", `Auto consolidation success: ${consolidationResult.message}`);
                console_1.logger.info("UTXO", `Waiting for consolidation transaction to confirm...`);
                const confirmationResult = await (0, exports.verifyUTXOTransaction)(chain, consolidationResult.txid);
                if (!confirmationResult.confirmed) {
                    throw (0, error_1.createError)({ statusCode: 500, message: `Consolidation transaction ${consolidationResult.txid} failed to confirm within 30 minutes. Please try withdrawal again later.` });
                }
                console_1.logger.success("UTXO", `Auto consolidation transaction confirmed. Fee: ${confirmationResult.fee} ${chain}`);
                const revalidationResult = await calculateMinimumWithdrawal(wallet.id, chain, transaction.amount);
                if (!revalidationResult.isEconomical) {
                    throw (0, error_1.createError)({ statusCode: 400, message: `Even after consolidation: ${revalidationResult.reason}` });
                }
                console_1.logger.info("UTXO", `After consolidation: withdrawal now requires ${revalidationResult.utxoCount} UTXOs`);
            }
            else {
                console_1.logger.warn("UTXO", `Auto consolidation failed: ${consolidationResult.message}`);
                throw (0, error_1.createError)({ statusCode: 400, message: `${validationResult.reason}. Consolidation attempt failed: ${consolidationResult.message}` });
            }
        }
        else {
            throw (0, error_1.createError)({ statusCode: 400, message: validationResult.reason });
        }
    }
    else {
        console_1.logger.info("UTXO", `Withdrawal validation passed: requires ${validationResult.utxoCount} UTXOs`);
    }
    const masterWallet = (await (0, wallet_1.getMasterWalletByChain)(chain));
    if (!masterWallet)
        throw (0, error_1.createError)({ statusCode: 404, message: `Master wallet not found for ${chain}` });
    const network = getUtxoNetwork(chain);
    if (!network)
        throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported UTXO chain: ${chain}` });
    const currentFeeRatePerByte = await getCurrentUtxoFeeRatePerByte(chain);
    if (!currentFeeRatePerByte) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to fetch current fee rate" });
    }
    const dustThreshold = getDustThreshold(chain);
    if (amountToSend < dustThreshold) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Amount to send (${amountToSend} satoshis) is below the dust threshold of ${dustThreshold} satoshis.` });
    }
    let retryCount = 0;
    const maxRetries = 3;
    while (retryCount < maxRetries) {
        const dbTransaction = await db_1.sequelize.transaction({
            isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            const utxos = await db_1.models.ecosystemUtxo.findAll({
                where: { status: false, walletId: wallet.id },
                order: [["amount", "DESC"]],
                lock: sequelize_1.Transaction.LOCK.UPDATE,
                transaction: dbTransaction,
            });
            if (utxos.length === 0) {
                await dbTransaction.rollback();
                throw (0, error_1.createError)({ statusCode: 400, message: "No UTXOs available for withdrawal" });
            }
            try {
                const { success, txid } = await createAndBroadcastTransaction(utxos, wallet, transaction, amountToSend, flatFee, currentFeeRatePerByte, dustThreshold, chain, network, toAddress, dbTransaction);
                if (success) {
                    await dbTransaction.commit();
                    await db_1.models.transaction.update({
                        status: "COMPLETED",
                        description: `Withdrawal of ${transaction.amount} ${wallet.currency} to ${toAddress}`,
                        trxId: txid,
                    }, {
                        where: { id: transaction.id },
                    });
                    return { success: true, txid };
                }
                else {
                    await dbTransaction.rollback();
                    throw (0, error_1.createError)({ statusCode: 500, message: "Transaction failed without specific error" });
                }
            }
            catch (error) {
                await dbTransaction.rollback();
                if (error instanceof TransactionBroadcastedError) {
                    await db_1.models.transaction.update({
                        status: "COMPLETED",
                        description: `Withdrawal of ${transaction.amount} ${wallet.currency} to ${toAddress}`,
                        trxId: error.txid,
                    }, {
                        where: { id: transaction.id },
                    });
                    console_1.logger.error("UTXO", "Post-broadcast error", error);
                    return { success: true, txid: error.txid };
                }
                else if (error.message.includes("already been spent") ||
                    error.message.includes("Missing inputs") ||
                    error.message.includes("bad-txns-inputs-spent")) {
                    await markSpentUtxosFromError(error, chain, wallet.id);
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to broadcast transaction after ${maxRetries} attempts due to spent UTXOs.` });
                    }
                    continue;
                }
                else {
                    throw (0, error_1.createError)({ statusCode: 500, message: `Failed to broadcast transaction: ${error.message}` });
                }
            }
        }
        catch (outerError) {
            if (outerError.message === "No UTXOs available for withdrawal") {
                throw outerError;
            }
            throw outerError;
        }
    }
}
async function createAndBroadcastTransaction(utxos, wallet, transaction, amountToSend, flatFee, currentFeeRatePerByte, dustThreshold, chain, network, toAddress, dbTransaction) {
    const psbt = new bitcoin.Psbt({ network });
    let totalInputValue = 0;
    const keyPairs = [];
    for (const utxo of utxos) {
        const walletData = (await db_1.models.walletData.findOne({
            where: { walletId: utxo.walletId },
        }));
        if (!walletData)
            continue;
        const decryptedData = JSON.parse((0, encrypt_1.decrypt)(walletData.data));
        if (!decryptedData.privateKey)
            continue;
        const rawTxHex = await (0, exports.fetchRawUtxoTransaction)(utxo.transactionId, chain);
        psbt.addInput({
            hash: utxo.transactionId,
            index: utxo.index,
            nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
        });
        const utxoAmountInSatoshis = (0, blockchain_1.standardUnitToSatoshi)(utxo.amount, chain);
        totalInputValue += utxoAmountInSatoshis;
        const keyPair = ECPair.fromWIF(decryptedData.privateKey, network);
        keyPairs.push({ index: psbt.inputCount - 1, keyPair });
        const numInputs = psbt.inputCount;
        const numOutputs = 2;
        const estimatedTxSize = numInputs * 180 + numOutputs * 34 + 10;
        let transactionFee = Math.ceil(estimatedTxSize * currentFeeRatePerByte);
        let requiredAmount = amountToSend + transactionFee;
        let change = totalInputValue - requiredAmount;
        console_1.logger.debug("UTXO", `Input #${psbt.inputCount}: utxo=${utxoAmountInSatoshis}, total=${totalInputValue}, amount=${amountToSend}, fee=${transactionFee}, required=${requiredAmount}, change=${change}`);
        const isChangeDust = change > 0 && change < dustThreshold;
        if (isChangeDust) {
            console_1.logger.debug("UTXO", `Change is dust (${change} < ${dustThreshold}), adding to fee`);
            transactionFee += change;
            requiredAmount += change;
            change = 0;
        }
        requiredAmount = amountToSend + transactionFee;
        change = totalInputValue - requiredAmount;
        console_1.logger.debug("UTXO", `After dust adjustment: required=${requiredAmount}, change=${change}, hasEnough=${totalInputValue >= requiredAmount}`);
        if (totalInputValue >= requiredAmount) {
            const outputs = [];
            outputs.push({
                address: toAddress,
                value: BigInt(amountToSend),
            });
            if (change > 0) {
                outputs.push({
                    address: getChangeAddress(wallet, chain),
                    value: BigInt(change),
                });
            }
            outputs.forEach((output) => {
                psbt.addOutput(output);
            });
            keyPairs.forEach(({ index, keyPair }) => {
                psbt.signInput(index, keyPair);
            });
            psbt.finalizeAllInputs();
            const rawTx = psbt.extractTransaction().toHex();
            const broadcastResult = await (0, exports.broadcastRawUtxoTransaction)(rawTx, chain);
            if (!broadcastResult.success) {
                throw (0, error_1.createError)({ statusCode: 500, message: `Failed to broadcast transaction: ${broadcastResult.error}` });
            }
            if (broadcastResult.success) {
                const txid = broadcastResult.txid;
                try {
                    if (change > 0) {
                        await recordChangeUtxo(txid, change, wallet, chain, dbTransaction);
                    }
                    await markUsedUtxos(psbt, utxos, dbTransaction);
                    return { success: true, txid };
                }
                catch (postBroadcastError) {
                    console_1.logger.error("UTXO", "Post-broadcast error", postBroadcastError);
                    return { success: true, txid };
                }
            }
            else {
                throw (0, error_1.createError)({ statusCode: 500, message: `Failed to broadcast transaction: ${broadcastResult.error}` });
            }
        }
    }
    throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds to cover the amount and transaction fee" });
}
function getChangeAddress(wallet, chain) {
    var _a;
    const walletAddresses = typeof wallet.address === "string"
        ? JSON.parse(wallet.address)
        : wallet.address;
    if (!walletAddresses)
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet addresses not found" });
    if (!(walletAddresses === null || walletAddresses === void 0 ? void 0 : walletAddresses[chain]))
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet address chain not found" });
    if (!((_a = walletAddresses === null || walletAddresses === void 0 ? void 0 : walletAddresses[chain]) === null || _a === void 0 ? void 0 : _a.address))
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet address not found" });
    return walletAddresses[chain].address;
}
async function markUsedUtxos(psbt, utxos, dbTransaction) {
    if (!psbt || !utxos) {
        console_1.logger.error("UTXO", "Cannot mark used UTXOs: psbt or utxos is undefined");
        return;
    }
    for (let i = 0; i < psbt.inputCount; i++) {
        const input = psbt.txInputs[i];
        if (!input || !input.hash || input.index === undefined) {
            console_1.logger.error("UTXO", `Input at index ${i} is undefined or missing properties`);
            continue;
        }
        const txid = Buffer.from(input.hash).reverse().toString("hex");
        const index = input.index;
        const utxo = utxos.find((u) => u.transactionId === txid && u.index === index);
        if (utxo) {
            const updateOptions = {
                where: { id: utxo.id },
            };
            if (dbTransaction) {
                updateOptions.transaction = dbTransaction;
            }
            await db_1.models.ecosystemUtxo.update({ status: true }, updateOptions);
        }
        else {
            console_1.logger.error("UTXO", `UTXO not found for transaction ${txid} index ${index}`);
        }
    }
}
async function recordChangeUtxo(txid, changeAmount, wallet, chain, dbTransaction) {
    if (!txid) {
        console_1.logger.error("UTXO", "Cannot record change UTXO: txid is undefined");
        return;
    }
    const changeTxData = await (0, exports.fetchUtxoTransaction)(txid, chain);
    if (!changeTxData || !changeTxData.outputs) {
        console_1.logger.error("UTXO", "Change transaction data is undefined or invalid");
        return;
    }
    const changeAddress = getChangeAddress(wallet, chain);
    const changeOutput = changeTxData.outputs.find((output) => output.addresses && output.addresses.includes(changeAddress));
    if (changeOutput) {
        const changeOutputIndex = changeTxData.outputs.indexOf(changeOutput);
        const changeScript = changeOutput.script;
        const changeAmountInStandardUnits = (0, blockchain_1.satoshiToStandardUnit)(changeAmount, chain);
        const createOptions = {
            walletId: wallet.id,
            transactionId: txid,
            index: changeOutputIndex,
            amount: changeAmountInStandardUnits,
            script: changeScript,
            status: false,
        };
        if (dbTransaction) {
            await db_1.models.ecosystemUtxo.create(createOptions, { transaction: dbTransaction });
        }
        else {
            await db_1.models.ecosystemUtxo.create(createOptions);
        }
    }
    else {
        console_1.logger.error("UTXO", "Change output not found in transaction data");
    }
}
async function markSpentUtxosFromError(error, chain, walletId) {
    const spentUtxos = parseSpentUtxosFromError(error.message);
    if (spentUtxos.length === 0) {
        await markSpentUtxos(chain, walletId);
    }
    else {
        for (const spentUtxo of spentUtxos) {
            const utxo = await db_1.models.ecosystemUtxo.findOne({
                where: {
                    transactionId: spentUtxo.transactionId,
                },
            });
            if (utxo) {
                await db_1.models.ecosystemUtxo.update({ status: true }, {
                    where: { id: utxo.id },
                });
                console_1.logger.info("UTXO", `Marked UTXO as spent: txId=${spentUtxo.transactionId}, index=${spentUtxo.index}`);
            }
            else {
                console_1.logger.error("UTXO", `UTXO not found in database for transaction ${spentUtxo.transactionId} index ${spentUtxo.index}`);
            }
        }
    }
}
function parseSpentUtxosFromError(errorMessage) {
    const spentUtxos = [];
    const regex = /Transaction ([a-f0-9]{64}) referenced by input (\d+) of [a-f0-9]{64} has already been spent/gi;
    let match;
    while ((match = regex.exec(errorMessage)) !== null) {
        const transactionId = match[1];
        const index = parseInt(match[2]);
        spentUtxos.push({ transactionId, index });
    }
    return spentUtxos;
}
async function markSpentUtxos(chain, walletId) {
    const utxos = await db_1.models.ecosystemUtxo.findAll({
        where: {
            status: false,
            walletId: walletId,
        },
    });
    for (const utxo of utxos) {
        try {
            const txData = await (0, exports.fetchUtxoTransaction)(utxo.transactionId, chain);
            const output = txData.outputs[utxo.index];
            const isSpent = output.spent || output.spender;
            if (isSpent) {
                await db_1.models.ecosystemUtxo.update({ status: true }, {
                    where: { id: utxo.id },
                });
            }
        }
        catch (error) {
        }
    }
}
async function shouldAutoConsolidateUTXOs(walletId, chain) {
    const utxos = await db_1.models.ecosystemUtxo.findAll({
        where: { status: false, walletId: walletId },
        order: [["amount", "ASC"]],
    });
    if (utxos.length < 2) {
        return {
            shouldConsolidate: false,
            reason: "Not enough UTXOs to warrant consolidation (need at least 2)"
        };
    }
    const currentFeeRate = await getCurrentUtxoFeeRatePerByte(chain);
    if (!currentFeeRate) {
        return {
            shouldConsolidate: false,
            reason: "Cannot fetch fee rate"
        };
    }
    const totalValue = utxos.reduce((sum, utxo) => {
        return sum + (0, blockchain_1.standardUnitToSatoshi)(utxo.amount, chain);
    }, 0);
    const avgUtxoSize = totalValue / utxos.length;
    const costPerInput = 180 * currentFeeRate;
    if (avgUtxoSize < costPerInput * 3) {
        return {
            shouldConsolidate: true,
            reason: `${utxos.length} UTXOs with avg size ${(0, blockchain_1.satoshiToStandardUnit)(avgUtxoSize, chain)} ${chain} (cost to spend: ${(0, blockchain_1.satoshiToStandardUnit)(costPerInput, chain)} ${chain}). Consolidation will reduce future fees.`
        };
    }
    if (utxos.length >= 10) {
        return {
            shouldConsolidate: true,
            reason: `${utxos.length} UTXOs detected. Consolidation will improve wallet efficiency.`
        };
    }
    return {
        shouldConsolidate: false,
        reason: "UTXOs are large enough, no consolidation needed"
    };
}
async function calculateMinimumWithdrawal(walletId, chain, requestedAmount) {
    const requestedAmountSats = (0, blockchain_1.standardUnitToSatoshi)(requestedAmount, chain);
    const currentFeeRate = await getCurrentUtxoFeeRatePerByte(chain);
    if (!currentFeeRate) {
        return {
            isEconomical: false,
            minAmount: 0,
            reason: "Failed to fetch current fee rate",
            utxoCount: 0
        };
    }
    const utxos = await db_1.models.ecosystemUtxo.findAll({
        where: { status: false, walletId: walletId },
        order: [["amount", "DESC"]],
    });
    if (utxos.length === 0) {
        return {
            isEconomical: false,
            minAmount: 0,
            reason: "No UTXOs available",
            utxoCount: 0
        };
    }
    const dustThreshold = getDustThreshold(chain);
    let totalInputValue = 0;
    let inputCount = 0;
    for (const utxo of utxos) {
        inputCount++;
        const utxoAmountSats = (0, blockchain_1.standardUnitToSatoshi)(utxo.amount, chain);
        totalInputValue += utxoAmountSats;
        const estimatedTxSize = inputCount * 180 + 2 * 34 + 10;
        const transactionFee = Math.ceil(estimatedTxSize * currentFeeRate);
        const requiredAmount = requestedAmountSats + transactionFee;
        if (totalInputValue >= requiredAmount) {
            const change = totalInputValue - requiredAmount;
            if (change > 0 && change < dustThreshold) {
                const adjustedRequired = requestedAmountSats + transactionFee + change;
                if (totalInputValue >= adjustedRequired) {
                    return {
                        isEconomical: true,
                        minAmount: requestedAmount,
                        reason: "Withdrawal is economical",
                        utxoCount: inputCount
                    };
                }
            }
            else {
                return {
                    isEconomical: true,
                    minAmount: requestedAmount,
                    reason: "Withdrawal is economical",
                    utxoCount: inputCount
                };
            }
        }
    }
    const finalTxSize = utxos.length * 180 + 2 * 34 + 10;
    const finalFee = Math.ceil(finalTxSize * currentFeeRate);
    const maxPossibleWithdrawal = totalInputValue - finalFee;
    if (maxPossibleWithdrawal <= 0) {
        return {
            isEconomical: false,
            minAmount: 0,
            reason: `UTXOs too small for any withdrawal. Total value: ${(0, blockchain_1.satoshiToStandardUnit)(totalInputValue, chain)} ${chain}, estimated fee: ${(0, blockchain_1.satoshiToStandardUnit)(finalFee, chain)} ${chain}. Consider consolidating UTXOs when fees are lower.`,
            utxoCount: utxos.length
        };
    }
    return {
        isEconomical: false,
        minAmount: (0, blockchain_1.satoshiToStandardUnit)(maxPossibleWithdrawal, chain),
        reason: `Insufficient funds. Maximum possible withdrawal: ${(0, blockchain_1.satoshiToStandardUnit)(maxPossibleWithdrawal, chain)} ${chain}. Consider consolidating UTXOs to reduce fees.`,
        utxoCount: utxos.length
    };
}
async function consolidateUTXOs(walletId, chain, maxFeeRate = 2) {
    const currentFeeRate = await getCurrentUtxoFeeRatePerByte(chain);
    if (!currentFeeRate) {
        return {
            success: false,
            message: "Failed to fetch current fee rate"
        };
    }
    if (currentFeeRate > maxFeeRate) {
        return {
            success: false,
            message: `Current fee rate (${currentFeeRate} sat/byte) is too high for consolidation. Waiting for fees <= ${maxFeeRate} sat/byte.`
        };
    }
    const wallet = await db_1.models.wallet.findByPk(walletId);
    if (!wallet) {
        return {
            success: false,
            message: "Wallet not found"
        };
    }
    const masterWallet = (await (0, wallet_1.getMasterWalletByChain)(chain));
    if (!masterWallet) {
        return {
            success: false,
            message: `Master wallet not found for ${chain}`
        };
    }
    const network = getUtxoNetwork(chain);
    if (!network) {
        return {
            success: false,
            message: `Unsupported UTXO chain: ${chain}`
        };
    }
    const dbTransaction = await db_1.sequelize.transaction({
        isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
    try {
        const utxos = await db_1.models.ecosystemUtxo.findAll({
            where: { status: false, walletId: walletId },
            order: [["amount", "ASC"]],
            lock: sequelize_1.Transaction.LOCK.UPDATE,
            transaction: dbTransaction,
        });
        console_1.logger.info("UTXO", `Consolidation: Found ${utxos.length} available UTXOs for wallet ${walletId}`);
        if (utxos.length < 2) {
            await dbTransaction.rollback();
            return {
                success: false,
                message: `Not enough UTXOs to consolidate (need at least 2, found ${utxos.length})`
            };
        }
        const costPerInput = 180 * currentFeeRate;
        const utxoDustThreshold = getDustThreshold(chain);
        const smallUtxos = utxos.filter(utxo => {
            const utxoValueSats = (0, blockchain_1.standardUnitToSatoshi)(utxo.amount, chain);
            const isSmall = utxoValueSats < (costPerInput * 5);
            const isDust = utxoValueSats < utxoDustThreshold * 2;
            return isSmall || isDust;
        });
        if (smallUtxos.length < 2) {
            await dbTransaction.rollback();
            return {
                success: false,
                message: `No small UTXOs to consolidate. All ${utxos.length} UTXOs are already efficiently sized.`
            };
        }
        const utxosToConsolidate = smallUtxos.slice(0, Math.min(50, smallUtxos.length));
        console_1.logger.info("UTXO", `Consolidation: Will consolidate ${utxosToConsolidate.length} small UTXOs (out of ${utxos.length} total). Keeping ${utxos.length - utxosToConsolidate.length} larger UTXOs separate.`);
        const psbt = new bitcoin.Psbt({ network });
        let totalInputValue = 0;
        const keyPairs = [];
        for (const utxo of utxosToConsolidate) {
            const walletData = (await db_1.models.walletData.findOne({
                where: { walletId: utxo.walletId },
            }));
            if (!walletData)
                continue;
            const decryptedData = JSON.parse((0, encrypt_1.decrypt)(walletData.data));
            if (!decryptedData.privateKey)
                continue;
            const rawTxHex = await (0, exports.fetchRawUtxoTransaction)(utxo.transactionId, chain);
            psbt.addInput({
                hash: utxo.transactionId,
                index: utxo.index,
                nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
            });
            const utxoAmountSats = (0, blockchain_1.standardUnitToSatoshi)(utxo.amount, chain);
            totalInputValue += utxoAmountSats;
            const keyPair = ECPair.fromWIF(decryptedData.privateKey, network);
            keyPairs.push({ index: psbt.inputCount - 1, keyPair });
        }
        const numInputs = psbt.inputCount;
        const numOutputs = 1;
        const estimatedTxSize = numInputs * 180 + numOutputs * 34 + 10;
        const transactionFee = Math.ceil(estimatedTxSize * currentFeeRate);
        const outputAmount = totalInputValue - transactionFee;
        const dustThreshold = getDustThreshold(chain);
        if (outputAmount < dustThreshold) {
            await dbTransaction.rollback();
            return {
                success: false,
                message: `Consolidation would result in dust output (${outputAmount} < ${dustThreshold} satoshis)`
            };
        }
        const changeAddress = getChangeAddress(wallet, chain);
        psbt.addOutput({
            address: changeAddress,
            value: BigInt(outputAmount),
        });
        keyPairs.forEach(({ index, keyPair }) => {
            psbt.signInput(index, keyPair);
        });
        psbt.finalizeAllInputs();
        const rawTx = psbt.extractTransaction().toHex();
        const broadcastResult = await (0, exports.broadcastRawUtxoTransaction)(rawTx, chain);
        if (!broadcastResult.success) {
            await dbTransaction.rollback();
            return {
                success: false,
                message: `Failed to broadcast consolidation: ${broadcastResult.error}`
            };
        }
        const txid = broadcastResult.txid;
        if (!txid) {
            await dbTransaction.rollback();
            return {
                success: false,
                message: "Failed to get transaction ID from broadcast result"
            };
        }
        await markUsedUtxos(psbt, utxosToConsolidate, dbTransaction);
        await recordChangeUtxo(txid, outputAmount, wallet, chain, dbTransaction);
        await dbTransaction.commit();
        console_1.logger.success("UTXO", `Consolidation: Successfully consolidated ${numInputs} UTXOs into 1. TxID: ${txid}`);
        return {
            success: true,
            txid,
            message: `Successfully consolidated ${numInputs} UTXOs (${(0, blockchain_1.satoshiToStandardUnit)(totalInputValue, chain)} ${chain}) into 1 UTXO (${(0, blockchain_1.satoshiToStandardUnit)(outputAmount, chain)} ${chain}). Fee: ${(0, blockchain_1.satoshiToStandardUnit)(transactionFee, chain)} ${chain}`
        };
    }
    catch (error) {
        await dbTransaction.rollback();
        console_1.logger.error("UTXO", "Consolidate UTXOs error", error);
        return {
            success: false,
            message: `Consolidation failed: ${error.message}`
        };
    }
}
function getDustThreshold(chain) {
    switch (chain) {
        case "BTC":
            return 546;
        case "LTC":
            return 1000;
        case "DOGE":
            return 100000000;
        case "DASH":
            return 546;
        default:
            throw (0, error_1.createError)({ statusCode: 400, message: `Unsupported UTXO chain: ${chain}` });
    }
}
