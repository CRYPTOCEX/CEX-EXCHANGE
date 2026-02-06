"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const emails_1 = require("@b/utils/emails");
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
            description: "Email address to send the test email to",
            required: true,
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
};
exports.default = async (data) => {
    const { query } = data;
    const currentTime = new Date().toISOString();
    await emails_1.emailQueue.add({
        emailData: {
            TO: query.email,
            FIRSTNAME: query.name,
            TIME: currentTime,
        },
        emailType: "EmailTest",
    });
    return { message: "Test email sent successfully" };
};
