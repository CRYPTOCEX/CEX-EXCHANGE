"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Fetches all users with binary MLM nodes",
    description: "Retrieves all users who have binary MLM referrals with associated binary nodes. Returns user information along with the count of their binary referrals. This endpoint is specific to BINARY MLM systems.",
    operationId: "getAllBinaryNodes",
    tags: ["Admin", "Affiliate", "Referral"],
    responses: {
        200: {
            description: "Binary nodes retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    format: "uuid",
                                    description: "User ID",
                                },
                                firstName: { type: "string", description: "First name" },
                                lastName: { type: "string", description: "Last name" },
                                avatar: {
                                    type: "string",
                                    nullable: true,
                                    description: "User avatar URL",
                                },
                                binaryReferralCount: {
                                    type: "number",
                                    description: "Number of binary referrals",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.affiliate.referral",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Get all MLM binary nodes",
};
exports.default = async (data) => {
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all MLM binary nodes");
    const users = (await db_1.models.user.findAll({
        include: [
            {
                model: db_1.models.mlmReferral,
                as: "referrals",
                where: {
                    mlmBinaryNode: { [sequelize_1.Op.ne]: null },
                },
            },
        ],
    }));
    const usersWithReferralCount = users.map((user) => ({
        ...user,
        binaryReferralCount: user.referrals.length,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("All binary nodes retrieved successfully");
    return usersWithReferralCount;
};
