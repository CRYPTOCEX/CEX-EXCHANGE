"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List all affiliate rewards",
    operationId: "listAffiliateRewards",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Retrieves a paginated list of all affiliate referral rewards with optional filtering and sorting. Includes related referrer user details and referral condition information.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Affiliate rewards retrieved successfully with pagination",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.mlmReferralRewardSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Rewards"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.affiliate.reward",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "List affiliate rewards",
    demoMask: ["items.referrer.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching affiliate rewards with related data");
    const result = (0, query_1.getFiltered)({
        model: db_1.models.mlmReferralReward,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "referrer",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.mlmReferralCondition,
                as: "condition",
                attributes: [
                    "title",
                    "rewardType",
                    "rewardWalletType",
                    "rewardCurrency",
                    "rewardChain",
                ],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Rewards fetched successfully");
    return result;
};
