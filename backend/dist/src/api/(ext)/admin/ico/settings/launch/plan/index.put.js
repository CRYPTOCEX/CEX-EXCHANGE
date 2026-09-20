"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Reorder ICO Launch Plans",
    description: "Bulk updates the sort order for launch plans. Accepts an array of objects with plan IDs and their new sortOrder values to reposition plans in the display sequence.",
    operationId: "reorderIcoLaunchPlans",
    tags: ["Admin", "ICO", "Settings"],
    requestBody: {
        description: "Array of launch plans with new sortOrder values",
        content: {
            "application/json": {
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            sortOrder: { type: "number" },
                        },
                        required: ["id", "sortOrder"],
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Launch plans reordered successfully",
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
    requiresAuth: true,
    permission: "edit.ico.settings",
    logModule: "ADMIN_ICO",
    logTitle: "Reorder launch plans",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request body");
    if (!Array.isArray(body)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid request body format");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Request body must be an array of launch plans",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Reordering ${body.length} launch plans`);
    const updatePromises = body.map((plan) => {
        if (!plan.id || typeof plan.sortOrder !== "number") {
            return Promise.resolve();
        }
        return (0, query_1.updateRecord)("icoLaunchPlan", plan.id, {
            sortOrder: plan.sortOrder,
        });
    });
    await Promise.all(updatePromises);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Launch plans reordered successfully");
    return { message: "Launch plans reordered successfully" };
};
