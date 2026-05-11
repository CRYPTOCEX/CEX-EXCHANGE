"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get NFT creator profile",
    operationId: "getNftCreatorProfile",
    tags: ["NFT", "Creator", "Profile"],
    logModule: "NFT",
    logTitle: "Get Creator Profile",
    responses: {
        200: {
            description: "Creator profile retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid" },
                            userId: { type: "string", format: "uuid" },
                            displayName: { type: "string" },
                            bio: { type: "string" },
                            website: { type: "string" },
                            twitter: { type: "string" },
                            instagram: { type: "string" },
                            discord: { type: "string" },
                            isVerified: { type: "boolean" },
                            bannerImage: { type: "string" },
                            user: { type: "object" }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        404: { description: "Creator profile not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        let creatorProfile = await db_1.models.nftCreator.findOne({
            where: { userId: user.id },
            include: [{
                    model: db_1.models.user,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'avatar', 'email']
                }]
        });
        if (!creatorProfile) {
            const creatorDisplayName = user.firstName
                ? `${user.firstName}${user.lastName || ''}`.toLowerCase().replace(/\s+/g, '')
                : `creator_${user.id.slice(0, 8)}`;
            creatorProfile = await db_1.models.nftCreator.create({
                userId: user.id,
                displayName: creatorDisplayName,
                bio: undefined,
                banner: undefined,
                isVerified: false,
                profilePublic: true,
                totalVolume: 0,
                totalSales: 0,
                totalItems: 0,
                floorPrice: 0,
            });
            creatorProfile = await db_1.models.nftCreator.findOne({
                where: { userId: user.id },
                include: [{
                        model: db_1.models.user,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'avatar', 'email']
                    }]
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Creator Profile completed successfully");
        if (!creatorProfile) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to create or retrieve creator profile"
            });
        }
        return creatorProfile.toJSON();
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to retrieve creator profile", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve creator profile"
        });
    }
};
