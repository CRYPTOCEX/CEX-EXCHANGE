"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Approve gateway payout",
    description: "Approves a pending payout request and transfers funds from merchant gateway balance to their wallet. Validates merchant balance, processes payout transaction with locking to prevent concurrent approvals, updates status, and sends notification to merchant.",
    operationId: "approveGatewayPayout",
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
            description: "Payout approved successfully",
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
                                    processedAt: { type: "string", format: "date-time" },
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
    logTitle: "Approve payout",
};
exports.default = async (data) => {
    var _a;
    const { params, user, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
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
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot approve payout with status: ${payout.status}`);
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot approve payout with status: ${payout.status}`,
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
    if (!merchantBalance) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant gateway balance not found");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Merchant gateway balance not found for ${payout.currency} (${payout.walletType})`,
        });
    }
    const pendingBalance = parseFloat(((_a = merchantBalance.pending) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
    if (pendingBalance < payout.amount) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Insufficient funds for payout");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Insufficient funds for payout. Required: ${payout.amount}, Available in gateway balance: ${pendingBalance}. Funds may have been refunded.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing payout of ${payout.amount} ${payout.currency}`);
    await db_1.sequelize.transaction(async (t) => {
        const lockedPayout = await db_1.models.gatewayPayout.findByPk(payout.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!lockedPayout || lockedPayout.status !== "PENDING") {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Payout is no longer available for approval",
            });
        }
        await (0, gateway_1.processGatewayPayout)({
            merchantUserId: payout.merchant.userId,
            merchantId: payout.merchantId,
            currency: payout.currency,
            walletType: payout.walletType,
            amount: payout.amount,
            payoutId: payout.payoutId,
            transaction: t,
        });
        await lockedPayout.update({
            status: "COMPLETED",
            processedAt: new Date(),
            metadata: {
                ...(lockedPayout.metadata || {}),
                approvedBy: user.id,
                approvedAt: new Date().toISOString(),
            },
        }, { transaction: t });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification to merchant");
    try {
        await (0, notifications_1.createNotification)({
            userId: payout.merchant.userId,
            relatedId: payout.id,
            type: "system",
            title: "Payout Approved",
            message: `Your payout of ${payout.amount.toFixed(2)} ${payout.currency} has been approved and funds are now available in your wallet.`,
            link: `/gateway/payouts`,
        }, ctx);
    }
    catch (notifErr) {
        console_1.logger.error("ADMIN_GATEWAY_PAYOUT", "Failed to send payout approval notification", notifErr);
    }
    await payout.reload();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Payout ${payout.payoutId} approved successfully`);
    return {
        message: "Payout approved successfully",
        payout: {
            id: payout.id,
            payoutId: payout.payoutId,
            amount: payout.amount,
            currency: payout.currency,
            status: payout.status,
            processedAt: payout.processedAt,
        },
    };
};
