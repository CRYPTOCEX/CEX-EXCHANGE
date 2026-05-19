"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update gateway merchant verification",
    description: "Updates the verification status of a gateway merchant account. Verification status indicates whether the merchant's identity and business documentation has been reviewed: UNVERIFIED (no verification submitted), PENDING (under review), or VERIFIED (approved).",
    operationId: "updateGatewayMerchantVerification",
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
                        verificationStatus: {
                            type: "string",
                            enum: ["UNVERIFIED", "PENDING", "VERIFIED"],
                            description: "New verification status",
                        },
                    },
                    required: ["verificationStatus"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Verification status updated successfully",
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
                                    verificationStatus: { type: "string" },
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
    logTitle: "Update merchant verification",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { verificationStatus } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating verification status for merchant ${id}`);
    const validStatuses = ["UNVERIFIED", "PENDING", "VERIFIED"];
    if (!validStatuses.includes(verificationStatus)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Invalid verification status: ${verificationStatus}`);
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating verification status to ${verificationStatus}`);
    await merchant.update({ verificationStatus });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Merchant verification updated to ${verificationStatus}`);
    return {
        message: `Merchant verification updated to ${verificationStatus}`,
        merchant: {
            id: merchant.id,
            name: merchant.name,
            verificationStatus: merchant.verificationStatus,
        },
    };
};
