"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Make offer on NFT",
    operationId: "makeOffer",
    tags: ["NFT", "Offer"],
    logModule: "NFT",
    logTitle: "Make NFT Offer",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        tokenId: { type: "string", format: "uuid" },
                        collectionId: { type: "string", format: "uuid" },
                        amount: { type: "number", minimum: 0 },
                        currency: { type: "string", default: "ETH" },
                        expiresAt: { type: "string", format: "date-time" },
                        message: { type: "string" },
                    },
                    required: ["amount", "currency", "expiresAt"],
                    oneOf: [
                        { required: ["tokenId"] },
                        { required: ["collectionId"] }
                    ],
                },
            },
        },
    },
    responses: {
        200: { description: "Offer made successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Cannot make offer on own NFT" },
        404: { description: "NFT or collection not found" },
        409: { description: "Offer already exists" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { tokenId, collectionId, amount, currency = "ETH", expiresAt, message, } = body;
    if (!amount || !currency || !expiresAt) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Amount, currency, and expiration date are required",
        });
    }
    if (!tokenId && !collectionId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Either token ID or collection ID is required",
        });
    }
    let sanitizedTokenId;
    let sanitizedCollectionId;
    if (tokenId) {
        sanitizedTokenId = (0, nft_auth_1.sanitizeAuthInput)(tokenId);
    }
    if (collectionId) {
        sanitizedCollectionId = (0, nft_auth_1.sanitizeAuthInput)(collectionId);
    }
    if (amount <= 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offer amount must be greater than zero",
        });
    }
    const expirationDate = new Date(expiresAt);
    if (expirationDate <= new Date()) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Expiration date must be in the future",
        });
    }
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const offersEnabled = (_a = settings.get('nftEnableOffers')) !== null && _a !== void 0 ? _a : true;
        if (!offersEnabled) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Offers are currently disabled",
            });
        }
        let target = null;
        let offerType = "";
        if (sanitizedTokenId) {
            const token = await db_1.models.nftToken.findOne({
                where: { id: sanitizedTokenId, status: "MINTED" },
                include: [
                    {
                        model: db_1.models.user,
                        as: "owner",
                        attributes: ["id", "firstName", "lastName"],
                    },
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "name"],
                    },
                ],
            });
            if (!token) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "NFT not found",
                });
            }
            if (token.ownerId === user.id) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "You cannot make an offer on your own NFT",
                });
            }
            target = token;
            offerType = "TOKEN";
        }
        else if (sanitizedCollectionId) {
            const collection = await db_1.models.nftCollection.findOne({
                where: { id: sanitizedCollectionId, status: "ACTIVE" },
                include: [
                    {
                        model: db_1.models.nftCreator,
                        as: "creator",
                        attributes: ["id", "userId"],
                        include: [
                            {
                                model: db_1.models.user,
                                as: "user",
                                attributes: ["id", "firstName", "lastName"],
                            },
                        ],
                    },
                ],
            });
            if (!collection) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Collection not found",
                });
            }
            if (collection.creator && collection.creator.userId === user.id) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "You cannot make an offer on your own NFT collection",
                });
            }
            target = collection;
            offerType = "COLLECTION";
        }
        if (!target) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid target for offer",
            });
        }
        const existingOffer = await db_1.models.nftOffer.findOne({
            where: {
                userId: user.id,
                ...(sanitizedTokenId && { tokenId: sanitizedTokenId }),
                ...(sanitizedCollectionId && { collectionId: sanitizedCollectionId }),
                status: "ACTIVE",
            },
        });
        if (existingOffer) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `You already have an active offer on this ${offerType.toLowerCase()}`,
            });
        }
        const offerData = {
            userId: user.id,
            tokenId: sanitizedTokenId !== null && sanitizedTokenId !== void 0 ? sanitizedTokenId : undefined,
            collectionId: sanitizedCollectionId !== null && sanitizedCollectionId !== void 0 ? sanitizedCollectionId : undefined,
            amount,
            currency,
            expiresAt: expirationDate,
            message,
            status: "ACTIVE",
            type: offerType,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create offer in database transaction");
        const offer = await db_1.sequelize.transaction(async (transaction) => {
            const newOffer = await db_1.models.nftOffer.create(offerData, { transaction });
            await db_1.models.nftActivity.create({
                tokenId: sanitizedTokenId !== null && sanitizedTokenId !== void 0 ? sanitizedTokenId : undefined,
                collectionId: sanitizedCollectionId !== null && sanitizedCollectionId !== void 0 ? sanitizedCollectionId : undefined,
                offerId: newOffer.id,
                type: "OFFER",
                fromUserId: user.id,
                toUserId: offerType === "TOKEN" ? target.ownerId : target.creatorId,
                price: amount,
                currency,
                transactionHash: undefined,
                metadata: JSON.stringify({
                    offerType,
                    targetName: offerType === "TOKEN" ? target.name : target.name,
                    expiresAt: expirationDate.toISOString(),
                    ...(message && { message }),
                }),
            }, { transaction });
            return newOffer;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Offer made successfully on ${offerType.toLowerCase()}`);
        return {
            message: `Offer made successfully on ${offerType.toLowerCase()}`,
            data: {
                offer: offer.toJSON(),
                target: {
                    id: target.id,
                    name: target.name,
                    type: offerType,
                    ...(offerType === "TOKEN" && {
                        owner: target.owner,
                        collection: target.collection,
                    }),
                    ...(offerType === "COLLECTION" && {
                        creator: target.creator,
                    }),
                },
                expiresIn: expirationDate.getTime() - new Date().getTime(),
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT_OFFER_CREATION", "Failed to create offer", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "An active offer already exists for this item",
            });
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced item no longer exists",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while creating the offer. Please try again.",
        });
    }
};
