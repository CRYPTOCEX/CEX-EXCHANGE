"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Create multiple NFT listings in batch",
    operationId: "batchCreateNFTListings",
    tags: ["NFT", "Listing", "Batch"],
    logModule: "NFT",
    logTitle: "Batch Create NFT Listings",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        listings: {
                            type: "array",
                            description: "Array of listings to create",
                            items: {
                                type: "object",
                                properties: {
                                    tokenId: { type: "string", format: "uuid" },
                                    type: { type: "string", enum: ["FIXED_PRICE", "AUCTION"] },
                                    price: { type: "number", minimum: 0 },
                                    currency: { type: "string", default: "ETH" },
                                    startTime: { type: "string", format: "date-time" },
                                    endTime: { type: "string", format: "date-time" },
                                    reservePrice: { type: "number", minimum: 0 },
                                    minBidIncrement: { type: "number", minimum: 0 },
                                    buyNowPrice: { type: "number", minimum: 0 },
                                    description: { type: "string" }
                                },
                                required: ["tokenId", "type", "price", "currency"]
                            },
                            minItems: 1,
                            maxItems: 50
                        },
                        bundleName: {
                            type: "string",
                            description: "Optional name if creating a bundle listing"
                        },
                        bundleDescription: {
                            type: "string",
                            description: "Optional description for bundle"
                        },
                        bundlePrice: {
                            type: "number",
                            description: "Special price for entire bundle",
                            minimum: 0
                        }
                    },
                    required: ["listings"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Batch listings created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    totalRequested: { type: "integer" },
                                    successfulListings: { type: "integer" },
                                    failedListings: { type: "integer" },
                                    bundleId: { type: "string" },
                                    listings: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                listingId: { type: "string" },
                                                tokenId: { type: "string" },
                                                success: { type: "boolean" },
                                                error: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Not token owner" },
        413: { description: "Too many listings in batch" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { listings, bundleName, bundleDescription, bundlePrice } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Extract batch listing parameters");
    if (!listings || listings.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "At least one listing is required"
        });
    }
    if (listings.length > 50) {
        throw (0, error_1.createError)({
            statusCode: 413,
            message: "Maximum 50 listings per batch"
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verify ownership of all tokens");
    const tokenIds = listings.map(l => l.tokenId);
    const tokens = await db_1.models.nftToken.findAll({
        where: {
            id: tokenIds,
            ownerId: user.id
        },
        include: [{
                model: db_1.models.nftCollection,
                as: "collection",
                attributes: ["id", "name", "contractAddress", "chain"]
            }]
    });
    if (tokens.length !== tokenIds.length) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You don't own all tokens in the batch"
        });
    }
    const existingListings = await db_1.models.nftListing.findAll({
        where: {
            tokenId: tokenIds,
            status: "ACTIVE"
        }
    });
    if (existingListings.length > 0) {
        const listedTokenIds = existingListings.map(l => l.tokenId);
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `Some tokens are already listed: ${listedTokenIds.join(", ")}`
        });
    }
    const results = {
        totalRequested: listings.length,
        successfulListings: 0,
        failedListings: 0,
        bundleId: null,
        listings: []
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Start database transaction");
    const dbTransaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create bundle if requested");
        let bundleId = null;
        if (bundleName && listings.length > 1) {
            const bundle = await ((_a = db_1.models.nftBundle) === null || _a === void 0 ? void 0 : _a.create({
                name: bundleName,
                description: bundleDescription,
                creatorId: user.id,
                bundlePrice: bundlePrice || listings.reduce((sum, l) => sum + l.price, 0),
                tokenCount: listings.length,
                status: "ACTIVE"
            }, { transaction: dbTransaction }));
            bundleId = bundle.id;
            results.bundleId = bundleId;
        }
        for (let i = 0; i < listings.length; i++) {
            const listingData = listings[i];
            const token = tokens.find(t => t.id === listingData.tokenId);
            const listingResult = {
                tokenId: listingData.tokenId,
                success: false,
                error: null
            };
            try {
                if (listingData.price <= 0) {
                    throw (0, error_1.createError)({ statusCode: 400, message: "Price must be greater than zero" });
                }
                const MAX_PRICE = 1000000;
                if (listingData.price > MAX_PRICE) {
                    throw (0, error_1.createError)({ statusCode: 400, message: `Price cannot exceed ${MAX_PRICE} ${listingData.currency}` });
                }
                if (listingData.type === "AUCTION") {
                    const startTime = listingData.startTime ? new Date(listingData.startTime) : new Date();
                    const endTime = listingData.endTime ? new Date(listingData.endTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    if (endTime <= startTime) {
                        throw (0, error_1.createError)({ statusCode: 400, message: "End time must be after start time" });
                    }
                    if (endTime <= new Date()) {
                        throw (0, error_1.createError)({ statusCode: 400, message: "End time must be in the future" });
                    }
                    listingData.startTime = startTime.toISOString();
                    listingData.endTime = endTime.toISOString();
                }
                const listing = await db_1.models.nftListing.create({
                    tokenId: listingData.tokenId,
                    sellerId: user.id,
                    type: listingData.type,
                    price: listingData.price,
                    currency: listingData.currency || "ETH",
                    status: "ACTIVE",
                    startTime: listingData.startTime || new Date(),
                    endTime: listingData.endTime,
                    reservePrice: listingData.reservePrice,
                    minBidIncrement: listingData.minBidIncrement || 0.01,
                    buyNowPrice: listingData.buyNowPrice,
                    views: 0,
                    metadata: bundleId ? JSON.stringify({ bundleId, description: listingData.description }) : (listingData.description ? JSON.stringify({ description: listingData.description }) : undefined)
                }, { transaction: dbTransaction });
                await db_1.models.nftToken.update({
                    isListed: true
                }, {
                    where: { id: listingData.tokenId },
                    transaction: dbTransaction
                });
                await db_1.models.nftActivity.create({
                    tokenId: listingData.tokenId,
                    collectionId: (_b = token === null || token === void 0 ? void 0 : token.collection) === null || _b === void 0 ? void 0 : _b.id,
                    listingId: listing.id,
                    type: "LIST",
                    fromUserId: user.id,
                    toUserId: undefined,
                    price: listingData.price,
                    currency: listingData.currency || "ETH",
                    metadata: JSON.stringify({
                        listingType: listingData.type,
                        batchIndex: i,
                        batchSize: listings.length,
                        bundleId
                    })
                }, { transaction: dbTransaction });
                listingResult.listingId = listing.id;
                listingResult.success = true;
                results.successfulListings++;
            }
            catch (error) {
                listingResult.error = error.message;
                listingResult.success = false;
                results.failedListings++;
                console_1.logger.error("NFT", "Failed to create batch listing item", error);
            }
            results.listings.push(listingResult);
        }
        if (bundleId && results.successfulListings > 0) {
            const successfulListingIds = results.listings
                .filter(l => l.success && l.listingId)
                .map(l => l.listingId);
            for (const listingId of successfulListingIds) {
                await ((_c = db_1.models.nftBundleItem) === null || _c === void 0 ? void 0 : _c.create({
                    bundleId,
                    listingId
                }, { transaction: dbTransaction }));
            }
        }
        await dbTransaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Clear cache and prepare response");
        const cache = cache_1.CacheManager.getInstance();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Batch listing completed: ${results.successfulListings} successful, ${results.failedListings} failed`);
        return {
            message: `Batch listing completed: ${results.successfulListings} successful, ${results.failedListings} failed`,
            data: results
        };
    }
    catch (error) {
        await dbTransaction.rollback();
        console_1.logger.error("NFT", "Failed to create batch listings", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Batch listing failed: ${error.message}`
        });
    }
};
