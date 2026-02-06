"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific affiliate condition",
    description: "Updates an existing affiliate condition's configuration including reward amounts, types, wallet settings, blockchain details, status, and associated images. Allows modification of all condition parameters except the condition type itself.",
    operationId: "updateAffiliateCondition",
    tags: ["Admin", "Affiliate", "Condition"],
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the affiliate condition to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Updated affiliate condition data",
        content: {
            "application/json": {
                schema: utils_1.mlmReferralConditionUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Affiliate Condition"),
    requiresAuth: true,
    permission: "edit.affiliate.condition",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Update affiliate condition",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating update data");
    const updatedFields = {};
    if (body.title !== undefined)
        updatedFields.title = body.title;
    if (body.description !== undefined)
        updatedFields.description = body.description;
    if (body.reward !== undefined)
        updatedFields.reward = body.reward;
    if (body.rewardType !== undefined)
        updatedFields.rewardType = body.rewardType;
    if (body.rewardWalletType !== undefined)
        updatedFields.rewardWalletType = body.rewardWalletType;
    if (body.rewardCurrency !== undefined)
        updatedFields.rewardCurrency = body.rewardCurrency;
    if (body.rewardChain !== undefined)
        updatedFields.rewardChain = body.rewardChain;
    if (body.minAmount !== undefined)
        updatedFields.minAmount = body.minAmount;
    if (body.image !== undefined)
        updatedFields.image = body.image;
    if (body.status !== undefined)
        updatedFields.status = body.status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating condition record with ID: ${id}`);
    const result = await (0, query_1.updateRecord)("mlmReferralCondition", id, updatedFields);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Condition updated successfully");
    return result;
};
