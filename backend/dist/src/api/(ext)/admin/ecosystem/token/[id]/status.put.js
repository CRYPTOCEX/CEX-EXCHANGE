"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an ecosystem token status",
    description: "Updates the status (active/inactive) of a specific ecosystem token. Validates that the associated blockchain is active before allowing the token to be enabled.",
    operationId: "updateEcosystemTokenStatus",
    tags: ["Admin", "Ecosystem", "Token"],
    logModule: "ADMIN_ECO",
    logTitle: "Update token status",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the token to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Ecosystem token status updated successfully",
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
        400: errors_1.badRequestResponse,
        401: query_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecosystem Token"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ecosystem.token",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token exists");
    const token = await db_1.models.ecosystemToken.findByPk(id);
    if (!token) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Token with ID ${id} not found` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking blockchain status");
    const blockchain = await db_1.models.ecosystemBlockchain.findOne({
        where: { chain: token.chain },
    });
    if (blockchain && !blockchain.status) {
        if (blockchain.version === "0.0.1") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Please install the latest version of the blockchain ${token.chain} to enable this token`
            });
        }
        else {
            throw (0, error_1.createError)({ statusCode: 400, message: `${token.chain} Blockchain is disabled` });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating token status to ${status}`);
    const result = await (0, query_1.updateStatus)("ecosystemToken", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Token status updated successfully");
    return result;
};
