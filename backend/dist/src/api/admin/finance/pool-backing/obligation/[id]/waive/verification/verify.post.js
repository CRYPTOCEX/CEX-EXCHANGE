"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const redis_1 = require("@b/utils/redis");
const db_1 = require("@b/db");
const utils_1 = require("@b/api/auth/otp/utils");
const step_up_2fa_1 = require("@b/utils/step-up-2fa");
const OTP_MAX_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW_SECONDS = 600;
exports.metadata = {
    summary: "Verifies the two-factor code for waiving a pool-backing obligation",
    description: "Checks a one-time code (or recovery code) and returns a short-lived, single-use token that authorises waiving THIS obligation, sent to the waive route as `twoFactorToken`.",
    operationId: "verifyPoolBackingWaiveVerification",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "manage.pool.backing",
    middleware: ["withdrawVerificationVerify"],
    logModule: "ADMIN_FIN",
    logTitle: "Verify pool-backing waive 2FA code",
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Obligation id" },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        otp: { type: "string", description: "One-time code from the admin's 2FA method, or a recovery code" },
                    },
                    required: ["otp"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Code verified",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            twoFactorToken: { type: "string", description: "Single-use token to send as `twoFactorToken` with the waive" },
                            expiresAt: { type: "number", description: "Epoch milliseconds at which the token expires" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        403: { description: "No accepted second factor on the admin's account" },
        404: (0, query_1.notFoundMetadataResponse)("Obligation"),
        429: { description: "Too many verification attempts" },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const userId = String(user.id);
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const otp = typeof (body === null || body === void 0 ? void 0 : body.otp) === "string" ? body.otp.trim() : "";
    if (!otp) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing verification code");
        throw (0, error_1.createError)({ statusCode: 400, message: "A verification code is required" });
    }
    const obligation = await db_1.models.poolBackingObligation.findByPk(id, { attributes: ["id", "status"] });
    if (!obligation)
        throw (0, error_1.createError)({ statusCode: 404, message: "Obligation not found" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving the waive's 2FA policy");
    const policy = await (0, step_up_2fa_1.getStepUpPolicy)(step_up_2fa_1.POOL_BACKING_WAIVE_STEP_UP);
    const twoFactor = await (0, step_up_2fa_1.getUserTwoFactor)(userId);
    if (!(0, step_up_2fa_1.satisfiesPolicy)(policy, twoFactor)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No accepted two-factor method enabled");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: policy.blockedReason
                ? `Writing off money requires a second factor, and none can be verified on this platform right now: ${policy.blockedReason}.`
                : `Writing off money requires ${(0, step_up_2fa_1.describeAcceptedTypes)(policy.acceptedTypes)} two-factor authentication. Enable it on your own account in your profile security settings first.`,
        });
    }
    const enrolled = twoFactor;
    const redis = redis_1.RedisSingleton.getInstance();
    const rateKey = `pool-backing-waive-2fa-attempts:${userId}`;
    const attempts = await redis.incr(rateKey);
    if (attempts === 1) {
        await redis.expire(rateKey, OTP_ATTEMPT_WINDOW_SECONDS);
    }
    if (attempts > OTP_MAX_ATTEMPTS) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Too many verification attempts");
        throw (0, error_1.createError)({
            statusCode: 429,
            message: "Too many verification attempts. Please wait a few minutes before trying again.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying code");
    const secret = (0, utils_1.resolveTwoFactorSecret)(enrolled);
    if (!(await (0, utils_1.consumeEnrolledOtp)(userId, secret, otp, enrolled.type))) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Code invalid, checking recovery codes");
        await (0, utils_1.consumeRecoveryCode)({ id: enrolled.id, recoveryCodes: enrolled.recoveryCodes }, otp);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recovery code accepted");
    }
    await redis.del(rateKey);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Issuing the waive authorisation token for obligation ${id}`);
    const { token, expiresAt } = await (0, step_up_2fa_1.issueStepUpToken)(step_up_2fa_1.POOL_BACKING_WAIVE_STEP_UP, userId, (0, step_up_2fa_1.poolBackingWaiveBinding)(id));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Waive two-factor verification passed");
    return { twoFactorToken: token, expiresAt };
};
