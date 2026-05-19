"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const utils_2 = require("@b/api/(ext)/affiliate/utils");
const affiliate_1 = require("@b/utils/affiliate");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates a specific affiliate referral",
    description: "Updates an existing affiliate referral record. When referrer or referred user changes, the MLM node structure (binary/unilevel) is automatically rebuilt to maintain network integrity.",
    operationId: "updateAffiliateReferral",
    tags: ["Admin", "Affiliate", "Referral"],
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the affiliate referral to update",
            required: true,
            schema: {
                type: "string",
                format: "uuid",
            },
        },
    ],
    requestBody: {
        description: "New data for the affiliate referral",
        content: {
            "application/json": {
                schema: utils_1.mlmReferralUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Affiliate referral updated successfully",
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
        404: (0, errors_1.notFoundResponse)("Affiliate Referral"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.affiliate.referral",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Update affiliate referral",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status, referrerId, referredId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating referral update data");
    if (referrerId === referredId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Referrer and referred user cannot be the same" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying users exist");
    const referrer = await db_1.models.user.findOne({ where: { id: referrerId } });
    if (!referrer)
        throw (0, error_1.createError)({ statusCode: 404, message: "Referrer not found" });
    const referred = await db_1.models.user.findOne({ where: { id: referredId } });
    if (!referred)
        throw (0, error_1.createError)({ statusCode: 404, message: "Referred user not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching existing referral record");
    const existingReferral = await db_1.models.mlmReferral.findOne({ where: { id } });
    if (!existingReferral)
        throw (0, error_1.createError)({ statusCode: 404, message: "Referral record not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading MLM system settings");
    const { mlmSystem } = await (0, utils_2.getMlmSystemAndSettings)();
    if (mlmSystem !== "DIRECT" &&
        (existingReferral.referrerId !== referrerId ||
            existingReferral.referredId !== referredId)) {
        if (mlmSystem === "BINARY") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating binary node structure");
            await db_1.models.mlmBinaryNode.destroy({ where: { referralId: id } });
            await (0, affiliate_1.handleBinaryMlmReferralRegister)(referrerId, { id, referredId }, db_1.models.mlmBinaryNode);
        }
        else if (mlmSystem === "UNILEVEL") {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating unilevel node structure");
            await db_1.models.mlmUnilevelNode.destroy({ where: { referralId: id } });
            await (0, affiliate_1.handleUnilevelMlmReferralRegister)(referrerId, { id, referredId }, db_1.models.mlmUnilevelNode);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating referral record");
    const updatedReferral = await (0, query_1.updateRecord)("mlmReferral", id, {
        status,
        referrerId,
        referredId,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Referral updated successfully");
    return updatedReferral;
};
