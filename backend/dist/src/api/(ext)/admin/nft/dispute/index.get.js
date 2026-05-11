"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get all NFT disputes for admin",
    operationId: "adminGetNftDisputes",
    tags: ["Admin", "NFT", "Dispute"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Disputes",
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by dispute status",
            schema: { type: "string", enum: ["PENDING", "INVESTIGATING", "AWAITING_RESPONSE", "RESOLVED", "REJECTED", "ESCALATED"] }
        },
        {
            name: "priority",
            in: "query",
            description: "Filter by priority",
            schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }
        },
        {
            name: "disputeType",
            in: "query",
            description: "Filter by dispute type",
            schema: { type: "string" }
        },
        {
            name: "assignedToId",
            in: "query",
            description: "Filter by assigned admin",
            schema: { type: "string" }
        }
    ],
    responses: {
        200: {
            description: "List of disputes retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftDispute" }
                            },
                            pagination: { $ref: "#/components/schemas/Pagination" }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin access required" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.dispute",
    demoMask: ["items.reporter.email", "items.respondent.email", "items.assignedTo.email"],
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT disputes");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (user.roleId !== 1) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Admin access required"
        });
    }
    const { status, priority, disputeType, assignedToId } = query;
    const where = {};
    if (status) {
        where.status = status;
    }
    if (priority) {
        where.priority = priority;
    }
    if (disputeType) {
        where.disputeType = disputeType;
    }
    if (assignedToId) {
        where.assignedToId = assignedToId;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT disputes retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftDispute,
        query,
        where,
        includeModels: [
            {
                model: db_1.models.user,
                as: "reporter",
                attributes: ["id", "firstName", "lastName", "email", "avatar"]
            },
            {
                model: db_1.models.user,
                as: "respondent",
                attributes: ["id", "firstName", "lastName", "email", "avatar"]
            },
            {
                model: db_1.models.user,
                as: "assignedTo",
                attributes: ["id", "firstName", "lastName", "email"]
            },
            {
                model: db_1.models.nftListing,
                as: "listing",
                attributes: ["id", "price", "currency", "type"],
                includeModels: [
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        attributes: ["id", "name", "image"]
                    }
                ]
            },
            {
                model: db_1.models.nftDisputeMessage,
                as: "messages",
                attributes: ["id", "createdAt"]
            }
        ],
        sortField: query.sortField || "createdAt"
    });
};
