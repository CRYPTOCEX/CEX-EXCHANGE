"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainRecoveryService = void 0;
exports.getBlockchainRecoveryService = getBlockchainRecoveryService;
exports.startTransactionMonitoring = startTransactionMonitoring;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const nft_blockchain_service_1 = require("./nft-blockchain-service");
const notifications_1 = require("@b/utils/notifications");
let getProvider;
try {
    const providerModule = require("../../ecosystem/utils/provider");
    getProvider = providerModule.getProvider;
}
catch (e) {
}
class BlockchainRecoveryService {
    constructor(chain) {
        this.chain = chain;
        this.retryConfig = {
            maxRetries: 5,
            retryDelay: 5000,
            backoffMultiplier: 2,
            maxGasPriceIncrease: 50,
        };
        this.pendingOperations = new Map();
    }
    static async initialize(chain) {
        return new BlockchainRecoveryService(chain);
    }
    async retryFailedTransaction(originalTxHash, userId) {
        var _a;
        try {
            const txRecord = await db_1.models.transaction.findOne({
                where: { trxId: originalTxHash }
            });
            if (!txRecord) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found in database" });
            }
            if (this.pendingOperations.has(originalTxHash)) {
                return {
                    success: false,
                    error: "Transaction already being retried"
                };
            }
            const operation = {
                id: originalTxHash,
                type: txRecord.type,
                tokenId: (_a = txRecord.metadata) === null || _a === void 0 ? void 0 : _a.tokenId,
                transactionHash: originalTxHash,
                status: "PENDING",
                attempts: 0,
                metadata: txRecord.metadata
            };
            this.pendingOperations.set(originalTxHash, operation);
            await (0, notifications_1.createNotification)({
                userId,
                type: "system",
                title: "Transaction Recovery Started",
                message: `Attempting to recover your failed ${txRecord.type} transaction`,
                link: `/nft/transaction/${originalTxHash}`
            });
            const result = await this.executeRecoveryWithBackoff(operation, userId);
            this.pendingOperations.delete(originalTxHash);
            await db_1.models.transaction.update({
                status: result.success ? "COMPLETED" : "FAILED",
                metadata: {
                    ...txRecord.metadata,
                    recoveryAttempts: operation.attempts,
                    recoveredTxHash: result.newTxHash,
                    lastError: result.error
                }
            }, { where: { id: txRecord.id } });
            await (0, notifications_1.createNotification)({
                userId,
                type: result.success ? "alert" : "system",
                title: result.success ? "Transaction Recovered" : "Recovery Failed",
                message: result.success
                    ? `Your ${txRecord.type} transaction has been successfully recovered`
                    : `Failed to recover transaction after ${operation.attempts} attempts`,
                link: `/nft/transaction/${result.newTxHash || originalTxHash}`
            });
            return result;
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to retry transaction", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async executeRecoveryWithBackoff(operation, userId) {
        let delay = this.retryConfig.retryDelay;
        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            operation.attempts = attempt;
            operation.status = "RETRYING";
            try {
                const result = await this.recoverOperation(operation, userId);
                if (result.success) {
                    operation.status = "SUCCESS";
                    return result;
                }
                operation.lastError = result.error;
            }
            catch (error) {
                operation.lastError = error.message;
                console_1.logger.error("NFT", `Recovery attempt ${attempt} failed`, error);
            }
            if (attempt < this.retryConfig.maxRetries) {
                await this.sleep(delay);
                delay *= this.retryConfig.backoffMultiplier;
            }
        }
        operation.status = "FAILED";
        return {
            success: false,
            error: `Failed after ${operation.attempts} attempts: ${operation.lastError}`
        };
    }
    async recoverOperation(operation, userId) {
        const provider = await getProvider(this.chain);
        switch (operation.type) {
            case "MINT":
                return this.recoverMintOperation(operation, userId);
            case "TRANSFER":
                return this.recoverTransferOperation(operation, userId);
            case "LISTING":
                return this.recoverListingOperation(operation, userId);
            case "SALE":
                return this.recoverSaleOperation(operation, userId);
            case "APPROVAL":
                return this.recoverApprovalOperation(operation, userId);
            default:
                throw (0, error_1.createError)({ statusCode: 400, message: `Unknown operation type: ${operation.type}` });
        }
    }
    async recoverMintOperation(operation, userId) {
        try {
            const token = await db_1.models.nftToken.findByPk(operation.tokenId);
            if (!token) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Token not found" });
            }
            if (token.isMinted && token.blockchainTokenId) {
                return {
                    success: true,
                    message: "Token already minted"
                };
            }
            const blockchainService = await (0, nft_blockchain_service_1.getNFTBlockchainService)(this.chain);
            const mintResult = await blockchainService.mintNFT(token.collectionId, operation.metadata.recipientAddress, operation.metadata.tokenURI);
            if (mintResult.success) {
                await db_1.models.nftToken.update({
                    isMinted: true,
                    status: "MINTED",
                    blockchainTokenId: mintResult.tokenId,
                    transactionHash: mintResult.transactionHash,
                    mintedAt: new Date()
                }, { where: { id: token.id } });
                return {
                    success: true,
                    newTxHash: mintResult.transactionHash
                };
            }
            return {
                success: false,
                error: "Mint failed on blockchain"
            };
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to recover mint operation", error);
            throw error;
        }
    }
    async recoverTransferOperation(operation, userId) {
        return {
            success: false,
            error: "Transfer recovery not yet implemented"
        };
    }
    async recoverListingOperation(operation, userId) {
        return {
            success: false,
            error: "Listing recovery not yet implemented"
        };
    }
    async recoverSaleOperation(operation, userId) {
        return {
            success: false,
            error: "Sale recovery not yet implemented"
        };
    }
    async recoverApprovalOperation(operation, userId) {
        return {
            success: false,
            error: "Approval recovery not yet implemented"
        };
    }
    async monitorPendingTransactions() {
        try {
            const { Op } = require("sequelize");
            const pendingTxs = await db_1.models.transaction.findAll({
                where: {
                    status: "PENDING",
                    type: {
                        [Op.like]: "NFT%"
                    },
                    createdAt: {
                        [Op.lt]: new Date(Date.now() - 5 * 60 * 1000)
                    }
                },
                limit: 10
            });
            for (const tx of pendingTxs) {
                await this.checkTransactionStatus(tx);
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to monitor pending transactions", error);
        }
    }
    async checkTransactionStatus(tx) {
        var _a;
        try {
            const provider = await getProvider(this.chain);
            const receipt = await provider.getTransactionReceipt(tx.trxId);
            if (receipt) {
                const status = receipt.status === 1 ? "COMPLETED" : "FAILED";
                await db_1.models.transaction.update({
                    status,
                    metadata: {
                        ...tx.metadata,
                        blockNumber: receipt.blockNumber,
                        confirmations: receipt.confirmations,
                        gasUsed: (_a = receipt.gasUsed) === null || _a === void 0 ? void 0 : _a.toString()
                    }
                }, { where: { id: tx.id } });
                if (status === "FAILED" && tx.userId) {
                    await (0, notifications_1.createNotification)({
                        userId: tx.userId,
                        type: "alert",
                        title: "Transaction Failed",
                        message: `Your ${tx.type} transaction has failed`,
                        actions: [
                            {
                                label: "Retry Transaction",
                                link: `/nft/recovery/${tx.trxId}`,
                                primary: true
                            }
                        ]
                    });
                }
            }
            else {
                const timeSinceCreation = Date.now() - new Date(tx.createdAt).getTime();
                if (timeSinceCreation > 15 * 60 * 1000) {
                    await db_1.models.transaction.update({
                        status: "TIMEOUT",
                        metadata: {
                            ...tx.metadata,
                            stuckAt: new Date()
                        }
                    }, { where: { id: tx.id } });
                    if (tx.userId) {
                        await (0, notifications_1.createNotification)({
                            userId: tx.userId,
                            type: "alert",
                            title: "Transaction Stuck",
                            message: "Your transaction appears to be stuck. Consider speeding it up or cancelling.",
                            actions: [
                                {
                                    label: "Speed Up",
                                    link: `/nft/speedup/${tx.trxId}`,
                                    primary: true
                                },
                                {
                                    label: "Cancel",
                                    link: `/nft/cancel/${tx.trxId}`
                                }
                            ]
                        });
                    }
                }
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to check transaction status", error);
        }
    }
    async speedUpTransaction(txHash, userId) {
        try {
            const provider = await getProvider(this.chain);
            const tx = await provider.getTransaction(txHash);
            if (!tx) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
            }
            const replacementTx = {
                ...tx,
                gasPrice: tx.gasPrice ?
                    tx.gasPrice * BigInt(150) / BigInt(100) :
                    undefined,
                maxFeePerGas: tx.maxFeePerGas ?
                    tx.maxFeePerGas * BigInt(150) / BigInt(100) :
                    undefined,
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?
                    tx.maxPriorityFeePerGas * BigInt(200) / BigInt(100) :
                    undefined
            };
            const signer = await this.getSigner();
            const newTx = await signer.sendTransaction(replacementTx);
            await db_1.models.transaction.update({
                trxId: newTx.hash,
                metadata: (0, sequelize_1.literal)(`JSON_SET(
            COALESCE(metadata, '{}'),
            '$.originalTxHash', '${txHash}',
            '$.speedUp', true,
            '$.speedUpAt', '${new Date().toISOString()}'
          )`)
            }, { where: { trxId: txHash } });
            await (0, notifications_1.createNotification)({
                userId,
                type: "alert",
                title: "Transaction Sped Up",
                message: "Your transaction has been sped up with higher gas fees",
                link: `/nft/transaction/${newTx.hash}`
            });
            return {
                success: true,
                newTxHash: newTx.hash
            };
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to speed up transaction", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async cancelTransaction(txHash, userId) {
        try {
            const provider = await getProvider(this.chain);
            const tx = await provider.getTransaction(txHash);
            if (!tx) {
                throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
            }
            const signer = await this.getSigner();
            const cancelTx = await signer.sendTransaction({
                to: await signer.getAddress(),
                value: 0,
                nonce: tx.nonce,
                gasPrice: tx.gasPrice ?
                    tx.gasPrice * BigInt(150) / BigInt(100) :
                    undefined
            });
            await db_1.models.transaction.update({
                status: "CANCELLED",
                metadata: (0, sequelize_1.literal)(`JSON_SET(
            COALESCE(metadata, '{}'),
            '$.cancelledAt', '${new Date().toISOString()}',
            '$.cancelTxHash', '${cancelTx.hash}'
          )`)
            }, { where: { trxId: txHash } });
            await (0, notifications_1.createNotification)({
                userId,
                type: "alert",
                title: "Transaction Cancelled",
                message: "Your transaction has been cancelled",
                link: `/nft/transactions`
            });
            return { success: true };
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to cancel transaction", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    calculateGasIncrease(attempts) {
        const baseIncrease = 10;
        const increase = Math.min(baseIncrease * attempts, this.retryConfig.maxGasPriceIncrease);
        return increase;
    }
    async getSigner() {
        throw (0, error_1.createError)({ statusCode: 500, message: "Signer not configured" });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.BlockchainRecoveryService = BlockchainRecoveryService;
async function getBlockchainRecoveryService(chain) {
    return BlockchainRecoveryService.initialize(chain);
}
async function startTransactionMonitoring() {
    const chains = ["ETH", "BSC", "POLYGON"];
    for (const chain of chains) {
        const service = await getBlockchainRecoveryService(chain);
        setInterval(() => {
            service.monitorPendingTransactions();
        }, 2 * 60 * 1000);
    }
    console_1.logger.info("NFT", "Transaction monitoring started");
}
