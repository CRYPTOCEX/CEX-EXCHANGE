"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update a specific affiliate reward",
    operationId: "updateAffiliateReward",
    tags: ["Admin", "Affiliate", "Reward"],
    description: "Updates the reward amount and claimed status for a specific affiliate referral reward.",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the affiliate reward to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated reward data",
        content: {
            "application/json": {
                schema: utils_1.mlmReferralRewardUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Affiliate reward updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Reward"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.affiliate.reward",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Update affiliate reward",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating update data");
    const updatedFields = {
        reward: body.reward,
        isClaimed: body.isClaimed,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating reward with ID: ${id}`);
    const result = await (0, query_1.updateRecord)("mlmReferralReward", id, updatedFields);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Reward updated successfully");
    return result;
};
