"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get recent NFT marketplace activities",
    description: "Retrieves the most recent NFT marketplace activities across all collections and tokens. Returns a simplified, formatted view of recent mints, sales, transfers, and other marketplace events. Useful for activity feeds and dashboards.",
    operationId: "getRecentNftActivity",
    tags: ["Admin", "NFT", "Activity"],
    parameters: [
        {
            name: "limit",
            in: "query",
            description: "Number of recent activities to return",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
        }
    ],
    responses: {
        200: {
            description: "Recent NFT activities retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                type: { type: "string" },
                                tokenName: { type: "string" },
                                collectionName: { type: "string" },
                                user: { type: "string" },
                                price: { type: "number" },
                                currency: { type: "string" },
                                timestamp: { type: "string" }
                            }
                        }
                    }
                }
            }
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse
    },
    requiresAuth: true,
    logModule: "ADMIN_NFT",
    logTitle: "Get Recent NFT Activities",
    permission: "access.nft",
    demoMask: ["fromUser.email", "toUser.email"],
};
exports.default = async (data) => {
    try {
        const { query, ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Process request");
        const limit = parseInt(query.limit) || 20;
        const recentActivities = await db_1.models.nftActivity.findAll({
            limit,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "fromUser",
                    attributes: ["id", "firstName", "lastName", "email"]
                },
                {
                    model: db_1.models.user,
                    as: "toUser",
                    attributes: ["id", "firstName", "lastName", "email"]
                }
            ]
        });
        const formattedActivities = recentActivities.map(activity => {
            var _a, _b, _c;
            const fromUser = activity.fromUser;
            const toUser = activity.toUser;
            let displayUser = "System";
            if (activity.type === "MINT" && fromUser) {
                displayUser = `${fromUser.firstName} ${fromUser.lastName}`.trim();
            }
            else if (activity.type === "SALE" && toUser) {
                displayUser = `${toUser.firstName} ${toUser.lastName}`.trim();
            }
            else if (fromUser) {
                displayUser = `${fromUser.firstName} ${fromUser.lastName}`.trim();
            }
            return {
                id: activity.id,
                type: activity.type,
                tokenName: ((_a = activity.token) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Token",
                collectionName: ((_c = (_b = activity.token) === null || _b === void 0 ? void 0 : _b.collection) === null || _c === void 0 ? void 0 : _c.name) || "Unknown Collection",
                user: displayUser,
                price: activity.price,
                currency: activity.currency,
                timestamp: activity.createdAt
            };
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Recent NFT Activities retrieved successfully");
        return formattedActivities;
    }
    catch (error) {
        console.error("Error fetching recent NFT activity:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch recent NFT activity"
        });
    }
};
