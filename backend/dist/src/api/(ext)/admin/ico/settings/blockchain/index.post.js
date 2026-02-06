"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create ICO Blockchain Configuration",
    description: "Creates a new blockchain configuration for ICO token offerings. The blockchain must have a unique name and value identifier.",
    operationId: "createIcoBlockchain",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The display name of the blockchain",
                        },
                        value: {
                            type: "string",
                            description: "The unique value identifier for the blockchain",
                        },
                        status: {
                            type: "boolean",
                            description: "Status flag. Defaults to true if not provided",
                        },
                    },
                    required: ["name", "value"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Blockchain configuration created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Create blockchain configuration",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized access");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { name, value, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blockchain data");
    if (!name || !value) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: name, value and description",
        });
    }
    const statusFlag = status === undefined ? true : status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating blockchain configuration");
    await db_1.models.icoBlockchain.create({
        name,
        value,
        status: statusFlag,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blockchain configuration created successfully");
    return {
        message: "Blockchain configuration created successfully.",
    };
};
