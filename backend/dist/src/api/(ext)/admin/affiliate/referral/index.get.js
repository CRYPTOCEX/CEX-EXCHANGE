"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all affiliate referrals with pagination and filtering",
    description: "Retrieves a paginated list of all affiliate referral records in the system. Each referral includes information about the referrer and referred user. Supports filtering, sorting, and searching through query parameters.",
    operationId: "listAffiliateReferrals",
    tags: ["Admin", "Affiliate", "Referral"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of affiliate referrals with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.mlmReferralSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Referrals"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.affiliate.referral",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "List affiliate referrals",
    demoMask: ["items.referrer.email", "items.referred.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching affiliate referrals with user details");
    const result = (0, query_1.getFiltered)({
        model: db_1.models.mlmReferral,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "referrer",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.user,
                as: "referred",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Referrals fetched successfully");
    return result;
};
