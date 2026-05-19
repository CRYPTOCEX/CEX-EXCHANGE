"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = { summary: "Get available wallets for checkout",
    description: "Retrieves all user wallets that can be used for payment based on gateway settings. Returns wallet balances and exchange rates.",
    operationId: "getCheckoutWallets",
    tags: ["Gateway", "Checkout"],
    parameters: [
        { name: "paymentIntentId",
            in: "path",
            required: true,
            description: "Payment intent ID",
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Available wallets with balances and exchange rates",
        },
        401: { description: "Authentication required",
        },
        404: { description: "Payment not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get Checkout Wallets",
};
async function getPriceInUSD(currency, type) {
    try {
        if (type === "FIAT") {
            return await (0, utils_1.getFiatPriceInUSD)(currency);
        }
        else if (type === "SPOT") {
            return await (0, utils_1.getSpotPriceInUSD)(currency);
        }
        else if (type === "ECO") {
            return await (0, utils_1.getEcoPriceInUSD)(currency);
        }
        return 0;
    }
    catch (_a) {
        return 0;
    }
}
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { paymentIntentId } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401,
            message: "Authentication required",
        });
    }
    const payment = await db_1.models.gatewayPayment.findOne({ where: { paymentIntentId,
        },
        include: [
            { model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "status"],
            },
        ],
    });
    if (!payment) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Payment not found",
        });
    }
    if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
        throw (0, error_1.createError)({ statusCode: 400,
            message: `Payment is ${payment.status.toLowerCase()}`,
        });
    }
    if (new Date(payment.expiresAt) < new Date()) {
        throw (0, error_1.createError)({ statusCode: 400,
            message: "Payment session has expired",
        });
    }
    const gatewaySettings = await (0, gateway_1.getGatewaySettings)();
    const allowedWalletTypes = gatewaySettings.gatewayAllowedWalletTypes || {};
    const paymentPriceInUSD = await getPriceInUSD(payment.currency, payment.walletType);
    if (!paymentPriceInUSD || paymentPriceInUSD <= 0) {
        throw (0, error_1.createError)({ statusCode: 400,
            message: `Could not determine price for payment currency ${payment.currency}`,
        });
    }
    const allowedCombinations = [];
    for (const [walletType, config] of Object.entries(allowedWalletTypes)) {
        if (config && config.enabled && config.currencies) {
            for (const currency of config.currencies) {
                allowedCombinations.push({ type: walletType, currency });
            }
        }
    }
    if (allowedCombinations.length === 0) {
        allowedCombinations.push({ type: payment.walletType,
            currency: payment.currency,
        });
    }
    const wallets = await db_1.models.wallet.findAll({ where: { userId: user.id,
        },
        attributes: ["id", "type", "currency", "balance"],
    });
    const availableWallets = [];
    for (const wallet of wallets) {
        const isAllowed = allowedCombinations.some((combo) => combo.type === wallet.type && combo.currency === wallet.currency);
        if (!isAllowed)
            continue;
        const balance = parseFloat(String(wallet.balance));
        if (balance <= 0)
            continue;
        const walletPriceInUSD = await getPriceInUSD(wallet.currency, wallet.type);
        if (!walletPriceInUSD || walletPriceInUSD <= 0)
            continue;
        const exchangeRate = walletPriceInUSD / paymentPriceInUSD;
        const equivalentAmount = balance * exchangeRate;
        availableWallets.push({ id: wallet.id,
            type: wallet.type,
            currency: wallet.currency,
            balance,
            priceInUSD: walletPriceInUSD,
            exchangeRate,
            equivalentAmount,
            canCoverFull: equivalentAmount >= payment.amount,
        });
    }
    availableWallets.sort((a, b) => {
        const aExact = a.type === payment.walletType && a.currency === payment.currency;
        const bExact = b.type === payment.walletType && b.currency === payment.currency;
        if (aExact && !bExact)
            return -1;
        if (!aExact && bExact)
            return 1;
        if (a.canCoverFull && !b.canCoverFull)
            return -1;
        if (!a.canCoverFull && b.canCoverFull)
            return 1;
        return b.equivalentAmount - a.equivalentAmount;
    });
    const totalEquivalent = availableWallets.reduce((sum, w) => sum + w.equivalentAmount, 0);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { payment: { id: payment.paymentIntentId,
            amount: payment.amount,
            currency: payment.currency,
            walletType: payment.walletType,
            priceInUSD: paymentPriceInUSD,
        },
        wallets: availableWallets,
        canPayFull: totalEquivalent >= payment.amount,
        totalEquivalent,
        shortfall: Math.max(0, payment.amount - totalEquivalent),
    };
};
