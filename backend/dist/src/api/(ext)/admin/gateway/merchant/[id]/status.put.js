"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update gateway merchant status",
    description: "Updates the operational status of a gateway merchant account. Status determines whether the merchant can process payments: PENDING (awaiting approval), ACTIVE (can process payments), SUSPENDED (temporarily disabled), or REJECTED (permanently denied).",
    operationId: "updateGatewayMerchantStatus",
    tags: ["Admin", "Gateway", "Merchant"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Merchant UUID",
            schema: { type: "string", format: "uuid" },
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
                            type: "string",
                            enum: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"],
                            description: "New merchant status",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Merchant status updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            merchant: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    status: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Merchant"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.gateway.merchant",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Update merchant status",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating status for merchant ${id}`);
    const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];
    if (!validStatuses.includes(status)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid status: ${status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding merchant ${id}`);
    const merchant = await db_1.models.gatewayMerchant.findByPk(id);
    if (!merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating merchant status to ${status}`);
    await merchant.update({ status });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Merchant status updated to ${status}`);
    return {
        message: `Merchant status updated to ${status}`,
        merchant: {
            id: merchant.id,
            name: merchant.name,
            status: merchant.status,
        },
    };
};
