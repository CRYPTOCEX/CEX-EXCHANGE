"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTransaction = processTransaction;
exports.createTransactionDetails = createTransactionDetails;
const ethers_1 = require("ethers");
const deposit_1 = require("@b/api/(ext)/ecosystem/utils/redis/deposit");
const blockchain_1 = require("@b/api/(ext)/ecosystem/utils/blockchain");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
async function processTransaction(contractType, txHash, provider, address, chain, decimals, feeDecimals, walletId) {
    if (!txHash || !provider || !address || !chain || !walletId) {
        console_1.logger.error("DEPOSIT", `Invalid parameters for processTransaction: txHash=${txHash}, address=${address}, chain=${chain}, walletId=${walletId}`);
        return false;
    }
    try {
        console_1.logger.info("DEPOSIT", `Processing ${contractType} transaction ${txHash} on ${chain}`);
        const tx = await provider.getTransaction(txHash);
        if (!tx) {
            console_1.logger.error("DEPOSIT", `Transaction ${txHash} not found on ${chain}`);
            return false;
        }
        if (!tx.data) {
            console_1.logger.error("DEPOSIT", `Transaction ${txHash} has no data field`);
            return false;
        }
        const decodedData = (0, blockchain_1.decodeTransactionData)(tx.data);
        const realTo = decodedData.to || tx.to;
        const amount = decodedData.amount || tx.value;
        if (!realTo || !address) {
            console_1.logger.error("DEPOSIT", `Invalid transaction data for ${txHash}: realTo=${realTo}, address=${address}`);
            return false;
        }
        if (realTo.toLowerCase() !== address.toLowerCase()) {
            console_1.logger.warn("DEPOSIT", `Address mismatch for ${txHash}: expected=${address}, actual=${realTo}`);
            return false;
        }
        if (!amount || amount.toString() === "0") {
            console_1.logger.warn("DEPOSIT", `Zero or invalid amount for transaction ${txHash}`);
            return false;
        }
        const txDetails = await createTransactionDetails(contractType, walletId, tx, realTo, chain, decimals, feeDecimals, "DEPOSIT", amount);
        await (0, deposit_1.storeAndBroadcastTransaction)(txDetails, txHash);
        console_1.logger.success("DEPOSIT", `Transaction ${txHash} processed successfully on ${chain}`);
        return true;
    }
    catch (error) {
        console_1.logger.error("DEPOSIT", `Error processing transaction ${txHash} on ${chain}: ${error.message}`);
        return false;
    }
}
async function createTransactionDetails(contractType, walletId, tx, toAddress, chain, decimals, feeDecimals, type, amount = tx.amount) {
    var _a;
    try {
        if (!contractType || !walletId || !tx || !toAddress || !chain || !type) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Missing required parameters for createTransactionDetails"
            });
        }
        if (decimals < 0 || decimals > 18) {
            console_1.logger.warn("DEPOSIT", `Unusual decimals value: ${decimals} for chain ${chain}`);
        }
        if (feeDecimals < 0 || feeDecimals > 18) {
            console_1.logger.warn("DEPOSIT", `Unusual fee decimals value: ${feeDecimals} for chain ${chain}`);
        }
        let formattedAmount = "0";
        try {
            if (amount && amount.toString() !== "0") {
                formattedAmount = ethers_1.ethers.formatUnits(amount.toString(), decimals);
                if (isNaN(parseFloat(formattedAmount)) ||
                    parseFloat(formattedAmount) <= 0) {
                    console_1.logger.warn("DEPOSIT", `Invalid formatted amount ${formattedAmount} for transaction ${tx.hash}`);
                    formattedAmount = "0";
                }
            }
        }
        catch (error) {
            console_1.logger.error("DEPOSIT", `Error formatting amount for transaction ${tx.hash}: ${error.message}`);
            formattedAmount = "0";
        }
        let formattedGasLimit = "N/A";
        try {
            if (tx.gasLimit) {
                formattedGasLimit = tx.gasLimit.toString();
            }
        }
        catch (error) {
            console_1.logger.warn("DEPOSIT", `Error formatting gas limit for transaction ${tx.hash}: ${error.message}`);
        }
        let formattedGasPrice = "N/A";
        try {
            if (tx.gasPrice) {
                formattedGasPrice = ethers_1.ethers.formatUnits(tx.gasPrice.toString(), feeDecimals);
                if (isNaN(parseFloat(formattedGasPrice)) ||
                    parseFloat(formattedGasPrice) < 0) {
                    console_1.logger.warn("DEPOSIT", `Invalid gas price ${formattedGasPrice} for transaction ${tx.hash}`);
                    formattedGasPrice = "N/A";
                }
            }
        }
        catch (error) {
            console_1.logger.warn("DEPOSIT", `Error formatting gas price for transaction ${tx.hash}: ${error.message}`);
        }
        const txDetails = {
            contractType,
            id: walletId,
            chain,
            hash: tx.hash,
            type,
            from: tx.from || "unknown",
            to: toAddress,
            amount: formattedAmount,
            gasLimit: formattedGasLimit,
            gasPrice: formattedGasPrice,
            timestamp: Math.floor(Date.now() / 1000),
            blockNumber: ((_a = tx.blockNumber) === null || _a === void 0 ? void 0 : _a.toString()) || "0",
            status: "PENDING",
        };
        console_1.logger.debug("DEPOSIT", `Created transaction details for ${tx.hash}: amount=${formattedAmount}, chain=${chain}`);
        return txDetails;
    }
    catch (error) {
        console_1.logger.error("DEPOSIT", `Error creating transaction details: ${error.message}`);
        throw error;
    }
}
