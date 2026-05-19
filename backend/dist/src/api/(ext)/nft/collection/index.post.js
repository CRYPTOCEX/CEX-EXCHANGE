"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
function sanitizeHTML(input) {
    return input
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
}
exports.metadata = {
    summary: "Create NFT collection",
    operationId: "createNFTCollection",
    tags: ["NFT", "Collection"],
    logModule: "NFT",
    logTitle: "Create NFT collection",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", minLength: 1, maxLength: 255 },
                        symbol: { type: "string", minLength: 1, maxLength: 10 },
                        description: { type: "string" },
                        logoImage: { type: "string" },
                        bannerImage: { type: "string" },
                        categoryId: { type: "string", format: "uuid" },
                        chain: { type: "string" },
                        network: { type: "string" },
                        standard: { type: "string", enum: ["ERC721", "ERC1155"] },
                        contractAddress: { type: "string" },
                        maxSupply: { type: "integer", minimum: 1 },
                        mintPrice: { type: "number", minimum: 0 },
                        currency: { type: "string" },
                        royaltyPercentage: { type: "number", minimum: 0, maximum: 50 },
                        isPublic: { type: "boolean" },
                    },
                    required: ["name", "symbol", "categoryId", "chain", "network", "standard"],
                },
            },
        },
    },
    responses: {
        200: { description: "NFT collection created successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        409: { description: "Collection name or symbol already exists" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { name, symbol, description, logoImage, bannerImage, categoryId, chain, network, standard = "ERC721", contractAddress, maxSupply, mintPrice, currency = "ETH", royaltyPercentage = 2.5, isPublic = true, } = body;
    const validationErrors = [];
    if (!(name === null || name === void 0 ? void 0 : name.trim()))
        validationErrors.push("Name is required");
    if (!(symbol === null || symbol === void 0 ? void 0 : symbol.trim()))
        validationErrors.push("Symbol is required");
    if (!(categoryId === null || categoryId === void 0 ? void 0 : categoryId.trim()))
        validationErrors.push("Category ID is required");
    if (!(chain === null || chain === void 0 ? void 0 : chain.trim()))
        validationErrors.push("Chain is required");
    if (!(network === null || network === void 0 ? void 0 : network.trim()))
        validationErrors.push("Network is required");
    if (!(standard === null || standard === void 0 ? void 0 : standard.trim()))
        validationErrors.push("Standard is required");
    const nameRegex = /^[a-zA-Z0-9\s\-_'.]{1,255}$/;
    const symbolRegex = /^[$A-Z0-9]{1,10}$/;
    const validStandards = ["ERC721", "ERC1155"];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (name && !nameRegex.test(name.trim())) {
        validationErrors.push("Name contains invalid characters or is too long");
    }
    if (symbol && !symbolRegex.test(symbol.trim().toUpperCase())) {
        validationErrors.push("Symbol must be 1-10 uppercase alphanumeric characters ($ allowed)");
    }
    if (categoryId && !uuidRegex.test(categoryId)) {
        validationErrors.push("Category ID must be a valid UUID");
    }
    if (standard && !validStandards.includes(standard)) {
        validationErrors.push(`Standard must be one of: ${validStandards.join(", ")}`);
    }
    if (maxSupply !== undefined && (!Number.isInteger(maxSupply) || maxSupply < 1)) {
        validationErrors.push("Max supply must be a positive integer");
    }
    if (mintPrice !== undefined && (typeof mintPrice !== "number" || mintPrice < 0)) {
        validationErrors.push("Mint price must be a non-negative number");
    }
    if (royaltyPercentage !== undefined && (typeof royaltyPercentage !== "number" || royaltyPercentage < 0 || royaltyPercentage > 50)) {
        validationErrors.push("Royalty percentage must be a number between 0 and 50");
    }
    const imagePathRegex = /^(https?:\/\/.+|\/uploads\/.+)$/;
    if (logoImage && !imagePathRegex.test(logoImage)) {
        validationErrors.push("Logo image must be a valid URL or upload path");
    }
    if (bannerImage && !imagePathRegex.test(bannerImage)) {
        validationErrors.push("Banner image must be a valid URL or upload path");
    }
    if (validationErrors.length > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Validation failed: ${validationErrors.join(', ')}`,
        });
    }
    const sanitizedData = {
        name: sanitizeHTML(name.trim()),
        symbol: symbol.trim().toUpperCase(),
        description: description ? sanitizeHTML(description.trim()) : undefined,
        logoImage: logoImage === null || logoImage === void 0 ? void 0 : logoImage.trim(),
        bannerImage: bannerImage === null || bannerImage === void 0 ? void 0 : bannerImage.trim(),
        categoryId: categoryId.trim(),
        chain: chain.trim(),
        network: network.trim(),
        standard: standard.trim(),
        contractAddress: contractAddress === null || contractAddress === void 0 ? void 0 : contractAddress.trim(),
        maxSupply: maxSupply,
        mintPrice: mintPrice,
        currency: currency === null || currency === void 0 ? void 0 : currency.trim().toUpperCase(),
        royaltyPercentage: royaltyPercentage,
        isPublic: isPublic,
    };
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating collection data");
        const category = await db_1.models.nftCategory.findByPk(sanitizedData.categoryId);
        if (!category) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Category not found",
            });
        }
        try {
            const marketplace = await db_1.models.nftMarketplace.findOne({
                where: {
                    chain: sanitizedData.chain,
                    network: sanitizedData.network,
                    status: "ACTIVE"
                },
            });
            if (!marketplace) {
                console_1.logger.warn("NFT_COLLECTION", `Marketplace not found for chain=${sanitizedData.chain}, network=${sanitizedData.network}`);
                const available = await db_1.models.nftMarketplace.findAll({
                    where: { status: "ACTIVE" },
                    attributes: ["chain", "network"],
                    raw: true
                });
                console_1.logger.info("NFT_COLLECTION", `Available marketplaces: ${JSON.stringify(available)}`);
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Chain "${sanitizedData.chain}" with network "${sanitizedData.network}" is not supported or marketplace not active`,
                });
            }
        }
        catch (error) {
            if (error.statusCode) {
                throw error;
            }
            console_1.logger.warn("NFT_COLLECTION", `NFT marketplace validation skipped: ${error.message}`);
        }
        const baseSlug = sanitizedData.name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        let slug = baseSlug;
        let counter = 1;
        while (await db_1.models.nftCollection.findOne({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting or creating creator profile");
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
            });
        }
        const existingNameInCreator = await db_1.models.nftCollection.findOne({
            where: {
                creatorId: creator.id,
                name: sanitizedData.name,
            },
        });
        if (existingNameInCreator) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `You already have a collection named "${sanitizedData.name}". Please choose a different name.`,
            });
        }
        const existingSymbol = await db_1.models.nftCollection.findOne({
            where: {
                symbol: sanitizedData.symbol,
            },
        });
        if (existingSymbol) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `The symbol "${sanitizedData.symbol}" is already taken by another collection. Token symbols must be unique across the marketplace. Please choose a different symbol.`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating collection");
        const collectionData = {
            name: sanitizedData.name,
            symbol: sanitizedData.symbol,
            slug,
            description: sanitizedData.description,
            logoImage: sanitizedData.logoImage,
            bannerImage: sanitizedData.bannerImage,
            categoryId: sanitizedData.categoryId,
            creatorId: creator.id,
            chain: sanitizedData.chain,
            network: sanitizedData.network,
            standard: sanitizedData.standard,
            contractAddress: sanitizedData.contractAddress,
            maxSupply: sanitizedData.maxSupply,
            mintPrice: sanitizedData.mintPrice,
            currency: sanitizedData.currency,
            royaltyPercentage: sanitizedData.royaltyPercentage,
            status: "PENDING",
            totalSupply: 0,
            isVerified: false,
            isPublic: sanitizedData.isPublic,
        };
        const collection = await (0, query_1.storeRecord)({
            model: "nftCollection",
            data: collectionData,
            returnResponse: true,
        });
        await db_1.models.nftActivity.create({
            collectionId: collection.id,
            type: "COLLECTION_CREATED",
            fromUserId: undefined,
            toUserId: user.id,
            price: undefined,
            currency: undefined,
            transactionHash: undefined,
            metadata: JSON.stringify({
                collectionName: sanitizedData.name,
                symbol: sanitizedData.symbol,
                chain: sanitizedData.chain,
                network: sanitizedData.network
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`NFT collection "${sanitizedData.name}" created successfully`);
        return {
            message: "NFT collection created successfully. Pending admin approval.",
            data: collection,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to create collection: ${error.message}`);
        console_1.logger.error("NFT_COLLECTION", "Error creating NFT collection", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = (_b = (_a = error.errors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.path;
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Collection ${field} already exists`,
            });
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced category or user no longer exists",
            });
        }
        if (error.name === 'SequelizeValidationError') {
            const errorMessages = ((_c = error.errors) === null || _c === void 0 ? void 0 : _c.map(e => `${e.path}: ${e.message}`).join(', ')) || 'Unknown validation error';
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid collection data provided: ${errorMessages}`,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while creating the collection. Please try again.",
        });
    }
};
