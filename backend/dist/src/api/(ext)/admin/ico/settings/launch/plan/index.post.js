"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Create ICO Launch Plan",
    description: "Creates a new ICO launch plan with pricing and feature configuration. Launch plans define what features and limits token offering creators get based on their subscription tier.",
    operationId: "createIcoLaunchPlan",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "The plan name" },
                        description: { type: "string", description: "Plan description" },
                        price: { type: "number", description: "Plan price" },
                        currency: {
                            type: "string",
                            description: "Currency code (e.g., USD)",
                        },
                        walletType: {
                            type: "string",
                            description: "Wallet type for the plan",
                        },
                        features: {
                            type: "object",
                            description: "Plan features in JSON format",
                        },
                        recommended: {
                            type: "boolean",
                            description: "If this plan is recommended",
                        },
                        status: {
                            type: "boolean",
                            description: "Plan status. Defaults to true if not provided",
                        },
                        sortOrder: {
                            type: "number",
                            description: "Sort order of the plan",
                        },
                    },
                    required: [
                        "name",
                        "description",
                        "price",
                        "currency",
                        "walletType",
                        "features",
                    ],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Launch plan created successfully",
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
    logTitle: "Create launch plan",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized access");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { name, description, price, currency, walletType, features, recommended, status, sortOrder, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating launch plan data");
    if (!name ||
        !description ||
        price === undefined ||
        !currency ||
        !walletType ||
        !features) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: name, description, price, currency, walletType, features",
        });
    }
    const statusFlag = status === undefined ? true : status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating launch plan");
    await db_1.models.icoLaunchPlan.create({
        name,
        description,
        price,
        currency,
        walletType,
        features,
        recommended: recommended || false,
        status: statusFlag,
        sortOrder: sortOrder || 0,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Launch plan created successfully");
    return {
        message: "Launch plan created successfully.",
    };
};
