"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const two_factor_code_1 = require("@b/utils/two-factor-code");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const db_1 = require("@b/db");
const sms_1 = require("@b/utils/sms");
const utils_1 = require("@b/api/auth/otp/utils");
const step_up_2fa_1 = require("@b/utils/step-up-2fa");
exports.metadata = {
    summary: "Sends the verification code for waiving a pool-backing obligation",
    description: "Delivers a one-time code over the admin's enrolled two-factor channel so a waive can be confirmed. Authenticator-app admins receive no message — they read the code from their app.",
    operationId: "startPoolBackingWaiveVerification",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "manage.pool.backing",
    middleware: ["withdrawVerificationSend"],
    logModule: "ADMIN_FIN",
    logTitle: "Send pool-backing waive verification code",
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Obligation id" },
    ],
    responses: {
        200: {
            description: "Verification code issued",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            type: { type: "string", description: "The 2FA channel the code was issued on" },
                            delivered: { type: "boolean", description: "True when a code was actually sent; false for authenticator apps" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        403: { description: "No accepted second factor on the admin's account" },
        404: (0, query_1.notFoundMetadataResponse)("Obligation"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const obligation = await db_1.models.poolBackingObligation.findByPk(id, { attributes: ["id", "status"] });
    if (!obligation)
        throw (0, error_1.createError)({ statusCode: 404, message: "Obligation not found" });
    if (String(obligation.status) !== "OPEN") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Obligation is ${obligation.status}, not OPEN`);
        throw (0, error_1.createError)({ statusCode: 400, message: `Only an OPEN obligation can be waived; this one is ${obligation.status}` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving the waive's 2FA policy");
    const policy = await (0, step_up_2fa_1.getStepUpPolicy)(step_up_2fa_1.POOL_BACKING_WAIVE_STEP_UP);
    const twoFactor = await (0, step_up_2fa_1.getUserTwoFactor)(String(user.id));
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
    if (enrolled.type === "APP") {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Authenticator app code required (nothing to send)");
        return { type: "APP", delivered: false, message: "Enter the current code from your authenticator app" };
    }
    const secret = (0, utils_1.resolveTwoFactorSecret)(enrolled);
    const otp = (0, two_factor_code_1.generateTwoFactorCode)(secret, enrolled.type);
    const account = await db_1.models.user.findByPk(String(user.id));
    if (!account) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    if (enrolled.type === "EMAIL") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Queueing the waive verification email");
        try {
            await emails_1.emailQueue.add({
                emailData: { TO: account.email, FIRSTNAME: account.firstName, TOKEN: otp },
                emailType: "OTPTokenVerification",
            });
        }
        catch (error) {
            console_1.logger.error("POOL_BACKING", "Failed to queue the waive verification email", error);
            throw (0, error_1.createError)({ statusCode: 500, message: "Could not send the verification code. Please try again." });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Waive verification code emailed");
        return { type: "EMAIL", delivered: true, message: "A verification code has been sent to your email" };
    }
    if (!account.phone) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No phone number on file");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No phone number is on file for SMS verification. Update your profile or switch 2FA method.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending the waive verification SMS");
    try {
        await (0, sms_1.sendSmsCode)(account.phone, otp, step_up_2fa_1.POOL_BACKING_WAIVE_STEP_UP.smsKind);
    }
    catch (error) {
        console_1.logger.error("POOL_BACKING", "Failed to send the waive verification SMS", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Could not send the verification code. Please try again." });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Waive verification code sent by SMS");
    return { type: "SMS", delivered: true, message: "A verification code has been sent to your phone" };
};
