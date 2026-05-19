"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const approval_service_1 = require("../utils/approval-service");
const metadata_validator_1 = require("../utils/metadata-validator");
const cache_1 = require("@b/utils/cache");
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Create NFT listing",
    operationId: "createNFTListing",
    tags: ["NFT", "Listing"],
    logModule: "NFT",
    logTitle: "Create NFT Listing",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        tokenId: { type: "string", format: "uuid" },
                        type: { type: "string", enum: ["FIXED_PRICE", "AUCTION", "BUNDLE"] },
                        price: { type: "number", minimum: 0 },
                        currency: { type: "string", default: "ETH" },
                        startTime: { type: "string", format: "date-time" },
                        endTime: { type: "string", format: "date-time" },
                        reservePrice: { type: "number", minimum: 0 },
                        minBidIncrement: { type: "number", minimum: 0 },
                        buyNowPrice: { type: "number", minimum: 0 },
                        bundleTokenIds: {
                            type: "array",
                            items: { type: "string", format: "uuid" }
                        },
                        description: { type: "string" },
                    },
                    required: ["tokenId", "type", "price", "currency"],
                },
            },
        },
    },
    responses: {
        200: { description: "NFT listing created successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Not token owner" },
        404: { description: "Token not found" },
        409: { description: "Token already listed" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { tokenId, type, price, currency = "ETH", startTime, endTime, reservePrice, minBidIncrement = 0.01, buyNowPrice, bundleTokenIds = [], description, } = body;
    if (!tokenId || !type || !price || !currency) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Token ID, type, price, and currency are required",
        });
    }
    const supportedCurrencies = ["ETH", "BNB", "MATIC", "USDT", "USDC", "BUSD"];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Currency ${currency} is not supported. Supported currencies: ${supportedCurrencies.join(", ")}`,
        });
    }
    if (price <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Price must be greater than zero",
        });
    }
    const MAX_PRICE = 1000000;
    if (price > MAX_PRICE) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Price cannot exceed ${MAX_PRICE} ${currency}`,
        });
    }
    const priceStr = price.toString();
    const decimalIndex = priceStr.indexOf('.');
    if (decimalIndex !== -1 && priceStr.length - decimalIndex - 1 > 6) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Price can have maximum 6 decimal places",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Load marketplace settings");
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        if (type === "FIXED_PRICE") {
            const fixedPriceSalesEnabled = (_a = settings.get('nftEnableFixedPriceSales')) !== null && _a !== void 0 ? _a : true;
            if (!fixedPriceSalesEnabled) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "Fixed price sales are currently disabled",
                });
            }
        }
        if (type === "AUCTION") {
            const auctionsEnabled = (_b = settings.get('nftEnableAuctions')) !== null && _b !== void 0 ? _b : true;
            if (!auctionsEnabled) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "Auctions are currently disabled",
                });
            }
        }
        const listingFee = (_c = settings.get('nftListingFee')) !== null && _c !== void 0 ? _c : 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verify token ownership");
        const token = await db_1.models.nftToken.findOne({
            where: {
                id: tokenId,
                ownerId: user.id,
                status: "MINTED",
            },
        });
        if (!token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found or you don't own this token",
            });
        }
        const requireMetadataValidation = (_d = settings.get('nftRequireMetadataValidation')) !== null && _d !== void 0 ? _d : false;
        if (requireMetadataValidation && token.metadataUri && token.image) {
            console_1.logger.info("NFT_LISTING", `Validating metadata for token ${tokenId}`);
            const validationResult = await (0, metadata_validator_1.validateIPFSMetadata)(token.metadataUri, token.image);
            if (!validationResult.valid) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `NFT metadata validation failed: ${validationResult.errors.join(', ')}. Please ensure your IPFS URLs are accessible and contain valid NFT metadata.`
                });
            }
            console_1.logger.success("NFT_LISTING", `Metadata validation passed for token ${tokenId}`);
        }
        await approval_service_1.NFTApprovalService.validateTokenApproval(tokenId, user.id, "list");
        const existingListing = await db_1.models.nftListing.findOne({
            where: {
                tokenId,
                status: "ACTIVE",
            },
        });
        if (existingListing) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Token is already listed for sale",
            });
        }
        if (type === "AUCTION") {
            if (!endTime) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "End time is required for auctions",
                });
            }
            const endDate = new Date(endTime);
            const startDate = startTime ? new Date(startTime) : new Date();
            if (endDate <= startDate) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "End time must be after start time",
                });
            }
            if (endDate <= new Date()) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "End time must be in the future",
                });
            }
            const minAuctionDuration = (_e = settings.get('nftMinAuctionDuration')) !== null && _e !== void 0 ? _e : 3600;
            const maxAuctionDuration = (_f = settings.get('nftMaxAuctionDuration')) !== null && _f !== void 0 ? _f : 604800;
            const durationInSeconds = (endDate.getTime() - startDate.getTime()) / 1000;
            if (durationInSeconds < minAuctionDuration) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Auction duration must be at least ${minAuctionDuration / 3600} hours`,
                });
            }
            if (durationInSeconds > maxAuctionDuration) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Auction duration cannot exceed ${maxAuctionDuration / 86400} days`,
                });
            }
            const bidIncrementPercentage = (_g = settings.get('nftBidIncrementPercentage')) !== null && _g !== void 0 ? _g : 5;
            const calculatedMinBidIncrement = price * (bidIncrementPercentage / 100);
            if (minBidIncrement < calculatedMinBidIncrement) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Minimum bid increment must be at least ${bidIncrementPercentage}% of the starting price (${calculatedMinBidIncrement} ${currency})`,
                });
            }
        }
        if (type === "BUNDLE") {
            if (!bundleTokenIds || bundleTokenIds.length === 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Bundle token IDs are required for bundle listings",
                });
            }
            const bundleTokens = await db_1.models.nftToken.findAll({
                where: {
                    id: bundleTokenIds,
                    ownerId: user.id,
                    status: "MINTED",
                },
            });
            if (bundleTokens.length !== bundleTokenIds.length) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "You don't own all tokens in the bundle",
                });
            }
            const approvalResults = await approval_service_1.NFTApprovalService.checkBatchApproval(bundleTokenIds, user.id);
            const unapprovedTokens = Object.entries(approvalResults)
                .filter(([_, status]) => !status.isApproved)
                .map(([tokenId]) => tokenId);
            if (unapprovedTokens.length > 0) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: `Bundle tokens not approved for marketplace: ${unapprovedTokens.join(", ")}. Please approve all tokens before creating bundle listing.`,
                });
            }
            const existingBundleListings = await db_1.models.nftListing.findAll({
                where: {
                    tokenId: bundleTokenIds,
                    status: "ACTIVE",
                },
            });
            if (existingBundleListings.length > 0) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "One or more tokens in the bundle are already listed",
                });
            }
        }
        const listingData = {
            tokenId,
            sellerId: user.id,
            type,
            price,
            currency,
            startTime: startTime ? new Date(startTime) : new Date(),
            endTime: endTime ? new Date(endTime) : undefined,
            reservePrice: type === "AUCTION" ? (reservePrice || price) : undefined,
            minBidIncrement: type === "AUCTION" ? minBidIncrement : undefined,
            buyNowPrice: type === "AUCTION" ? buyNowPrice : undefined,
            bundleTokenIds: type === "BUNDLE" ? JSON.stringify(bundleTokenIds) : undefined,
            status: "ACTIVE",
            currentBid: type === "AUCTION" ? 0 : undefined,
            metadata: description ? JSON.stringify({ description }) : undefined,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create listing in database transaction");
        const listing = await db_1.sequelize.transaction(async (transaction) => {
            const newListing = await db_1.models.nftListing.create(listingData, { transaction });
            await db_1.models.nftToken.update({ isListed: true }, { where: { id: tokenId }, transaction });
            if (type === "BUNDLE" && bundleTokenIds.length > 0) {
                await db_1.models.nftToken.update({ isListed: true }, { where: { id: bundleTokenIds }, transaction });
            }
            await db_1.models.nftActivity.create({
                tokenId,
                listingId: newListing.id,
                type: "LIST",
                fromUserId: user.id,
                toUserId: undefined,
                price,
                currency,
                transactionHash: undefined,
                metadata: JSON.stringify({
                    listingType: type,
                    tokenName: token.name,
                    ...(type === "AUCTION" && { endTime }),
                    ...(type === "BUNDLE" && { bundleSize: bundleTokenIds.length }),
                }),
            }, { transaction });
            if (db_1.models.nftPriceHistory) {
                await db_1.models.nftPriceHistory.create({
                    tokenId,
                    collectionId: token.collectionId,
                    price,
                    currency,
                    saleType: type === "AUCTION" ? "AUCTION" : "DIRECT",
                    sellerId: user.id,
                }, { transaction });
            }
            if (db_1.models.nftCollectionFollower) {
                const followers = await db_1.models.nftCollectionFollower.findAll({
                    where: { collectionId: token.collectionId },
                    attributes: ['userId'],
                    transaction
                });
                if (followers.length > 0) {
                    const followerUserIds = followers
                        .map((f) => f.userId)
                        .filter((userId) => userId !== user.id);
                    if (followerUserIds.length > 0) {
                        try {
                            await notification_1.notificationService.sendBatch({
                                userIds: followerUserIds,
                                type: "NFT",
                                channels: ["IN_APP", "PUSH"],
                                data: {
                                    title: "New NFT Listed",
                                    message: `${token.name} is now available for ${price} ${currency}`,
                                    link: `/nft/token/${tokenId}`,
                                    tokenId,
                                    listingId: newListing.id,
                                    tokenName: token.name,
                                    price,
                                    currency,
                                },
                                priority: "NORMAL",
                            });
                        }
                        catch (notifError) {
                            console_1.logger.error("NFT", "Failed to send NFT listing notifications", notifError);
                        }
                    }
                }
            }
            return newListing;
        });
        const collection = await db_1.models.nftCollection.findByPk(token.collectionId);
        const marketplaceFeePercentage = (_h = settings.get('nftMarketplaceFeePercentage')) !== null && _h !== void 0 ? _h : 2.5;
        const maxRoyaltyPercentage = (_j = settings.get('nftMaxRoyaltyPercentage')) !== null && _j !== void 0 ? _j : 10;
        const effectiveRoyalty = Math.min((collection === null || collection === void 0 ? void 0 : collection.royaltyPercentage) || 0, maxRoyaltyPercentage);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`NFT ${type.toLowerCase()} listing created successfully`);
        return {
            message: `NFT ${type.toLowerCase()} listing created successfully`,
            data: {
                ...listing.toJSON(),
                marketplaceFee: marketplaceFeePercentage,
                royaltyFee: effectiveRoyalty,
                listingFee: listingFee,
                estimatedTotal: price * (1 - marketplaceFeePercentage / 100 - effectiveRoyalty / 100),
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT_LISTING", "Error creating NFT listing", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "An active listing already exists for this token",
            });
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced token or collection no longer exists",
            });
        }
        if (error.name === 'SequelizeValidationError') {
            const errorMessages = ((_k = error.errors) === null || _k === void 0 ? void 0 : _k.map(e => `${e.path}: ${e.message}`).join(', ')) || 'Unknown validation error';
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid listing data provided: ${errorMessages}`,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while creating the listing. Please try again.",
        });
    }
};
