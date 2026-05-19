"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Reject gateway payout",
    description: "Rejects a pending payout request. Funds remain in merchant's gateway balance (escrow). Requires a rejection reason for audit trail. Updates payout status to CANCELLED and sends notification to merchant.",
    operationId: "rejectGatewayPayout",
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
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            description: "Reason for rejection (required)",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Payout rejected successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            payout: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    payoutId: { type: "string" },
                                    amount: { type: "number" },
                                    currency: { type: "string" },
                                    status: { type: "string" },
                                    rejectionReason: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Payout"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.gateway.payout",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Reject payout",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, user, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating rejection reason");
    if (!((_a = body === null || body === void 0 ? void 0 : body.reason) === null || _a === void 0 ? void 0 : _a.trim())) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Rejection reason is required");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Rejection reason is required",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up payout ${id}`);
    const payout = await db_1.models.gatewayPayout.findByPk(id, {
        include: [
            {
                model: db_1.models.gatewayMerchant,
                as: "merchant",
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
    if (!payout.merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant not found for payout");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant not found for payout",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating payout status");
    if (payout.status !== "PENDING") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot reject payout with status: ${payout.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot reject payout with status: ${payout.status}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying merchant balance");
    const merchantBalance = await db_1.models.gatewayMerchantBalance.findOne({
        where: {
            merchantId: payout.merchantId,
            currency: payout.currency,
            walletType: payout.walletType,
        },
    });
    const pendingAmount = parseFloat(((_b = merchantBalance === null || merchantBalance === void 0 ? void 0 : merchantBalance.pending) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
    if (pendingAmount < payout.amount) {
        console_1.logger.warn("ADMIN_GATEWAY_PAYOUT", `Payout ${payout.payoutId} rejection: Funds mismatch. Expected ${payout.amount}, found ${pendingAmount} in gateway balance.`);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating payout status to CANCELLED");
    await payout.update({
        status: "CANCELLED",
        processedAt: new Date(),
        metadata: {
            ...(payout.metadata || {}),
            rejectedBy: user.id,
            rejectedAt: new Date().toISOString(),
            rejectionReason: body.reason.trim(),
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification to merchant");
    try {
        await (0, notifications_1.createNotification)({
            userId: payout.merchant.userId,
            relatedId: payout.id,
            type: "system",
            title: "Payout Rejected",
            message: `Your payout request for ${payout.amount.toFixed(2)} ${payout.currency} has been rejected. Reason: ${body.reason.trim()}`,
            link: `/gateway/payouts`,
        }, ctx);
    }
    catch (notifErr) {
        console_1.logger.error("ADMIN_GATEWAY_PAYOUT", "Failed to send payout rejection notification", notifErr);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Payout ${payout.payoutId} rejected successfully`);
    return {
        message: "Payout rejected",
        payout: {
            id: payout.id,
            payoutId: payout.payoutId,
            amount: payout.amount,
            currency: payout.currency,
            status: "CANCELLED",
            rejectionReason: body.reason.trim(),
        },
    };
};
