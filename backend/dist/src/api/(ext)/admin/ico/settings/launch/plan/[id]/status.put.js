"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update ICO Launch Plan Status",
    description: "Updates only the status field of a launch plan. Used to enable or disable plans for token offering creators.",
    operationId: "updateIcoLaunchPlanStatus",
    tags: ["Admin", "ICO", "Settings"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the launch plan to update status",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "New status for the launch plan",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: { type: "boolean", description: "Plan status" },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Launch plan status updated successfully",
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
    logTitle: "Update launch plan status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating status field");
    if (status === undefined) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required field: status");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required field: status",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating launch plan status");
    const result = await (0, query_1.updateRecord)("icoLaunchPlan", id, { status });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Launch plan status updated successfully");
    return result;
};
