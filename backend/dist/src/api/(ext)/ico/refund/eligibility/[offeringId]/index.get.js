"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Check Refund Eligibility",
    description: "Checks if an ICO offering is eligible for refunds and returns refund details",
    operationId: "checkRefundEligibility",
    tags: ["ICO", "Refunds"],
    logModule: "ICO",
    logTitle: "Get Refund Eligibility",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "offeringId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID of the ICO offering",
        },
    ],
    responses: {
        200: {
            description: "Refund eligibility information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            eligible: { type: "boolean" },
                            reason: { type: "string" },
                            offering: { type: "object" },
                            refundDetails: {
                                type: "object",
                                properties: {
                                    totalInvestors: { type: "number" },
                                    totalAmount: { type: "number" },
                                    pendingRefunds: { type: "number" },
                                    completedRefunds: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "Offering not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching refund eligibility");
    const { offeringId } = params;
    const offering = await db_1.models.icoTokenOffering.findByPk(offeringId, {
        attributes: [
            "id", "name", "symbol", "status", "targetAmount",
            "userId", "purchaseWalletCurrency", "startDate", "endDate"
        ],
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
    }
    const isOwner = offering.userId === user.id;
    const fullUser = await db_1.models.user.findByPk(user.id, {
        include: [{ model: db_1.models.role, as: "role" }]
    });
    const isAdmin = ((_a = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _a === void 0 ? void 0 : _a.name) === 'admin' || ((_b = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _b === void 0 ? void 0 : _b.name) === 'super_admin';
    const hasInvestment = await db_1.models.icoTransaction.count({
        where: {
            offeringId: offering.id,
            userId: user.id,
        }
    }) > 0;
    if (!isOwner && !isAdmin && !hasInvestment) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You don't have permission to view refund details"
        });
    }
    let eligible = false;
    let reason = "";
    const now = new Date();
    const totalRaisedResult = await db_1.models.icoTransaction.findOne({
        where: {
            offeringId: offering.id,
            status: { [sequelize_1.Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED', 'REFUNDED'] }
        },
        attributes: [
            [db_1.sequelize.fn('SUM', db_1.sequelize.literal('amount * price')), 'totalRaised']
        ],
        raw: true,
    });
    const totalRaised = parseFloat(totalRaisedResult === null || totalRaisedResult === void 0 ? void 0 : totalRaisedResult.totalRaised) || 0;
    const softCap = offering.targetAmount * 0.3;
    if (offering.status === 'FAILED' || offering.status === 'CANCELLED') {
        eligible = true;
        reason = `Offering ${offering.status.toLowerCase()}`;
    }
    else if (offering.status === 'REFUNDED') {
        eligible = false;
        reason = "Refunds already processed";
    }
    else if (now > offering.endDate && totalRaised < softCap) {
        eligible = true;
        reason = "Soft cap not reached after offering ended";
    }
    else if (offering.status === 'ACTIVE' && now > offering.endDate) {
        eligible = false;
        reason = "Offering ended successfully";
    }
    else {
        eligible = false;
        reason = "Offering is still active or completed successfully";
    }
    const transactions = await db_1.models.icoTransaction.findAll({
        where: { offeringId: offering.id },
        attributes: ["status", "amount", "price", "userId"],
    });
    const refundDetails = {
        totalInvestors: 0,
        totalAmount: 0,
        pendingRefunds: 0,
        completedRefunds: 0,
    };
    const uniqueInvestors = new Set();
    for (const tx of transactions) {
        if (['PENDING', 'VERIFICATION', 'RELEASED', 'REFUND_PENDING', 'REFUNDED'].includes(tx.status)) {
            uniqueInvestors.add(tx.userId);
            const amount = tx.amount * tx.price;
            refundDetails.totalAmount += amount;
            if (tx.status === 'REFUNDED') {
                refundDetails.completedRefunds++;
            }
            else if (['PENDING', 'VERIFICATION', 'REFUND_PENDING'].includes(tx.status)) {
                refundDetails.pendingRefunds++;
            }
        }
    }
    refundDetails.totalInvestors = uniqueInvestors.size;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Refund Eligibility retrieved successfully");
    return {
        eligible,
        reason,
        offering: {
            id: offering.id,
            name: offering.name,
            symbol: offering.symbol,
            status: offering.status,
            targetAmount: offering.targetAmount,
            totalRaised,
            softCap,
            currency: offering.purchaseWalletCurrency,
            startDate: offering.startDate,
            endDate: offering.endDate,
        },
        refundDetails,
    };
};
