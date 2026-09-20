"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Deletes an ecosystem token",
    description: "Deletes a specific ecosystem token by its ID. This operation performs a soft delete, marking the token as deleted without permanently removing it from the database.",
    operationId: "deleteEcosystemToken",
    tags: ["Admin", "Ecosystem", "Token"],
    parameters: (0, query_1.deleteRecordParams)("Ecosystem Token"),
    responses: {
        200: {
            description: "Ecosystem token deleted successfully",
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
        401: query_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "delete.ecosystem.token",
    logModule: "ADMIN_ECO",
    logTitle: "Delete token",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting token");
    const result = await (0, query_1.handleSingleDelete)({
        model: "ecosystemToken",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token deleted successfully");
    return result;
};
