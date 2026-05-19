"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Set Recommended ICO Launch Plan",
    description: "Updates the recommended flag for a launch plan. When setting recommended to true, automatically clears the flag from all other plans to ensure only one plan is recommended at a time.",
    operationId: "setRecommendedIcoLaunchPlan",
    tags: ["Admin", "ICO", "Settings"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the launch plan to update recommended flag",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Request body must contain the recommended flag",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        recommended: {
                            type: "boolean",
                            description: "Recommended flag. When true, this plan will be the only recommended plan; when false, this plan will be marked as not recommended",
                        },
                    },
                    required: ["recommended"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Launch plan recommended status updated successfully",
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
    logTitle: "Set recommended launch plan",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { recommended } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating recommended flag");
    if (typeof recommended !== "boolean") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid recommended flag type");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "The recommended flag must be a boolean",
        });
    }
    if (recommended) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing existing recommended plans");
        const recommendedPlans = await db_1.models.icoLaunchPlan.findAll({
            where: { recommended: true },
        });
        await Promise.all(recommendedPlans.map((plan) => (0, query_1.updateRecord)("icoLaunchPlan", plan.id, { recommended: false })));
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Setting recommended flag");
    const result = await (0, query_1.updateRecord)("icoLaunchPlan", id, { recommended });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Launch plan recommended flag updated successfully");
    return result;
};
