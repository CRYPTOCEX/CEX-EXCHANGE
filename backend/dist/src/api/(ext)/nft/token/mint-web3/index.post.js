"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const constants_1 = require("@b/utils/constants");
const IPFS_GATEWAYS = [
    'https://copper-elegant-sparrow-787.mypinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://dweb.link/ipfs/',
];
const extractIPFSHash = (urlOrHash) => {
    if (!urlOrHash)
        return null;
    if (!urlOrHash.includes('/') && !urlOrHash.includes(':')) {
        return urlOrHash;
    }
    if (urlOrHash.startsWith('ipfs://')) {
        return urlOrHash.replace('ipfs://', '');
    }
    const ipfsMatch = urlOrHash.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (ipfsMatch) {
        return ipfsMatch[1];
    }
    return null;
};
const getExtensionFromContentType = (contentType) => {
    const typeMap = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
    };
    return typeMap[contentType.toLowerCase()] || '.jpg';
};
function fetchFromUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const request = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NFT-Cache/1.0)',
            },
            timeout: 10000,
        }, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            const chunks = [];
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = response.headers['content-type'] || 'image/jpeg';
                resolve({ buffer, contentType });
            });
            response.on('error', (error) => {
                reject(error);
            });
        });
        request.on('error', (error) => {
            reject(error);
        });
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}
async function fetchFromIPFS(ipfsHash) {
    let lastError = null;
    for (const gateway of IPFS_GATEWAYS) {
        try {
            const url = `${gateway}${ipfsHash}`;
            const result = await fetchFromUrl(url);
            return result;
        }
        catch (error) {
            lastError = error;
            continue;
        }
    }
    throw lastError || new Error('Failed to fetch from all IPFS gateways');
}
async function cacheNftImageLocally(imageUrl, tokenId) {
    try {
        const ipfsHash = extractIPFSHash(imageUrl);
        if (!ipfsHash || ipfsHash.length < 10) {
            return null;
        }
        const frontendPublicDir = constants_1.isProduction
            ? path.resolve(process.cwd(), 'frontend', 'public', 'uploads', 'nft')
            : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads', 'nft');
        const possibleExtensions = ['.jpg', '.png', '.gif', '.webp', '.svg'];
        for (const ext of possibleExtensions) {
            const filePath = path.join(frontendPublicDir, `${tokenId}${ext}`);
            try {
                await fs.access(filePath);
                return `/uploads/nft/${tokenId}${ext}`;
            }
            catch (_a) {
            }
        }
        const result = await fetchFromIPFS(ipfsHash);
        const fileBuffer = result.buffer;
        const contentType = result.contentType;
        await fs.mkdir(frontendPublicDir, { recursive: true });
        const extension = getExtensionFromContentType(contentType);
        const newCachePath = path.join(frontendPublicDir, `${tokenId}${extension}`);
        await fs.writeFile(newCachePath, fileBuffer);
        return `/uploads/nft/${tokenId}${extension}`;
    }
    catch (error) {
        console_1.logger.error("NFT_MINT", "Failed to cache image locally", error);
        return null;
    }
}
exports.metadata = {
    summary: "Record user-signed Web3 NFT mint transaction",
    operationId: "recordWeb3NftMint",
    tags: ["NFT", "Token", "Web3", "Mint"],
    logModule: "NFT",
    logTitle: "Record Web3 NFT Mint",
    description: "Records an NFT mint transaction that was signed and sent by the user via their Web3 wallet (MetaMask)",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        collectionId: {
                            type: "string",
                            description: "ID of the NFT collection"
                        },
                        tokenId: {
                            type: "string",
                            description: "Token ID minted on the blockchain"
                        },
                        transactionHash: {
                            type: "string",
                            description: "Transaction hash from blockchain"
                        },
                        blockNumber: {
                            type: "number",
                            description: "Block number where transaction was confirmed"
                        },
                        gasUsed: {
                            type: "string",
                            description: "Gas used for the transaction"
                        },
                        recipientAddress: {
                            type: "string",
                            description: "Address that received the minted NFT"
                        },
                        name: { type: "string" },
                        description: { type: "string" },
                        image: { type: "string", description: "IPFS image URL" },
                        metadataUri: { type: "string", description: "IPFS metadata JSON URL (tokenURI)" },
                        attributes: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    trait_type: { type: "string" },
                                    value: { type: "string" },
                                    display_type: { type: "string" }
                                }
                            }
                        },
                        rarity: {
                            type: "string",
                            enum: ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]
                        },
                        price: { type: "number" },
                        currency: { type: "string" },
                        royaltyPercentage: { type: "number" },
                        unlockableContent: { type: "string" },
                        isExplicit: { type: "boolean" },
                        categoryId: { type: "string" }
                    },
                    required: ["collectionId", "tokenId", "transactionHash", "blockNumber", "recipientAddress", "name", "image"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "NFT mint transaction recorded successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: { $ref: "#/components/schemas/NftToken" }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Collection not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    try {
        const { user, body, ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
        }
        const { collectionId, tokenId, transactionHash, blockNumber, gasUsed, recipientAddress, name, description, image, metadataUri, attributes, rarity, price, currency, royaltyPercentage, unlockableContent, isExplicit, categoryId } = body;
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const requireMetadataValidation = (_a = settings.get('nftRequireMetadataValidation')) !== null && _a !== void 0 ? _a : true;
        if (requireMetadataValidation) {
            if (!name || name.trim().length === 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "NFT name is required",
                });
            }
            if (name.length > 200) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "NFT name must not exceed 200 characters",
                });
            }
        }
        const creator = await db_1.models.nftCreator.findOne({
            where: { userId: user.id }
        });
        if (!creator) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Creator profile not found"
            });
        }
        const collection = await db_1.models.nftCollection.findOne({
            where: {
                id: collectionId,
                creatorId: creator.id
            }
        });
        if (!collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Collection not found or access denied"
            });
        }
        if (!collection.contractAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection contract not deployed. Please deploy your collection to the blockchain before minting NFTs."
            });
        }
        if (collection.status !== "ACTIVE") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Collection is not active. Current status: ${collection.status}. Only active collections can mint NFTs.`
            });
        }
        try {
            const { getNFTBlockchainService } = require("../../utils/nft-blockchain-service");
            const blockchainService = await getNFTBlockchainService(collection.chain);
            const provider = blockchainService.provider;
            const receipt = await provider.getTransactionReceipt(transactionHash);
            if (!receipt) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Transaction not found on blockchain. Please wait for the transaction to be confirmed."
                });
            }
            if (receipt.status !== 1) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Transaction failed on blockchain. The NFT was not minted."
                });
            }
            if (((_b = receipt.to) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== ((_c = collection.contractAddress) === null || _c === void 0 ? void 0 : _c.toLowerCase())) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Transaction was not sent to the collection contract."
                });
            }
            if (blockNumber && receipt.blockNumber !== blockNumber) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Block number mismatch. Please provide the correct block number."
                });
            }
        }
        catch (error) {
            if (error.statusCode) {
                throw error;
            }
            console_1.logger.error("NFT_MINT", "Failed to verify transaction on blockchain", error);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Failed to verify transaction on blockchain: ${error.message}`
            });
        }
        const existingActivity = await db_1.models.nftActivity.findOne({
            where: { transactionHash }
        });
        if (existingActivity) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "This transaction has already been recorded"
            });
        }
        const maxRoyaltyPercentage = (_d = settings.get('nftMaxRoyaltyPercentage')) !== null && _d !== void 0 ? _d : 10;
        if (royaltyPercentage && (royaltyPercentage < 0 || royaltyPercentage > maxRoyaltyPercentage)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Royalty percentage must be between 0% and ${maxRoyaltyPercentage}%`
            });
        }
        const metadata = metadataUri ? null : {
            name,
            description: description || "",
            image,
            attributes: attributes || [],
            properties: {
                creator: {
                    name: `${user.firstName} ${user.lastName}`.trim(),
                    address: user.walletAddress
                },
                collection: {
                    name: collection.name,
                    contract_address: collection.contractAddress
                },
                rarity: rarity || "COMMON",
                unlockable_content: unlockableContent,
                is_explicit: isExplicit || false
            }
        };
        const rarityScore = calculateRarityScore(attributes, rarity);
        const normalizedMetadataUri = metadataUri
            ? metadataUri.trim().toLowerCase().replace(/\/$/, '')
            : null;
        if (normalizedMetadataUri) {
            const existingToken = await db_1.models.nftToken.findOne({
                where: {
                    collectionId,
                    metadataUri: normalizedMetadataUri
                }
            });
            if (existingToken) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: `This metadata URI has already been minted in this collection (Token: "${existingToken.name}", ID: ${existingToken.tokenId}). Each NFT must have a unique metadata URI.`
                });
            }
        }
        const normalizedImage = image ? image.trim().toLowerCase().replace(/\/$/, '') : null;
        if (normalizedImage) {
            const existingByImage = await db_1.models.nftToken.findOne({
                where: {
                    collectionId,
                    image: normalizedImage
                }
            });
            if (existingByImage) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: `This image URL has already been used in this collection (Token: "${existingByImage.name}", ID: ${existingByImage.tokenId}). Each NFT must have a unique image URL.`
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create NFT token record in database transaction");
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            let creator = await db_1.models.nftCreator.findOne({
                where: { userId: user.id }
            });
            if (!creator) {
                const creatorUsername = user.firstName
                    ? `${user.firstName}${user.lastName || ''}`.toLowerCase().replace(/\s+/g, '')
                    : `creator_${user.id.slice(0, 8)}`;
                creator = await db_1.models.nftCreator.create({
                    userId: user.id,
                    isVerified: false,
                    profilePublic: true,
                    totalVolume: 0,
                    totalSales: 0,
                    totalItems: 0,
                    floorPrice: 0
                }, { transaction: dbTransaction });
            }
            const token = await db_1.models.nftToken.create({
                collectionId,
                creatorId: creator.id,
                ownerId: user.id,
                ownerWalletAddress: recipientAddress,
                blockchainTokenId: tokenId,
                tokenId: tokenId,
                name,
                description: description || "",
                image: normalizedImage,
                metadataUri: normalizedMetadataUri,
                attributes: JSON.stringify(attributes || []),
                rarity: rarity || "COMMON",
                rarityScore,
                status: "MINTED",
                isMinted: true,
                isListed: false,
                mintedAt: new Date(),
                views: 0,
                likes: 0
            }, { transaction: dbTransaction });
            await db_1.models.nftActivity.create({
                type: "MINT",
                tokenId: token.id,
                collectionId,
                fromUserId: undefined,
                toUserId: user.id,
                price: collection.mintPrice || 0,
                currency: collection.currency || "ETH",
                transactionHash,
                blockNumber,
                metadata: JSON.stringify({
                    web3_mint: true,
                    user_signed: true,
                    token_name: name,
                    collection_name: collection.name,
                    blockchain_token_id: tokenId,
                    block_number: blockNumber,
                    gas_used: gasUsed,
                    contract_address: collection.contractAddress,
                    recipient_address: recipientAddress,
                    chain: collection.chain
                })
            }, { transaction: dbTransaction });
            await collection.increment('totalSupply', { transaction: dbTransaction });
            const createdToken = await db_1.models.nftToken.findByPk(token.id, {
                include: [
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "name", "symbol", "logoImage"]
                    },
                    {
                        model: db_1.models.nftCreator,
                        as: "creator",
                        attributes: ["id", "displayName", "banner", "isVerified"],
                        include: [{
                                model: db_1.models.user,
                                as: "user",
                                attributes: ["id", "firstName", "lastName", "email", "avatar"]
                            }]
                    },
                    {
                        model: db_1.models.user,
                        as: "owner",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"]
                    }
                ],
                transaction: dbTransaction
            });
            await dbTransaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Cache NFT image locally from IPFS");
            if (image) {
                cacheNftImageLocally(image, token.id).catch((err) => {
                    console_1.logger.error("NFT_MINT", "Background image caching failed", err);
                });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT mint transaction recorded successfully");
            return {
                message: "NFT mint transaction recorded successfully",
                data: createdToken
            };
        }
        catch (error) {
            await dbTransaction.rollback();
            throw error;
        }
    }
    catch (error) {
        console_1.logger.error("NFT_MINT", "Failed to record NFT mint transaction", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to record NFT mint transaction"
        });
    }
};
function calculateRarityScore(attributes = [], rarity = "COMMON") {
    let baseScore = 0;
    const rarityScores = {
        COMMON: 1,
        UNCOMMON: 2,
        RARE: 4,
        EPIC: 8,
        LEGENDARY: 16
    };
    baseScore = rarityScores[rarity] || 1;
    const attributeBonus = attributes.length * 0.1;
    let specialBonus = 0;
    attributes.forEach(attr => {
        var _a, _b, _c;
        if (((_a = attr.trait_type) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('special')) ||
            ((_b = attr.trait_type) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes('unique')) ||
            ((_c = attr.trait_type) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes('legendary'))) {
            specialBonus += 0.5;
        }
    });
    return baseScore + attributeBonus + specialBonus;
}
