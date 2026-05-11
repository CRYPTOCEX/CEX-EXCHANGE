"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get public creator profile",
    operationId: "getPublicCreatorProfile",
    tags: ["NFT", "Creator"],
    logModule: "NFT",
    logTitle: "Get NFT Creator",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Creator ID or custom URL",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Creator profile retrieved successfully" },
        404: { description: "Creator not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    try {
        let creator = await db_1.models.nftCreator.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { id },
                    { userId: id },
                ],
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
            ],
        });
        if (!creator) {
            const user = await db_1.models.user.findByPk(id, {
                attributes: ["id", "firstName", "lastName", "avatar"],
            });
            if (!user) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "User not found",
                });
            }
            creator = await db_1.models.nftCreator.create({
                userId: user.id,
                profilePublic: true,
                isVerified: false,
                totalSales: 0,
                totalVolume: 0,
                totalItems: 0,
            });
            creator = await creator.reload({
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            });
        }
        if (!creator.profilePublic) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Creator profile is private",
            });
        }
        const collectionsCount = await db_1.models.nftCollection.count({
            where: {
                creatorId: creator.id,
                status: "ACTIVE",
            },
        });
        const tokensCount = await db_1.models.nftToken.count({
            where: {
                creatorId: creator.id,
                status: "MINTED",
            },
        });
        const recentActivityCount = await db_1.models.nftActivity.count({
            where: {
                createdAt: {
                    [sequelize_1.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    where: { creatorId: creator.id },
                    attributes: [],
                },
            ],
        });
        const salesStats = await db_1.models.nftSale.findAll({
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    where: { creatorId: creator.id },
                    attributes: [],
                },
            ],
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("nftSale.id")), "totalSales"],
                [(0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("nftSale.price")), 0), "totalVolume"],
            ],
            raw: true,
        });
        const stats = salesStats[0] || { totalSales: 0, totalVolume: 0 };
        if (creator.totalSales !== parseInt(String(stats.totalSales || 0)) ||
            creator.totalVolume !== parseFloat(String(stats.totalVolume || 0))) {
            await creator.update({
                totalSales: parseInt(String(stats.totalSales || 0)),
                totalVolume: parseFloat(String(stats.totalVolume || 0)),
            });
            creator = await creator.reload({
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            });
        }
        let followerCount = 0;
        let followingCount = 0;
        try {
            if (db_1.models.nftCreatorFollow) {
                followerCount = await db_1.models.nftCreatorFollow.count({
                    where: { followingId: creator.userId },
                });
                followingCount = await db_1.models.nftCreatorFollow.count({
                    where: { followerId: creator.userId },
                });
            }
        }
        catch (error) {
            console.warn("Follow system not available:", error.message);
        }
        const responseData = {
            ...creator.toJSON(),
            followerCount,
            followingCount,
            stats: {
                collectionsCount,
                tokensCount,
                recentActivityCount,
                totalSales: creator.totalSales,
                totalVolume: creator.totalVolume,
            },
        };
        return responseData;
    }
    catch (error) {
        console.error("Error fetching creator profile:", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch creator profile",
        });
    }
};
