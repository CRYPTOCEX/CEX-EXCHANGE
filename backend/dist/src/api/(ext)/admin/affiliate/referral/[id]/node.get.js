"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/(ext)/affiliate/utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Fetches MLM node details by user ID",
    description: "Retrieves detailed information about a user MLM node including their downline structure. The structure varies based on MLM system (DIRECT/BINARY/UNILEVEL). Returns user information and their referral network.",
    operationId: "getAffiliateNodeById",
    tags: ["Admin", "Affiliate", "Referral"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid", description: "User ID" },
        },
    ],
    responses: {
        200: {
            description: "Node details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "User node with referral details",
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Node"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.affiliate.referral",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Get MLM node details",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching user node with ID: ${id}`);
    const user = await db_1.models.user.findByPk(id, {
        include: [
            {
                model: db_1.models.mlmReferral,
                as: "referrer",
                include: [
                    {
                        model: db_1.models.user,
                        as: "referred",
                    },
                ],
            },
            {
                model: db_1.models.mlmReferral,
                as: "referred",
            },
        ],
    });
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading MLM system settings");
    const { mlmSystem, mlmSettings } = await (0, utils_1.getMlmSystemAndSettings)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${mlmSystem || 'DIRECT'} referral structure`);
    let nodeDetails;
    switch (mlmSystem) {
        case "DIRECT":
            nodeDetails = await (0, utils_1.listDirectReferrals)(user, ctx);
            break;
        case "BINARY":
            nodeDetails = await (0, utils_1.listBinaryReferrals)(user, mlmSettings, ctx);
            break;
        case "UNILEVEL":
            nodeDetails = await (0, utils_1.listUnilevelReferrals)(user, mlmSettings, ctx);
            break;
        default:
            nodeDetails = await (0, utils_1.listDirectReferrals)(user, ctx);
            break;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Node details retrieved successfully");
    return nodeDetails;
};
