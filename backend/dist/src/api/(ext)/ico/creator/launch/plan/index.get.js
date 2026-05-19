"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Launch Plans",
    description: "Retrieves all launch plans for ICO admin.",
    operationId: "getLaunchPlans",
    tags: ["ICO", "Admin", "LaunchPlans"],
    logModule: "ICO",
    logTitle: "Get launch plans",
    requiresAuth: true,
    responses: {
        200: {
            description: "Launch plans retrieved successfully.",
            content: {
                "application/json": {
                    schema: { type: "array", items: { type: "object" } },
                },
            },
        },
        401: { description: "Unauthorized – Admin privileges required." },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching launch plans");
    const launchPlans = await db_1.models.icoLaunchPlan.findAll({
        order: [["sortOrder", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${launchPlans.length} launch plans`);
    return launchPlans;
};
