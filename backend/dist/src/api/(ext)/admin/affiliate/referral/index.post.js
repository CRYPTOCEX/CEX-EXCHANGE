"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const utils_2 = require("@b/api/(ext)/affiliate/utils");
const affiliate_1 = require("@b/utils/affiliate");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Creates a new affiliate referral",
    description: "Creates a new affiliate referral relationship between two users. Automatically creates the appropriate MLM node structure (binary/unilevel) based on the system configuration. For DIRECT systems, only the referral record is created without node structures.",
    operationId: "createAffiliateReferral",
    tags: ["Admin", "Affiliate", "Referral"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.mlmReferralUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Affiliate referral created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.mlmReferralStoreSchema,
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        409: (0, errors_1.conflictResponse)("Referral"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.affiliate.referral",
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Create affiliate referral",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { status, referrerId, referredId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating referral data");
    if (referrerId === referredId)
        throw (0, error_1.createError)({ statusCode: 400, message: "Referrer and referred user cannot be the same" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying referrer user");
    const referrer = await db_1.models.user.findOne({ where: { id: referrerId } });
    if (!referrer)
        throw (0, error_1.createError)({ statusCode: 404, message: "Referrer not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying referred user");
    const referred = await db_1.models.user.findOne({ where: { id: referredId } });
    if (!referred)
        throw (0, error_1.createError)({ statusCode: 404, message: "Referred user not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating referral record");
    const newReferral = await (0, query_1.storeRecord)({
        model: "mlmReferral",
        data: {
            status,
            referrerId,
            referredId,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching MLM system settings");
    const { mlmSystem } = await (0, utils_2.getMlmSystemAndSettings)();
    if (mlmSystem === "DIRECT") {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Referral created successfully (DIRECT system)");
        return newReferral;
    }
    else if (mlmSystem === "BINARY") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating binary node structure");
        await (0, affiliate_1.handleBinaryMlmReferralRegister)(referrerId, newReferral, db_1.models.mlmBinaryNode);
    }
    else if (mlmSystem === "UNILEVEL") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating unilevel node structure");
        await (0, affiliate_1.handleUnilevelMlmReferralRegister)(referrerId, newReferral, db_1.models.mlmUnilevelNode);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Referral created successfully");
    return newReferral;
};
