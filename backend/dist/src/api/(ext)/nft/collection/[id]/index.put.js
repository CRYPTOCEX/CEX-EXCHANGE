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
    summary: "Update NFT collection",
    operationId: "updateNFTCollection",
    tags: ["NFT", "Collection"],
    logModule: "NFT",
    logTitle: "Update NFT collection",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Collection ID",
            required: true,
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
                        name: { type: "string", minLength: 1, maxLength: 255 },
                        symbol: { type: "string", minLength: 1, maxLength: 10 },
                        description: { type: "string" },
                        logoImage: { type: "string" },
                        bannerImage: { type: "string" },
                        categoryId: { type: "string", format: "uuid" },
                        maxSupply: { type: "integer", minimum: 1 },
                        mintPrice: { type: "number", minimum: 0 },
                        royaltyPercentage: { type: "number", minimum: 0, maximum: 50 },
                        isPublic: { type: "boolean" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Collection updated successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Collection not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e;
    const { user, body, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const collectionId = params.id;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving collection ${collectionId}`);
    const collection = await db_1.models.nftCollection.findByPk(collectionId, {
        include: [
            {
                model: db_1.models.nftCreator,
                as: "creator",
                attributes: ["id", "userId"],
            },
        ],
    });
    if (!collection) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Collection not found",
        });
    }
    if (((_a = collection.creator) === null || _a === void 0 ? void 0 : _a.userId) !== user.id) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You are not authorized to update this collection",
        });
    }
    const updateData = {};
    if (body.name !== undefined) {
        updateData.name = sanitizeHTML(body.name.trim());
    }
    if (body.symbol !== undefined) {
        const newSymbol = body.symbol.trim().toUpperCase();
        if (newSymbol !== collection.symbol) {
            const existingSymbol = await db_1.models.nftCollection.findOne({
                where: {
                    symbol: newSymbol,
                },
            });
            if (existingSymbol) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: `The symbol "${newSymbol}" is already taken by another collection. Token symbols must be unique across the marketplace. Please choose a different symbol.`,
                });
            }
        }
        updateData.symbol = newSymbol;
    }
    if (body.description !== undefined) {
        updateData.description = body.description ? sanitizeHTML(body.description.trim()) : null;
    }
    if (body.logoImage !== undefined) {
        updateData.logoImage = (_b = body.logoImage) === null || _b === void 0 ? void 0 : _b.trim();
    }
    if (body.bannerImage !== undefined) {
        updateData.bannerImage = (_c = body.bannerImage) === null || _c === void 0 ? void 0 : _c.trim();
    }
    if (body.categoryId !== undefined) {
        const category = await db_1.models.nftCategory.findByPk(body.categoryId);
        if (!category) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Category not found",
            });
        }
        updateData.categoryId = body.categoryId;
    }
    if (body.maxSupply !== undefined) {
        updateData.maxSupply = body.maxSupply;
    }
    if (body.mintPrice !== undefined) {
        updateData.mintPrice = body.mintPrice;
    }
    if (body.royaltyPercentage !== undefined) {
        updateData.royaltyPercentage = body.royaltyPercentage;
    }
    if (body.isPublic !== undefined) {
        updateData.isPublic = body.isPublic;
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating collection");
        await (0, query_1.updateRecord)("nftCollection", collectionId, updateData, false);
        const updatedCollection = await db_1.models.nftCollection.findByPk(collectionId, {
            include: [
                {
                    model: db_1.models.nftCreator,
                    as: "creator",
                    attributes: ["id", "displayName", "banner", "isVerified"],
                },
                {
                    model: db_1.models.nftCategory,
                    as: "category",
                    attributes: ["id", "name", "slug"],
                },
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Collection ${collectionId} updated successfully`);
        return {
            message: "Collection updated successfully",
            data: updatedCollection,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update collection: ${error.message}`);
        console_1.logger.error("NFT", "Error updating collection", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = (_e = (_d = error.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.path;
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Collection ${field} already exists`,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to update collection",
        });
    }
};
