"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const nft_blockchain_service_1 = require("../../../utils/nft-blockchain-service");
const verification_1 = require("../../../utils/verification");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Transfer NFT to another user",
    operationId: "transferNft",
    tags: ["NFT", "Token", "Transfer", "Blockchain"],
    logModule: "NFT",
    logTitle: "Transfer NFT",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Token ID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        toAddress: {
                            type: "string",
                            description: "Recipient wallet address"
                        },
                        recipientUserId: {
                            type: "string",
                            format: "uuid",
                            description: "Optional: Recipient user ID if transferring to platform user"
                        },
                        transactionHash: {
                            type: "string",
                            description: "Optional: Pre-executed transfer transaction hash to verify"
                        },
                        executeTransfer: {
                            type: "boolean",
                            description: "Whether to execute the transfer on blockchain (default: true)",
                            default: true
                        },
                        gasUsed: { type: "string" },
                        gasPrice: { type: "string" }
                    },
                    required: ["toAddress"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "NFT transferred successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    tokenId: { type: "string" },
                                    fromAddress: { type: "string" },
                                    toAddress: { type: "string" },
                                    transactionHash: { type: "string" },
                                    blockNumber: { type: "integer" },
                                    gasUsed: { type: "string" },
                                    transferCost: { type: "string" },
                                    newOwnerId: { type: "string" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Not token owner or not approved" },
        404: { description: "Token not found" },
        409: { description: "Transaction already used" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b;
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { toAddress, recipientUserId, transactionHash, executeTransfer = true, gasUsed, gasPrice } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Token ID is required"
        });
    }
    if (!toAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Recipient address is required"
        });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid recipient address format"
        });
    }
    if (!user.walletAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User must have wallet address set to transfer NFTs"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch token and verify ownership");
        const token = await db_1.models.nftToken.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["id", "name", "contractAddress", "chain", "standard"]
                },
                {
                    model: db_1.models.user,
                    as: "owner",
                    attributes: ["id", "walletAddress"]
                }
            ]
        });
        if (!token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found"
            });
        }
        if (token.ownerId !== user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You can only transfer tokens you own"
            });
        }
        if (!token.isMinted || !token.blockchainTokenId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token must be minted on blockchain first"
            });
        }
        if (!((_a = token.collection) === null || _a === void 0 ? void 0 : _a.contractAddress)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection contract must be deployed first"
            });
        }
        const activeListing = await db_1.models.nftListing.findOne({
            where: {
                tokenId: id,
                status: "ACTIVE"
            }
        });
        if (activeListing) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot transfer token while it's actively listed for sale. Please cancel the listing first."
            });
        }
        let recipientUser = null;
        if (recipientUserId) {
            recipientUser = await db_1.models.user.findByPk(recipientUserId, {
                attributes: ["id", "walletAddress"]
            });
            if (!recipientUser) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Recipient user not found"
                });
            }
            if (((_b = recipientUser.walletAddress) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== toAddress.toLowerCase()) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Recipient wallet address does not match user's wallet address"
                });
            }
        }
        let transferResult;
        if (transactionHash && !executeTransfer) {
            const isUsed = await verification_1.TransactionVerificationService.isTransactionHashUsed(transactionHash);
            if (isUsed) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "Transaction hash has already been used"
                });
            }
            const verification = await verification_1.TransactionVerificationService.verifyTransactionExists(transactionHash, token.collection.chain);
            if (!verification.isValid) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: verification.errorMessage || "Transaction verification failed"
                });
            }
            transferResult = {
                success: true,
                transactionHash,
                blockNumber: verification.blockNumber,
                gasUsed: verification.gasUsed,
                transferCost: verification.gasFee
            };
        }
        else if (executeTransfer) {
            const blockchainService = await (0, nft_blockchain_service_1.getNFTBlockchainService)(token.collection.chain);
            transferResult = await blockchainService.transferNFT(token.collection.contractAddress, user.walletAddress, toAddress, token.blockchainTokenId, token.collection.standard);
            if (!transferResult.success) {
                throw (0, error_1.createError)({ statusCode: 500, message: "Blockchain transfer failed" });
            }
        }
        else {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Either provide transactionHash for verification or set executeTransfer to true"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Process NFT transfer in database transaction");
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await db_1.models.nftToken.update({
                ownerId: (recipientUser === null || recipientUser === void 0 ? void 0 : recipientUser.id) || null,
                isListed: false
            }, {
                where: { id },
                transaction: dbTransaction
            });
            try {
                const senderWallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: user.id,
                        currency: token.collection.chain === 'ETH' ? 'ETH' :
                            token.collection.chain === 'BSC' ? 'BNB' :
                                token.collection.chain === 'POLYGON' ? 'MATIC' : 'ETH',
                        type: 'SPOT'
                    },
                    transaction: dbTransaction
                });
                if (senderWallet) {
                    await db_1.models.transaction.create({
                        userId: user.id,
                        walletId: senderWallet.id,
                        type: "NFT_TRANSFER",
                        status: "COMPLETED",
                        amount: 0,
                        fee: 0,
                        description: `Transferred NFT to ${toAddress}`,
                        metadata: JSON.stringify({
                            tokenId: token.id,
                            fromAddress: user.walletAddress,
                            toAddress,
                            recipientUserId: recipientUser === null || recipientUser === void 0 ? void 0 : recipientUser.id,
                            contractAddress: token.collection.contractAddress,
                            blockchainTokenId: token.blockchainTokenId,
                            transferType: "DIRECT_TRANSFER",
                            chain: token.collection.chain,
                            blockNumber: transferResult.blockNumber,
                            gasUsed: transferResult.gasUsed
                        }),
                        trxId: transferResult.transactionHash
                    }, { transaction: dbTransaction });
                }
            }
            catch (error) {
                console_1.logger.warn("NFT_TRANSFER", `Failed to create transaction record: ${error.message}`);
            }
            await db_1.models.nftActivity.create({
                tokenId: token.id,
                collectionId: token.collectionId,
                type: "TRANSFER",
                fromUserId: user.id,
                toUserId: (recipientUser === null || recipientUser === void 0 ? void 0 : recipientUser.id) || undefined,
                price: undefined,
                currency: undefined,
                transactionHash: transferResult.transactionHash,
                metadata: JSON.stringify({
                    fromAddress: user.walletAddress,
                    toAddress,
                    blockchainTokenId: token.blockchainTokenId,
                    contractAddress: token.collection.contractAddress,
                    transferCost: transferResult.transferCost,
                    blockNumber: transferResult.blockNumber,
                    gasUsed: transferResult.gasUsed
                })
            }, { transaction: dbTransaction });
            await dbTransaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT transferred successfully");
            return {
                message: "NFT transferred successfully",
                data: {
                    tokenId: token.id,
                    fromAddress: user.walletAddress,
                    toAddress,
                    transactionHash: transferResult.transactionHash,
                    blockNumber: transferResult.blockNumber,
                    gasUsed: transferResult.gasUsed,
                    transferCost: transferResult.transferCost,
                    newOwnerId: (recipientUser === null || recipientUser === void 0 ? void 0 : recipientUser.id) || null
                }
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error("NFT_TRANSFER", "Failed to transfer NFT", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to transfer NFT"
        });
    }
};
