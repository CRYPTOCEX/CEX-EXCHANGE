"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionVerificationService = void 0;
const ethers_1 = require("ethers");
const db_1 = require("@b/db");
const nft_blockchain_service_1 = require("./nft-blockchain-service");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const ERC721_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ERC1155_TRANSFER_SINGLE_TOPIC = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
const topicToAddress = (topic) => ("0x" + topic.slice(-40)).toLowerCase();
const wordToDecimal = (word) => BigInt(word).toString();
class TransactionVerificationService {
    static async verifyTransactionExists(transactionHash, chain) {
        var _a;
        try {
            const provider = await (0, nft_blockchain_service_1.getNFTReadProvider)(chain);
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
            if (receipt.status !== 1) {
                return {
                    isValid: false,
                    errorMessage: "Transaction reverted on blockchain"
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
            const tolerance = Math.max(Math.abs(expectedValue) * 0.001, 1e-9);
            if (Math.abs(actualValue - expectedValue) > tolerance) {
                errors.push(`Transaction value ${actualValue} does not match expected amount ${expectedValue} (tolerance: ${tolerance})`);
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
            const tolerance = Math.max(Math.abs(expectedValue) * 0.001, 1e-9);
            if (Math.abs(actualValue - expectedValue) > tolerance) {
                errors.push(`Transaction value ${actualValue} does not match bid amount ${expectedValue} (tolerance: ${tolerance})`);
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
    static async verifyNftTransfer(transactionHash, chain, expected) {
        var _a;
        var _b, _c, _d, _e;
        const used = await this.isTransactionHashUsed(transactionHash);
        if (used) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Transaction hash has already been used"
            });
        }
        let receipt;
        try {
            const provider = await (0, nft_blockchain_service_1.getNFTReadProvider)(chain);
            receipt = await provider.getTransactionReceipt(transactionHash);
        }
        catch (error) {
            console_1.logger.error("NFT_VERIFICATION", "Failed to read transfer receipt", error);
            throw (0, error_1.createError)({
                statusCode: 503,
                message: `Could not reach the ${chain} chain to verify the transfer: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "provider unavailable"}`
            });
        }
        if (!receipt) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Transfer verification failed: transaction not found on chain"
            });
        }
        if (receipt.status !== 1) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Transfer verification failed: transaction reverted on chain"
            });
        }
        const contract = expected.contractAddress.toLowerCase();
        const from = expected.expectedFrom.toLowerCase();
        const to = expected.expectedTo.toLowerCase();
        const tokenId = String(expected.blockchainTokenId);
        const isErc1155 = ((_c = expected.standard) !== null && _c !== void 0 ? _c : "").toUpperCase() === "ERC1155";
        const match = ((_d = receipt.logs) !== null && _d !== void 0 ? _d : []).some((log) => {
            var _a, _b;
            var _c, _d, _e;
            if (((_c = log.address) !== null && _c !== void 0 ? _c : "").toLowerCase() !== contract)
                return false;
            const topics = (_d = log.topics) !== null && _d !== void 0 ? _d : [];
            if (isErc1155) {
                if (((_a = topics[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== ERC1155_TRANSFER_SINGLE_TOPIC)
                    return false;
                if (topics.length < 4)
                    return false;
                if (topicToAddress(topics[2]) !== from)
                    return false;
                if (topicToAddress(topics[3]) !== to)
                    return false;
                const data = (_e = log.data) !== null && _e !== void 0 ? _e : "0x";
                if (data.length < 66)
                    return false;
                return wordToDecimal("0x" + data.slice(2, 66)) === tokenId;
            }
            if (((_b = topics[0]) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== ERC721_TRANSFER_TOPIC)
                return false;
            if (topics.length < 4)
                return false;
            if (topicToAddress(topics[1]) !== from)
                return false;
            if (topicToAddress(topics[2]) !== to)
                return false;
            return wordToDecimal(topics[3]) === tokenId;
        });
        if (!match) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Transfer verification failed: transaction ${transactionHash} contains no transfer of token ` +
                    `${tokenId} on ${expected.contractAddress} from ${expected.expectedFrom} to ${expected.expectedTo}`
            });
        }
        return {
            blockNumber: receipt.blockNumber,
            gasUsed: (_e = (_a = receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _e !== void 0 ? _e : "0",
        };
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
