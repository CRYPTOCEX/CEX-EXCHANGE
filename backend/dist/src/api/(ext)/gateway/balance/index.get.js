"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = { summary: "Get merchant balance",
    description: "Gets the merchant's balance across all currencies.",
    operationId: "getMerchantBalance",
    tags: ["Gateway", "Merchant", "Balance"],
    responses: { 200: { description: "Balance information",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get Gateway Balance",
};
exports.default = async (data) => {
    const { user, ctx } = data;
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
    const balances = await db_1.models.gatewayMerchantBalance.findAll({ where: { merchantId: merchant.id },
        order: [["currency", "ASC"]],
    });
    let totalAvailable = 0;
    let totalPending = 0;
    let totalReserved = 0;
    const balanceList = balances.map((b) => {
        totalAvailable += parseFloat(String(b.available));
        totalPending += parseFloat(String(b.pending));
        totalReserved += parseFloat(String(b.reserved));
        return { currency: b.currency,
            walletType: b.walletType,
            available: b.available,
            pending: b.pending,
            reserved: b.reserved,
            totalReceived: b.totalReceived,
            totalRefunded: b.totalRefunded,
            totalFees: b.totalFees,
            totalPaidOut: b.totalPaidOut,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { balances: balanceList,
        summary: { totalAvailable,
            totalPending,
            totalReserved,
        },
        payoutSettings: { schedule: merchant.payoutSchedule,
            threshold: merchant.payoutThreshold,
            defaultCurrency: merchant.defaultCurrency,
        },
    };
};
