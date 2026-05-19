"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all affiliate conditions",
    description: "Retrieves all affiliate conditions ordered by type and name. Returns conditions with reward details, types, and status information.",
    operationId: "listAffiliateConditions",
    tags: ["Admin", "Affiliate", "Condition"],
    responses: {
        200: {
            description: "Affiliate conditions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.mlmReferralConditionSchema,
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Conditions"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.affiliate.condition",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "List affiliate conditions",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all affiliate conditions");
    const conditions = await db_1.models.mlmReferralCondition.findAll({
        order: [["type", "ASC"], ["name", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("All conditions fetched successfully");
    return conditions;
};
