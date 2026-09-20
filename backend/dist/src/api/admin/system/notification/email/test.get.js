"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Tests the emailer system with a sample email",
    operationId: "testEmailerSystem",
    tags: ["Admin", "Notifications"],
    parameters: [
        {
            name: "name",
            in: "query",
            description: "Name for the test email",
            required: false,
            schema: {
                type: "string",
            },
        },
        {
            name: "email",
            in: "query",
            description: "Ignored for security. The test email is always sent to the calling admin's own account email to prevent open-relay abuse.",
            required: false,
            schema: {
                type: "string",
                format: "email",
            },
        },
    ],
    responses: {
        200: {
            description: "Test email sent successfully",
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
        401: {
            description: "Unauthorized, permission required to test emailer",
        },
        500: {
            description: "Internal server error or email sending failed",
        },
    },
    requiresAuth: true,
    permission: "access.notification.settings",
};
exports.default = async (data) => {
    const { query, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const admin = await db_1.models.user.findByPk(user.id, {
        attributes: ["email", "firstName"],
    });
    if (!admin || !admin.email) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Your account has no email address to receive the test email",
        });
    }
    const currentTime = new Date().toISOString();
    if ((0, emails_1.mailDisabled)()) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "MAIL_DISABLED is set in .env, so no mail can be sent. Unset it (or set it to false) and restart the backend, then try again.",
        });
    }
    await emails_1.emailQueue.add({
        emailData: {
            TO: admin.email,
            FIRSTNAME: query.name || admin.firstName,
            TIME: currentTime,
        },
        emailType: "EmailTest",
    });
    return {
        message: `Test email queued for ${admin.email}. Delivery is not confirmed by this check — look for it in that inbox, and check the EMAIL log if it does not arrive.`,
    };
};
