"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get gateway payout details",
    description: "Retrieves detailed information about a specific gateway payout including merchant details and payout period statistics.",
    operationId: "getGatewayPayout",
    tags: ["Admin", "Gateway", "Payout"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Payout UUID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "Payout details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "Payout object with merchant information",
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Payout"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.gateway.payout",
    demoMask: ["merchant.email", "merchant.phone"],
    logModule: "ADMIN_GATEWAY",
    logTitle: "Get payout details",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching payout details for ${id}`);
    const payout = await db_1.models.gatewayPayout.findByPk(id, {
        include: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "email", "phone"],
            },
        ],
    });
    if (!payout) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payout not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Payout not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved payout ${payout.payoutId}`);
    return payout;
};
