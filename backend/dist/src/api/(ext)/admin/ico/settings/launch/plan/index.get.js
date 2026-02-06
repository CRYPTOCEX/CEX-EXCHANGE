"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List ICO Launch Plans",
    description: "Retrieves all ICO launch plans ordered by sort order. Launch plans define pricing tiers and feature sets for token offering creators.",
    operationId: "getIcoLaunchPlans",
    tags: ["Admin", "ICO", "Settings"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Launch plans retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string", description: "Plan name" },
                                description: { type: "string", description: "Plan description" },
                                price: { type: "number", description: "Plan price" },
                                currency: { type: "string", description: "Currency code (e.g., USD)" },
                                walletType: { type: "string", description: "Wallet type for the plan" },
                                features: { type: "object", description: "Plan features in JSON format" },
                                recommended: { type: "boolean", description: "Whether this plan is recommended" },
                                status: { type: "boolean", description: "Whether the plan is active" },
                                sortOrder: { type: "number", description: "Sort order for display" },
                                createdAt: { type: "string", format: "date-time" },
                                updatedAt: { type: "string", format: "date-time" },
                                deletedAt: { type: "string", format: "date-time", nullable: true },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Get launch plans",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user permissions");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized access");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching launch plans");
    const launchPlans = await db_1.models.icoLaunchPlan.findAll({
        order: [["sortOrder", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${launchPlans.length} launch plans`);
    return launchPlans;
};
