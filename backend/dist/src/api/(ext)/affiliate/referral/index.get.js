"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = handler;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List referrals for authenticated affiliate",
    operationId: "listAffiliateReferrals",
    tags: ["Affiliate", "Referral"],
    requiresAuth: true,
    logModule: "AFFILIATE",
    logTitle: "List affiliate referrals",
    parameters: [
        { name: "page", in: "query", required: false, schema: { type: "number" } },
        {
            name: "perPage",
            in: "query",
            required: false,
            schema: { type: "number" },
        },
    ],
    responses: {
        200: { description: "Referral list retrieved successfully." },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
async function handler(data) {
    const { user, ctx } = data;
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating and sanitizing pagination parameters");
    const page = Math.max(1, Math.min(parseInt(data.query.page || "1", 10) || 1, 1000));
    const perPage = Math.max(1, Math.min(parseInt(data.query.perPage || "10", 10) || 10, 100));
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching referrals (page ${page}, ${perPage} per page)`);
    const { count: totalItems, rows: referrals } = await db_1.models.mlmReferral.findAndCountAll({
        where: { referrerId: user.id },
        include: [
            {
                model: db_1.models.user,
                as: "referred",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
        order: [["createdAt", "DESC"]],
        offset: (page - 1) * perPage,
        limit: perPage,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${referrals.length} referrals (total: ${totalItems})`);
    return {
        referrals,
        pagination: {
            page,
            perPage,
            totalItems,
            totalPages: Math.ceil(totalItems / perPage),
        },
    };
}
