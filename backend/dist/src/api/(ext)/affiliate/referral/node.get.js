"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/(ext)/affiliate/utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Fetch MLM node details by UUID",
    description: "Retrieves information about a specific MLM node using its UUID.",
    operationId: "getNodeById",
    tags: ["MLM", "Referrals"],
    responses: {
        200: {
            description: "Node details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "number", description: "User ID" },
                            firstName: { type: "string", description: "First name" },
                            lastName: { type: "string", description: "Last name" },
                            referrals: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "number", description: "Referral ID" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        404: {
            description: "Node not found",
        },
        500: {
            description: "Internal server error",
        },
    },
    requiresAuth: true,
    logModule: "AFFILIATE",
    logTitle: "Get affiliate node details",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user details with referral associations");
    const userPk = await db_1.models.user.findByPk(user.id, {
        include: [
            {
                model: db_1.models.mlmReferral,
                as: "referrerReferrals",
                include: [
                    {
                        model: db_1.models.user,
                        as: "referred",
                        attributes: [
                            "id",
                            "firstName",
                            "lastName",
                            "avatar",
                            "createdAt",
                            "status",
                        ],
                    },
                ],
            },
            {
                model: db_1.models.mlmReferral,
                as: "referredReferrals",
                include: [
                    {
                        model: db_1.models.user,
                        as: "referrer",
                        attributes: [
                            "id",
                            "firstName",
                            "lastName",
                            "avatar",
                            "createdAt",
                            "status",
                        ],
                    },
                ],
            },
            {
                model: db_1.models.mlmReferralReward,
                as: "referralRewards",
                attributes: ["id"],
            },
        ],
    });
    if (!userPk) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading MLM system settings from cache");
    const { mlmSystem, mlmSettings } = await (0, utils_1.getMlmSystemAndSettings)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Building ${mlmSystem || 'DIRECT'} referral tree structure`);
    let nodeDetails;
    switch (mlmSystem) {
        case "DIRECT":
            nodeDetails = await (0, utils_1.listDirectReferrals)(userPk, ctx);
            break;
        case "BINARY":
            nodeDetails = await (0, utils_1.listBinaryReferrals)(userPk, mlmSettings, ctx);
            break;
        case "UNILEVEL":
            nodeDetails = await (0, utils_1.listUnilevelReferrals)(userPk, mlmSettings, ctx);
            break;
        default:
            nodeDetails = await (0, utils_1.listDirectReferrals)(userPk, ctx);
            break;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${mlmSystem || 'DIRECT'} node details for user`);
    return nodeDetails;
};
