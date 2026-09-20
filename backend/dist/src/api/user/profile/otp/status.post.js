"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.toggleOTPQuery = toggleOTPQuery;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/auth/otp/utils");
const user_activity_1 = require("@b/utils/user-activity");
exports.metadata = {
    summary: "Toggles the OTP feature for the user account",
    operationId: "toggleOTP",
    description: "Toggles the OTP feature for the user account",
    tags: ["Profile"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Toggle OTP status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "Status of the OTP feature",
                        },
                        password: {
                            type: "string",
                            description: "Current account password. One of `password` or `otp` is " +
                                "required when disabling 2FA.",
                        },
                        otp: {
                            type: "string",
                            description: "A current code from the enrolled two-factor method. Accepted " +
                                "in place of the password when disabling 2FA — and the only " +
                                "proof an account with no password (Google or wallet sign-in) " +
                                "can give.",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP feature toggled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Indicates if the request was successful",
                            },
                            statusCode: {
                                type: "number",
                                description: "HTTP status code",
                                example: 200,
                            },
                            data: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                        description: "Message indicating the status of the OTP feature",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { status, password, otp } = body;
    if (!status) {
        const twoFactor = await db_1.models.twoFactor.findOne({
            where: { userId: user.id },
        });
        if (!twoFactor) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("No 2FA method is enrolled");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "TwoFactor record not found",
            });
        }
        await (0, utils_1.assertDisableProof)(user.id, twoFactor, { otp, password });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`${status ? "Enabling" : "Disabling"} OTP feature`);
    await toggleOTPQuery(user.id, status);
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: status ? "security.2fa_enabled" : "security.2fa_disabled",
        title: status
            ? "Two-factor authentication enabled"
            : "Two-factor authentication disabled",
        description: status
            ? "2FA turned on for this account"
            : "2FA turned off for this account",
        severity: status ? "success" : "warning",
        req: data,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`OTP feature ${status ? "enabled" : "disabled"}`);
    return { message: `OTP feature has been ${status ? "enabled" : "disabled"}` };
};
async function toggleOTPQuery(userId, status) {
    await db_1.models.twoFactor.update({
        enabled: status,
    }, {
        where: { userId: userId },
    });
    const twoFactor = await db_1.models.twoFactor.findOne({
        where: { userId: userId },
    });
    if (!twoFactor) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "TwoFactor record not found",
        });
    }
    return twoFactor.get({ plain: true });
}
