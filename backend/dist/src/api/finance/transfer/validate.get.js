"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Validate recipient for transfer",
    description: "Validates if a recipient UUID exists for transfer operations",
    operationId: "validateTransferRecipient",
    tags: ["Finance", "Transfer"],
    requiresAuth: true,
    parameters: [
        {
            name: "uuid",
            in: "query",
            required: true,
            schema: {
                type: "string",
                description: "The UUID of the recipient to validate",
            },
        },
    ],
    responses: {
        200: {
            description: "Recipient validation result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            exists: {
                                type: "boolean",
                                description: "Whether the recipient exists",
                            },
                            recipient: {
                                type: "object",
                                description: "Recipient information if found",
                                properties: {
                                    id: { type: "string" },
                                    firstName: { type: "string" },
                                    lastName: { type: "string" },
                                    email: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Recipient"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { uuid } = query;
    if (!uuid || typeof uuid !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Recipient UUID is required",
        });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
        return {
            exists: false,
            message: "Invalid UUID format",
        };
    }
    try {
        const recipient = await db_1.models.user.findOne({
            where: {
                id: uuid,
            },
            attributes: ["id", "firstName", "lastName", "email", "status"],
        });
        if (!recipient) {
            return {
                exists: false,
                message: "Recipient not found",
            };
        }
        if (recipient.id === user.id) {
            return {
                exists: false,
                message: "Cannot transfer to yourself",
            };
        }
        if (recipient.status !== "ACTIVE") {
            return {
                exists: false,
                message: "Recipient account is inactive",
            };
        }
        return {
            exists: true,
            recipient: {
                id: recipient.id,
                firstName: recipient.firstName,
                lastName: recipient.lastName,
                email: recipient.email,
            },
        };
    }
    catch (error) {
        console_1.logger.error("TRANSFER", "Error validating recipient", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to validate recipient",
        });
    }
};
