"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionVerificationService = void 0;
const ethers_1 = require("ethers");
const db_1 = require("@b/db");
const nft_blockchain_service_1 = require("./nft-blockchain-service");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class TransactionVerificationService {
    static async verifyTransactionExists(transactionHash, chain) {
        var _a;
        try {
            const blockchainService = await (0, nft_blockchain_service_1.getNFTBlockchainService)(chain);
            const isValid = await blockchainService.verifyTransaction(transactionHash);
            if (!isValid) {
                return {
                    isValid: false,
                    errorMessage: "Transaction not found or failed on blockchain"
                };
            }
            const provider = blockchainService.provider;
            const [tx, receipt] = await Promise.all([
                provider.getTransaction(transactionHash),
                provider.getTransactionReceipt(transactionHash)
            ]);
            if (!tx || !receipt) {
                return {
                    isValid: false,
                    errorMessage: "Transaction or receipt not found"
                };
            }
            const gasUsed = receipt.gasUsed;
            const gasPrice = tx.gasPrice || BigInt(0);
            const gasFee = ethers_1.ethers.formatEther(gasUsed * gasPrice);
            return {
                isValid: true,
                blockNumber: receipt.blockNumber,
                gasUsed: gasUsed.toString(),
                gasFee,
                from: tx.from.toLowerCase(),
                to: ((_a = tx.to) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "",
                value: ethers_1.ethers.formatEther(tx.value || BigInt(0))
            };
        }
        catch (error) {
            console_1.logger.error("NFT_VERIFICATION", "Failed to verify transaction exists", error);
            return {
                isValid: false,
                errorMessage: `Failed to verify transaction: ${error.message}`
            };
        }
    }
    static async verifyPurchaseTransaction(data) {
        try {
            const baseVerification = await this.verifyTransactionExists(data.transactionHash, data.chain);
            if (!baseVerification.isValid) {
                return baseVerification;
            }
            const errors = [];
            if (baseVerification.from !== data.expectedSender.toLowerCase()) {
                errors.push(`Transaction sender ${baseVerification.from} does not match expected buyer ${data.expectedSender.toLowerCase()}`);
            }
            if (data.expectedRecipient && baseVerification.to !== data.expectedRecipient.toLowerCase()) {
                errors.push(`Transaction recipient ${baseVerification.to} does not match expected recipient ${data.expectedRecipient.toLowerCase()}`);
            }
            const expectedValue = parseFloat(data.expectedAmount);
            const actualValue = parseFloat(baseVerification.value || "0");
            const tolerance = 0.001;
            if (Math.abs(actualValue - expectedValue) > tolerance) {
                errors.push(`Transaction value ${actualValue} ETH does not match expected amount ${expectedValue} ETH (tolerance: ${tolerance} ETH)`);
            }
            if (errors.length > 0) {
                return {
                    isValid: false,
                    errorMessage: `Transaction verification failed: ${errors.join("; ")}`
                };
            }
            return baseVerification;
        }
        catch (error) {
            console_1.logger.error("NFT_VERIFICATION", "Failed to verify purchase transaction", error);
            return {
                isValid: false,
                errorMessage: `Failed to verify purchase transaction: ${error.message}`
            };
        }
    }
    static async verifyBidTransaction(data) {
        try {
            const baseVerification = await this.verifyTransactionExists(data.transactionHash, data.chain);
            if (!baseVerification.isValid) {
                return baseVerification;
            }
            const errors = [];
            if (baseVerification.from !== data.expectedSender.toLowerCase()) {
                errors.push(`Transaction sender ${baseVerification.from} does not match expected bidder ${data.expectedSender.toLowerCase()}`);
            }
            if (data.auctionContract && baseVerification.to !== data.auctionContract.toLowerCase()) {
                errors.push(`Transaction recipient ${baseVerification.to} does not match auction contract ${data.auctionContract.toLowerCase()}`);
            }
            const expectedValue = parseFloat(data.expectedAmount);
            const actualValue = parseFloat(baseVerification.value || "0");
            const tolerance = 0.001;
            if (Math.abs(actualValue - expectedValue) > tolerance) {
                errors.push(`Transaction value ${actualValue} ETH does not match bid amount ${expectedValue} ETH (tolerance: ${tolerance} ETH)`);
            }
            if (errors.length > 0) {
                return {
                    isValid: false,
                    errorMessage: `Bid transaction verification failed: ${errors.join("; ")}`
                };
            }
            return baseVerification;
        }
        catch (error) {
            console_1.logger.error("NFT_VERIFICATION", "Failed to verify bid transaction", error);
            return {
                isValid: false,
                errorMessage: `Failed to verify bid transaction: ${error.message}`
            };
        }
    }
    static async isTransactionHashUsed(transactionHash) {
        try {
            const existingTransaction = await db_1.models.transaction.findOne({
                where: { trxId: transactionHash }
            });
            if (existingTransaction) {
                return true;
            }
            const existingActivity = await db_1.models.nftActivity.findOne({
                where: { transactionHash }
            });
            if (existingActivity) {
                return true;
            }
            const existingSale = await db_1.models.nftSale.findOne({
                where: { transactionHash }
            });
            if (existingSale) {
                return true;
            }
            const existingBid = await db_1.models.nftBid.findOne({
                where: { transactionHash }
            });
            return !!existingBid;
        }
        catch (error) {
            console_1.logger.error("NFT_VERIFICATION", "Failed to check if transaction hash is used", error);
            return true;
        }
    }
    static async validateNFTTransaction(transactionHash, chain, operationType, validationData) {
        const isUsed = await this.isTransactionHashUsed(transactionHash);
        if (isUsed) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Transaction hash has already been used"
            });
        }
        const verification = await this.verifyTransactionExists(transactionHash, chain);
        if (!verification.isValid) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: verification.errorMessage || "Transaction verification failed"
            });
        }
        if (operationType === "purchase" && validationData) {
            const purchaseVerification = await this.verifyPurchaseTransaction({
                transactionHash,
                chain,
                ...validationData
            });
            if (!purchaseVerification.isValid) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: purchaseVerification.errorMessage || "Purchase transaction validation failed"
                });
            }
        }
        if (operationType === "bid" && validationData) {
            const bidVerification = await this.verifyBidTransaction({
                transactionHash,
                chain,
                ...validationData
            });
            if (!bidVerification.isValid) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: bidVerification.errorMessage || "Bid transaction validation failed"
                });
            }
        }
    }
}
exports.TransactionVerificationService = TransactionVerificationService;
