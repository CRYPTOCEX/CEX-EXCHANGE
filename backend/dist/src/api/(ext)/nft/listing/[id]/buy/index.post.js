"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const verification_1 = require("../../../utils/verification");
const nft_blockchain_service_1 = require("../../../utils/nft-blockchain-service");
const marketplace_service_1 = require("../../../utils/marketplace-service");
const balance_service_1 = require("../../../utils/balance-service");
const price_converter_1 = require("../../../utils/price-converter");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const affiliate_1 = require("@b/utils/affiliate");
exports.metadata = {
    summary: "Buy NFT directly",
    operationId: "buyNFT",
    tags: ["NFT", "Purchase"],
    logModule: "NFT",
    logTitle: "Buy NFT",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Listing ID",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        transactionHash: { type: "string" },
                        gasUsed: { type: "number" },
                        gasPrice: { type: "string" },
                    },
                    required: ["transactionHash"],
                },
            },
        },
    },
    responses: {
        200: { description: "NFT purchased successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Cannot buy own NFT" },
        404: { description: "Listing not found" },
        409: { description: "Listing not available" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { transactionHash, gasUsed, gasPrice } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!user.walletAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User must have a wallet address set to make purchases"
        });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Listing ID is required",
        });
    }
    if (!transactionHash) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Transaction hash is required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch listing and validate");
        const listing = await db_1.models.nftListing.findOne({
            where: { id, status: "ACTIVE" },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "royaltyPercentage", "chain", "contractAddress"],
                        },
                        {
                            model: db_1.models.user,
                            as: "owner",
                            attributes: ["id", "firstName", "lastName"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "walletAddress"],
                },
            ],
        });
        if (!listing) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Listing not found or not available",
            });
        }
        if (!listing.token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found for this listing",
            });
        }
        if (!listing.token.collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Collection not found for this token",
            });
        }
        if (!listing.seller) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Seller information not found",
            });
        }
        if (listing.status !== "ACTIVE") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Listing is no longer available",
            });
        }
        if (listing.endTime && new Date() > new Date(listing.endTime)) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Listing has expired",
            });
        }
        if (listing.sellerId === user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You cannot buy your own NFT",
            });
        }
        if (listing.type === "AUCTION" && !listing.buyNowPrice) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "This is an auction-only listing. Use bidding instead.",
            });
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const marketplaceFeePercentage = (_a = settings.get('nftMarketplaceFeePercentage')) !== null && _a !== void 0 ? _a : 2.5;
        const maxRoyaltyPercentage = (_b = settings.get('nftMaxRoyaltyPercentage')) !== null && _b !== void 0 ? _b : 10;
        const salePrice = listing.type === "AUCTION" && listing.buyNowPrice
            ? listing.buyNowPrice
            : listing.price;
        if (salePrice === undefined || salePrice === null) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Listing price is not set",
            });
        }
        const requireKycForHighValue = (_c = settings.get('nftRequireKycForHighValue')) !== null && _c !== void 0 ? _c : false;
        const highValueThreshold = (_d = settings.get('nftHighValueThreshold')) !== null && _d !== void 0 ? _d : 1000;
        if (requireKycForHighValue && highValueThreshold > 0) {
            const salePriceUSD = await (0, price_converter_1.convertToUSD)(salePrice, (_e = listing.currency) !== null && _e !== void 0 ? _e : "ETH");
            if (salePriceUSD && salePriceUSD >= highValueThreshold) {
                const kycStatus = await db_1.models.kycApplication.findOne({
                    where: {
                        userId: user.id,
                        status: 'APPROVED'
                    }
                });
                if (!kycStatus) {
                    throw (0, error_1.createError)({
                        statusCode: 403,
                        message: `This is a high-value transaction (${salePriceUSD.toFixed(2)} USD). KYC verification is required to complete this purchase. Please verify your identity before proceeding.`
                    });
                }
            }
        }
        if (user.walletAddress) {
            try {
                const balanceCheck = await (0, balance_service_1.checkUserBalance)(user.walletAddress, listing.token.collection.chain || "ETH", "purchase", salePrice.toString(), (_f = listing.token.collection.contractAddress) !== null && _f !== void 0 ? _f : undefined, (_g = listing.token.blockchainTokenId) !== null && _g !== void 0 ? _g : undefined);
                if (!balanceCheck.hasBalance) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Insufficient balance. You need ${balanceCheck.totalRequired} ${balanceCheck.currency} but only have ${balanceCheck.currentBalance} ${balanceCheck.currency}. Shortfall: ${balanceCheck.shortfall} ${balanceCheck.currency}`
                    });
                }
                console_1.logger.debug("NFT_PURCHASE", `Balance check passed for user ${user.id}: ${balanceCheck.currentBalance} ${balanceCheck.currency} available, ${balanceCheck.totalRequired} ${balanceCheck.currency} required`);
            }
            catch (balanceError) {
                if (balanceError.statusCode) {
                    throw balanceError;
                }
                console_1.logger.warn("NFT_PURCHASE", `Balance check failed for user ${user.id}: ${balanceError.message}`);
                console_1.logger.error("NFT_PURCHASE_BALANCE_CHECK", "Balance check failed for technical reasons", balanceError);
            }
        }
        try {
            await verification_1.TransactionVerificationService.validateNFTTransaction(transactionHash, listing.token.collection.chain || "ETH", "purchase", {
                expectedAmount: salePrice.toString(),
                expectedSender: user.walletAddress,
                expectedRecipient: listing.token.collection.contractAddress || listing.seller.walletAddress
            });
        }
        catch (verificationError) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Transaction verification failed: ${verificationError.message}`
            });
        }
        const effectiveRoyalty = Math.min(listing.token.collection.royaltyPercentage || 0, maxRoyaltyPercentage);
        const marketplaceFee = salePrice * (marketplaceFeePercentage / 100);
        const royaltyFee = effectiveRoyalty
            ? salePrice * (effectiveRoyalty / 100)
            : 0;
        const sellerAmount = salePrice - marketplaceFee - royaltyFee;
        if (!listing.token.collection.contractAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection contract must be deployed to execute blockchain transfer"
            });
        }
        if (!listing.token.blockchainTokenId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token must be minted on blockchain to execute transfer"
            });
        }
        if (!listing.seller.walletAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Seller must have wallet address set for blockchain transfer"
            });
        }
        let transferResult;
        let useMarketplace = false;
        let marketplaceResult = null;
        try {
            const marketplaceService = await (0, marketplace_service_1.getNFTMarketplaceService)(listing.token.collection.chain);
            const marketplaceAddress = await marketplaceService.getMarketplaceAddress();
            if (marketplaceAddress) {
                const isListedOnMarketplace = await marketplaceService.isListed(listing.token.collection.contractAddress, listing.token.blockchainTokenId);
                if (isListedOnMarketplace) {
                    console_1.logger.info("NFT_PURCHASE", `Using marketplace contract for purchase: ${marketplaceAddress}`);
                    marketplaceResult = await marketplaceService.buyItem(listing.token.collection.contractAddress, listing.token.blockchainTokenId, salePrice.toString());
                    if (marketplaceResult && marketplaceResult.success) {
                        useMarketplace = true;
                        transferResult = {
                            success: true,
                            transactionHash: marketplaceResult.transactionHash,
                            blockNumber: marketplaceResult.blockNumber,
                            gasUsed: marketplaceResult.gasUsed,
                            transferCost: marketplaceResult.marketplaceFee,
                            marketplaceFee: marketplaceResult.marketplaceFee,
                            royaltyFee: marketplaceResult.royaltyFee,
                            sellerAmount: marketplaceResult.sellerAmount
                        };
                    }
                }
            }
        }
        catch (marketplaceError) {
            console_1.logger.warn("NFT_PURCHASE", `Marketplace purchase failed, falling back to direct transfer: ${marketplaceError.message}`);
            useMarketplace = false;
        }
        if (!useMarketplace) {
            try {
                console_1.logger.info("NFT_PURCHASE", "Using direct blockchain transfer");
                const blockchainService = await (0, nft_blockchain_service_1.getNFTBlockchainService)(listing.token.collection.chain);
                transferResult = await blockchainService.executePurchase(listing.token.collection.contractAddress, listing.seller.walletAddress, user.walletAddress, listing.token.blockchainTokenId, salePrice.toString(), listing.token.collection.standard || "ERC721");
                if (!transferResult.success) {
                    throw (0, error_1.createError)({ statusCode: 500, message: "On-chain NFT transfer failed" });
                }
            }
            catch (transferError) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: `NFT transfer failed: ${transferError.message}`
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Process purchase in database transaction");
        const transaction = await db_1.sequelize.transaction();
        try {
            const finalMarketplaceFee = useMarketplace && transferResult.marketplaceFee
                ? parseFloat(transferResult.marketplaceFee)
                : marketplaceFee;
            const finalRoyaltyFee = useMarketplace && transferResult.royaltyFee
                ? parseFloat(transferResult.royaltyFee)
                : royaltyFee;
            const finalSellerAmount = useMarketplace && transferResult.sellerAmount
                ? parseFloat(transferResult.sellerAmount)
                : sellerAmount;
            const sale = await db_1.models.nftSale.create({
                listingId: listing.id,
                tokenId: listing.tokenId,
                sellerId: listing.sellerId,
                buyerId: user.id,
                price: salePrice,
                currency: (_h = listing.currency) !== null && _h !== void 0 ? _h : "ETH",
                marketplaceFee: finalMarketplaceFee,
                royaltyFee: finalRoyaltyFee,
                totalFee: finalMarketplaceFee + finalRoyaltyFee,
                netAmount: finalSellerAmount,
                transactionHash,
                blockNumber: (_j = transferResult.blockNumber) !== null && _j !== void 0 ? _j : 0,
                status: "COMPLETED",
                metadata: {
                    saleType: useMarketplace ? "MARKETPLACE_PURCHASE" : "DIRECT_PURCHASE",
                    transferHash: transferResult.transactionHash,
                    transferBlockNumber: transferResult.blockNumber,
                    transferGasUsed: transferResult.gasUsed,
                    transferCost: transferResult.transferCost,
                    gasUsed,
                    gasPrice
                }
            }, { transaction });
            try {
                const buyerWallet = await db_1.models.wallet.findOne({
                    where: {
                        userId: user.id,
                        currency: listing.currency,
                        type: 'SPOT'
                    },
                    transaction
                });
                if (buyerWallet) {
                    await db_1.models.transaction.create({
                        userId: user.id,
                        walletId: buyerWallet.id,
                        type: "NFT_PURCHASE",
                        status: "COMPLETED",
                        amount: salePrice !== null && salePrice !== void 0 ? salePrice : 0,
                        fee: finalMarketplaceFee + finalRoyaltyFee,
                        description: `Purchased NFT "${listing.token.name}" for ${salePrice} ${listing.currency}`,
                        metadata: JSON.stringify({
                            saleId: sale.id,
                            tokenId: listing.tokenId,
                            listingId: listing.id,
                            chain: listing.token.collection.chain,
                            fromAddress: listing.seller.walletAddress,
                            toAddress: user.walletAddress,
                            contractAddress: listing.token.collection.contractAddress,
                            blockchainTokenId: listing.token.blockchainTokenId,
                            transferHash: transferResult.transactionHash,
                            transferBlockNumber: transferResult.blockNumber,
                            transferType: "PURCHASE"
                        }),
                        trxId: transactionHash
                    }, { transaction });
                }
            }
            catch (error) {
                console_1.logger.warn("NFT_PURCHASE", `Failed to create transaction record: ${error.message}`);
            }
            await db_1.models.nftToken.update({
                ownerId: user.id,
                isListed: false,
            }, {
                where: { id: listing.tokenId },
                transaction,
            });
            await db_1.models.nftListing.update({
                status: "SOLD",
                soldAt: new Date(),
            }, {
                where: { id: listing.id },
                transaction,
            });
            await db_1.models.nftActivity.create({
                tokenId: listing.tokenId,
                listingId: listing.id,
                type: "SALE",
                fromUserId: listing.sellerId,
                toUserId: user.id,
                price: salePrice,
                currency: (_k = listing.currency) !== null && _k !== void 0 ? _k : "ETH",
                transactionHash,
                metadata: JSON.stringify({
                    saleId: sale.id,
                    tokenName: listing.token.name,
                    marketplaceFee,
                    royaltyFee,
                    saleType: "DIRECT_PURCHASE",
                    transferHash: transferResult.transactionHash,
                    transferBlockNumber: transferResult.blockNumber,
                    transferGasUsed: transferResult.gasUsed,
                    transferCost: transferResult.transferCost,
                    blockchainTransfer: true
                }),
            }, { transaction });
            if (listing.type === "BUNDLE" && listing.bundleTokenIds) {
                const bundleTokenIds = JSON.parse(listing.bundleTokenIds);
                await db_1.models.nftToken.update({
                    ownerId: user.id,
                    isListed: false,
                }, {
                    where: { id: bundleTokenIds },
                    transaction,
                });
                for (const bundleTokenId of bundleTokenIds) {
                    await db_1.models.nftActivity.create({
                        tokenId: bundleTokenId,
                        listingId: listing.id,
                        type: "SALE",
                        fromUserId: listing.sellerId,
                        toUserId: user.id,
                        price: salePrice / bundleTokenIds.length,
                        currency: (_l = listing.currency) !== null && _l !== void 0 ? _l : "ETH",
                        transactionHash,
                        metadata: JSON.stringify({
                            saleId: sale.id,
                            bundleSale: true,
                            bundleSize: bundleTokenIds.length,
                            bundlePrice: salePrice,
                        }),
                    }, { transaction });
                }
            }
            await transaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT purchased successfully");
            try {
                await (0, affiliate_1.processRewards)(user.id, salePrice !== null && salePrice !== void 0 ? salePrice : 0, "NFT_PURCHASE", (_m = listing.currency) !== null && _m !== void 0 ? _m : "ETH");
                await (0, affiliate_1.processRewards)(listing.sellerId, sellerAmount, "NFT_SALE", (_o = listing.currency) !== null && _o !== void 0 ? _o : "ETH");
            }
            catch (affiliateError) {
                console_1.logger.error("NFT_PURCHASE", "Failed to process affiliate rewards", affiliateError);
            }
            return {
                message: "NFT purchased successfully",
                data: {
                    sale: sale.toJSON(),
                    tokenId: listing.tokenId,
                    transactionHash,
                    price: salePrice,
                    currency: listing.currency,
                    fees: {
                        marketplace: marketplaceFee,
                        royalty: royaltyFee,
                        total: marketplaceFee + royaltyFee,
                    },
                    seller: {
                        id: listing.sellerId,
                        amount: sellerAmount,
                    },
                },
            };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    catch (error) {
        console_1.logger.error("NFT_PURCHASE_ERROR", "Failed to purchase NFT", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to purchase NFT",
        });
    }
};
