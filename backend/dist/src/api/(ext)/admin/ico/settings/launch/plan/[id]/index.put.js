"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update ICO Launch Plan",
    description: "Updates an existing ICO launch plan configuration including pricing, features, and display settings.",
    operationId: "updateIcoLaunchPlan",
    tags: ["Admin", "ICO", "Settings"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the launch plan to update",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "New data for the launch plan configuration",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Plan name" },
                        description: { type: "string", description: "Plan description" },
                        price: { type: "number", description: "Plan price" },
                        currency: { type: "string", description: "Currency code" },
                        walletType: { type: "string", description: "Wallet type" },
                        features: { type: "object", description: "Plan features" },
                        recommended: { type: "boolean", description: "Is recommended" },
                        status: { type: "boolean", description: "Plan status" },
                        sortOrder: { type: "number", description: "Sort order" },
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
            description: "Launch plan updated successfully",
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
        404: (0, errors_1.notFoundResponse)("Launch Plan"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Update launch plan",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating launch plan");
    const result = await (0, query_1.updateRecord)("icoLaunchPlan", id, {
        name,
        description,
        price,
        currency,
        walletType,
        features,
        recommended: recommended || false,
        status: status === undefined ? true : status,
        sortOrder: sortOrder || 0,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Launch plan updated successfully");
    return result;
};
