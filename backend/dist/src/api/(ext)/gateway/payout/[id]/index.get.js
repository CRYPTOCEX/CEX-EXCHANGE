"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = { summary: "Get payout details",
    description: "Gets detailed information about a specific payout for the current merchant.",
    operationId: "getMerchantPayoutDetails",
    tags: ["Gateway", "Merchant", "Payouts"],
    parameters: [
        { name: "id",
            in: "path",
            required: true,
            description: "Payout ID",
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Payout details",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get Payout",
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const merchant = await db_1.models.gatewayMerchant.findOne({ where: { userId: user.id },
    });
    if (!merchant) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Merchant account not found",
        });
    }
    const payout = await db_1.models.gatewayPayout.findOne({ where: { [sequelize_1.Op.or]: [
                { payoutId: id },
                { id: id },
            ],
            merchantId: merchant.id,
        },
    });
    if (!payout) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Payout not found",
        });
    }
    const payments = await db_1.models.gatewayPayment.findAll({ where: { merchantId: merchant.id,
            status: "COMPLETED",
            createdAt: { [sequelize_1.Op.between]: [payout.periodStart, payout.periodEnd],
            },
        },
        attributes: ["id", "paymentIntentId", "amount", "currency", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 50,
    });
    const refunds = await db_1.models.gatewayRefund.findAll({ where: { merchantId: merchant.id,
            status: "COMPLETED",
            createdAt: { [sequelize_1.Op.between]: [payout.periodStart, payout.periodEnd],
            },
        },
        attributes: ["id", "refundId", "amount", "currency", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 50,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { id: payout.payoutId,
        amount: payout.amount,
        currency: payout.currency,
        walletType: payout.walletType,
        status: payout.status,
        periodStart: payout.periodStart,
        periodEnd: payout.periodEnd,
        grossAmount: payout.grossAmount,
        feeAmount: payout.feeAmount,
        netAmount: payout.netAmount,
        paymentCount: payout.paymentCount,
        refundCount: payout.refundCount,
        metadata: payout.metadata,
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt,
        payments: payments.map((p) => ({ id: p.paymentIntentId,
            amount: p.amount,
            currency: p.currency,
            createdAt: p.createdAt,
        })),
        refunds: refunds.map((r) => ({ id: r.refundId,
            amount: r.amount,
            currency: r.currency,
            createdAt: r.createdAt,
        })),
    };
};
