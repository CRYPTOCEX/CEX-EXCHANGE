"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = { summary: "Get payment details",
    description: "Gets detailed payment information for merchants.",
    operationId: "getMerchantPayment",
    tags: ["Gateway", "Merchant", "Payments"],
    parameters: [
        { name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Payment details",
        },
        404: { description: "Payment not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get Payment",
    demoMask: ["customerEmail"],
};
exports.default = async (data) => {
    var _a;
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
    const payment = await db_1.models.gatewayPayment.findOne({ where: { paymentIntentId: id,
            merchantId: merchant.id,
        },
        include: [
            { model: db_1.models.gatewayRefund,
                as: "gatewayRefunds",
                attributes: ["refundId", "amount", "status", "reason", "createdAt"],
            },
        ],
    });
    if (!payment) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Payment not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { id: payment.paymentIntentId,
        orderId: payment.merchantOrderId,
        amount: payment.amount,
        currency: payment.currency,
        walletType: payment.walletType,
        feeAmount: payment.feeAmount,
        netAmount: payment.netAmount,
        status: payment.status,
        description: payment.description,
        metadata: payment.metadata,
        allocations: payment.allocations,
        lineItems: payment.lineItems,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        billingAddress: payment.billingAddress,
        testMode: payment.testMode,
        expiresAt: payment.expiresAt,
        completedAt: payment.completedAt,
        createdAt: payment.createdAt,
        refunds: (_a = payment.gatewayRefunds) === null || _a === void 0 ? void 0 : _a.map((r) => ({ id: r.refundId,
            amount: r.amount,
            status: r.status,
            reason: r.reason,
            createdAt: r.createdAt,
        })),
    };
};
