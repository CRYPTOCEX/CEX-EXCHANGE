"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates an ecosystem token",
    description: "Updates an existing ecosystem token's metadata including status, limits, fees, and icon. Validates that the associated blockchain is active before allowing status changes. Automatically updates the token icon cache when a new icon is provided.",
    operationId: "updateEcosystemToken",
    tags: ["Admin", "Ecosystem", "Token"],
    logModule: "ADMIN_ECO",
    logTitle: "Update token",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the token to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Updated ecosystem token data",
        content: {
            "application/json": {
                schema: utils_1.ecosystemTokenUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Ecosystem token updated successfully",
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
    const { status, limits, fee, icon } = body;
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
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating token record");
        const updateResult = await (0, query_1.updateRecord)("ecosystemToken", id, {
            status,
            limits: JSON.stringify(limits),
            fee: JSON.stringify(fee),
            icon,
        }, true);
        if (updateResult && icon) {
            const updatedToken = await db_1.models.ecosystemToken.findByPk(id);
            if (updatedToken && updatedToken.currency) {
                try {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating token icon in cache");
                    await (0, utils_1.updateIconInCache)(updatedToken.currency, icon);
                }
                catch (error) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Failed to update icon in cache: ${error.message}`);
                    console.error(`Failed to update icon in cache for ${updatedToken.currency}:`, error);
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Token updated successfully");
        return updateResult;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        console.error(`Error updating ecosystem token:`, error);
        throw error;
    }
};
