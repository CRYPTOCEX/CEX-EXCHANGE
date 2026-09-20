"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const token_1 = require("@b/utils/token");
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const user_activity_1 = require("@b/utils/user-activity");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Emails a link that lets a password-less account set a password",
    description: "For accounts created through Google or a connected wallet, sends the signed-in user a one-time link to set an account password. Completing that link signs the user out on every device, which is correct for a first credential.",
    operationId: "requestPasswordSetupLink",
    tags: ["User", "Profile"],
    requiresAuth: true,
    middleware: ["passwordChangeCodeSend"],
    logModule: "PASSWORD",
    logTitle: "Request password setup link",
    responses: {
        200: {
            description: "Setup link sent",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        400: { description: "Account already has a password, or no verified email" },
        401: query_1.unauthorizedResponse,
        403: { description: "Caller is not an interactive session" },
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (0, utils_1.assertSessionCaller)(data);
    const account = await db_1.models.user.findByPk(user.id);
    if (!account) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User account not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    if (account.password) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account already has a password");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This account already has a password. Use Change password instead.",
        });
    }
    if (!account.email) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No email address on file");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No email address is on file for this account, so a setup link cannot be sent.",
        });
    }
    if (!account.emailVerified) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email address is not verified");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Verify your email address first — the setup link is how you prove you own this account.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating password setup token");
    const resetToken = await (0, token_1.generateResetToken)({ user: { id: account.id } });
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending password setup email");
        await emails_1.emailQueue.add({
            emailData: {
                TO: account.email,
                FIRSTNAME: account.firstName,
                LAST_LOGIN: account.lastLogin,
                TOKEN: resetToken,
            },
            emailType: "PasswordReset",
        });
    }
    catch (error) {
        console_1.logger.error("PASSWORD", "Failed to queue password setup email", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Could not send the setup link. Please try again.",
        });
    }
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.password_reset",
        title: "Password setup link requested",
        description: "A link to set an account password was emailed",
        severity: "info",
        req: data,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Password setup link sent");
    return {
        message: "We've emailed you a link to set your password.",
    };
};
