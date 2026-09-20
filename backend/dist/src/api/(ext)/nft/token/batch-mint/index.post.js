"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
const kyc_1 = require("@b/utils/kyc");
const storefront_1 = require("@b/utils/storefront");
const MAX_BATCH = 50;
exports.metadata = {
    summary: "Batch-prepare NFTs in a collection",
    description: "Creates multiple tokens in a collection as DRAFT records in a single transaction. Minting each token on chain is a separate, per-token step because it requires a signature from the creator's own wallet.",
    operationId: "batchPrepareNftTokens",
    tags: ["NFT", "Token"],
    requiresAuth: true,
    logModule: "NFT",
    logTitle: "Batch prepare tokens",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        collectionId: { type: "string", description: "Collection to add the tokens to" },
                        mintToBlockchain: {
                            type: "boolean",
                            description: "Not supported in a batch — minting needs one wallet signature per token.",
                        },
                        tokens: {
                            type: "array",
                            description: `Tokens to create (1-${MAX_BATCH})`,
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string", nullable: true },
                                    image: { type: "string", nullable: true },
                                    attributes: { type: "object", nullable: true },
                                    rarity: { type: "string", nullable: true },
                                    royaltyPercentage: { type: "number", nullable: true },
                                },
                                required: ["name"],
                            },
                        },
                    },
                    required: ["collectionId", "tokens"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Batch processed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            successfulMints: { type: "number" },
                            failedMints: { type: "number" },
                            tokens: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        403: { description: "Not your collection" },
        404: { description: "Collection not found" },
    },
};
exports.default = async (data) => {
    var _a;
    (0, storefront_1.assertPurchaseAllowedOnNativeApp)(data, "mint items");
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.CREATE_NFT, "mint NFTs");
    const { collectionId, tokens, mintToBlockchain } = body !== null && body !== void 0 ? body : {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating the batch");
    if (!collectionId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "A collection is required" });
    }
    if (!Array.isArray(tokens) || tokens.length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No tokens to create" });
    }
    if (tokens.length > MAX_BATCH) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `A batch can hold at most ${MAX_BATCH} tokens; you sent ${tokens.length}.`,
        });
    }
    if (mintToBlockchain) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Minting on chain cannot be batched: each token needs a signature from your own wallet. Create the batch first, then mint each token from your collection.",
        });
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking the collection");
    const collection = await db_1.models.nftCollection.findByPk(collectionId, {
        include: [{ model: db_1.models.nftCreator, as: "creator", attributes: ["id", "userId"] }],
    });
    if (!collection) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Collection not found" });
    }
    const creator = collection.creator;
    if (!creator || creator.userId !== user.id) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You can only add tokens to your own collection",
        });
    }
    const maxRoyalty = parseFloat(String((_a = settings.get("nftMaxRoyaltyPercentage")) !== null && _a !== void 0 ? _a : "10"));
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Creating ${tokens.length} draft token(s)`);
    const results = [];
    await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b, _c, _d, _e;
        const stamp = Date.now();
        for (let i = 0; i < tokens.length; i++) {
            const spec = (_a = tokens[i]) !== null && _a !== void 0 ? _a : {};
            const name = typeof spec.name === "string" ? spec.name.trim() : "";
            if (!name) {
                results.push({ success: false, error: "A name is required" });
                continue;
            }
            const royalty = Number(spec.royaltyPercentage);
            if (Number.isFinite(royalty) && royalty > maxRoyalty) {
                results.push({
                    success: false,
                    name,
                    error: `Royalty of ${royalty}% exceeds the platform maximum of ${maxRoyalty}%`,
                });
                continue;
            }
            const created = await db_1.models.nftToken.create({
                collectionId,
                tokenId: `draft-${stamp}-${i}`,
                name,
                description: (_b = spec.description) !== null && _b !== void 0 ? _b : null,
                image: (_c = spec.image) !== null && _c !== void 0 ? _c : null,
                attributes: (_d = spec.attributes) !== null && _d !== void 0 ? _d : null,
                rarity: (_e = spec.rarity) !== null && _e !== void 0 ? _e : undefined,
                royaltyPercentage: Number.isFinite(royalty) ? royalty : undefined,
                creatorId: creator.id,
                ownerId: user.id,
                isMinted: false,
                isListed: false,
                views: 0,
                likes: 0,
                status: "DRAFT",
            }, { transaction });
            results.push({ success: true, id: created.id, name });
        }
    });
    const successfulMints = results.filter((r) => r.success).length;
    const failedMints = results.length - successfulMints;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Batch prepared: ${successfulMints} draft token(s) created, ${failedMints} rejected`);
    return {
        successfulMints,
        failedMints,
        tokens: results,
        message: "Tokens created as drafts. Mint each one from your collection when you are ready — minting needs a signature from your wallet.",
    };
};
