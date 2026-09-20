"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/currency/utils");
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
    const availableByCurrency = {};
    const pendingByCurrency = {};
    const reservedByCurrency = {};
    const paidOutByCurrency = {};
    const balanceList = balances.map((b) => {
        availableByCurrency[b.currency] = (availableByCurrency[b.currency] || 0) + (parseFloat(String(b.available)) || 0);
        pendingByCurrency[b.currency] = (pendingByCurrency[b.currency] || 0) + (parseFloat(String(b.pending)) || 0);
        reservedByCurrency[b.currency] = (reservedByCurrency[b.currency] || 0) + (parseFloat(String(b.reserved)) || 0);
        paidOutByCurrency[b.currency] = (paidOutByCurrency[b.currency] || 0) + (parseFloat(String(b.totalPaidOut)) || 0);
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
    const [available, pending, reserved, paidOut] = await Promise.all([
        (0, utils_1.sumInUSD)(availableByCurrency),
        (0, utils_1.sumInUSD)(pendingByCurrency),
        (0, utils_1.sumInUSD)(reservedByCurrency),
        (0, utils_1.sumInUSD)(paidOutByCurrency),
    ]);
    const unpricedCurrencies = [
        ...new Set([
            ...available.unpriced,
            ...pending.unpriced,
            ...reserved.unpriced,
            ...paidOut.unpriced,
        ]),
    ];
    const usd = (value) => parseFloat(value.toFixed(2));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { balances: balanceList,
        summary: { currency: "USD",
            totalAvailableUSD: usd(available.total),
            totalPendingUSD: usd(pending.total),
            totalReservedUSD: usd(reserved.total),
            totalPaidOutUSD: usd(paidOut.total),
            unpricedCurrencies,
        },
        payoutSettings: { schedule: merchant.payoutSchedule,
            threshold: merchant.payoutThreshold,
            defaultCurrency: merchant.defaultCurrency,
        },
    };
};
