"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = { summary: "Get merchant dashboard",
    description: "Gets the current user's merchant account details and stats.",
    operationId: "getMerchantDashboard",
    tags: ["Gateway", "Merchant"],
    parameters: [
        { name: "mode",
            in: "query",
            description: "Filter by mode (LIVE or TEST)",
            required: false,
            schema: { type: "string",
                enum: ["LIVE", "TEST"],
            },
        },
    ],
    responses: { 200: { description: "Merchant dashboard data",
        },
        404: { description: "Merchant account not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get Merchant",
    demoMask: [
        "merchant.email",
        "merchant.phone",
        "merchant.webhookSecret",
        "recentPayments.customer.email",
    ],
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    const mode = query === null || query === void 0 ? void 0 : query.mode;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching merchant dashboard data");
    const merchant = await db_1.models.gatewayMerchant.findOne({ where: { userId: user.id },
    });
    if (!merchant) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Merchant account not found. Please register first.",
        });
    }
    const balances = await db_1.models.gatewayMerchantBalance.findAll({ where: { merchantId: merchant.id },
    });
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const isTestMode = mode === "TEST";
    const [paymentStats, recentPayments, refundStats] = await Promise.all([
        db_1.models.gatewayPayment.findAll({ where: { merchantId: merchant.id,
                status: "COMPLETED",
                testMode: isTestMode,
                completedAt: { [sequelize_1.Op.gte]: thirtyDaysAgo,
                },
            },
            attributes: [
                "currency",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalAmount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("feeAmount")), "totalFees"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("netAmount")), "totalNet"],
            ],
            group: ["currency"],
            raw: true, }),
        db_1.models.gatewayPayment.findAll({ where: { merchantId: merchant.id,
                testMode: isTestMode,
            },
            order: [["createdAt", "DESC"]],
            limit: 10,
            attributes: [
                "paymentIntentId",
                "merchantOrderId",
                "amount",
                "currency",
                "walletType",
                "feeAmount",
                "description",
                "status",
                "testMode",
                "createdAt",
                "completedAt",
            ],
            include: [
                { model: db_1.models.user,
                    as: "customer",
                    attributes: ["firstName", "lastName", "email", "avatar"], },
            ],
        }),
        db_1.models.gatewayRefund.findAll({ where: { merchantId: merchant.id,
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: thirtyDaysAgo,
                },
            },
            attributes: [
                [(0, sequelize_1.col)("gatewayRefund.currency"), "currency"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("gatewayRefund.amount")), "totalRefunded"],
            ],
            group: ["gatewayRefund.currency"],
            include: [
                { model: db_1.models.gatewayPayment,
                    as: "payment",
                    where: { testMode: isTestMode },
                    attributes: [], },
            ],
            raw: true, }),
    ]);
    const pendingRefundsCount = await db_1.models.gatewayRefund.count({ where: { merchantId: merchant.id,
            status: "PENDING",
        },
    });
    const paymentRows = paymentStats;
    const refundRows = refundStats;
    let paymentCount = 0;
    const amountByCurrency = {};
    const feesByCurrency = {};
    const netByCurrency = {};
    const refundedByCurrency = {};
    for (const row of paymentRows) {
        paymentCount += parseInt(row.count || "0") || 0;
        const currency = row.currency;
        if (!currency)
            continue;
        amountByCurrency[currency] = (amountByCurrency[currency] || 0) + (parseFloat(row.totalAmount || "0") || 0);
        feesByCurrency[currency] = (feesByCurrency[currency] || 0) + (parseFloat(row.totalFees || "0") || 0);
        netByCurrency[currency] = (netByCurrency[currency] || 0) + (parseFloat(row.totalNet || "0") || 0);
    }
    for (const row of refundRows) {
        const currency = row.currency;
        if (!currency)
            continue;
        const refunded = parseFloat(row.totalRefunded || "0") || 0;
        refundedByCurrency[currency] = (refundedByCurrency[currency] || 0) + refunded;
        netByCurrency[currency] = (netByCurrency[currency] || 0) - refunded;
    }
    const availableByCurrency = {};
    const pendingByCurrency = {};
    const reservedByCurrency = {};
    for (const b of balances) {
        availableByCurrency[b.currency] = (availableByCurrency[b.currency] || 0) + (Number(b.available) || 0);
        pendingByCurrency[b.currency] = (pendingByCurrency[b.currency] || 0) + (Number(b.pending) || 0);
        reservedByCurrency[b.currency] = (reservedByCurrency[b.currency] || 0) + (Number(b.reserved) || 0);
    }
    const [amountUSD, feesUSD, netUSD, refundedUSD, availableUSD, pendingUSD, reservedUSD] = await Promise.all([
        (0, utils_1.sumInUSD)(amountByCurrency),
        (0, utils_1.sumInUSD)(feesByCurrency),
        (0, utils_1.sumInUSD)(netByCurrency),
        (0, utils_1.sumInUSD)(refundedByCurrency),
        (0, utils_1.sumInUSD)(availableByCurrency),
        (0, utils_1.sumInUSD)(pendingByCurrency),
        (0, utils_1.sumInUSD)(reservedByCurrency),
    ]);
    const unpricedCurrencies = [
        ...new Set([
            ...amountUSD.unpriced,
            ...feesUSD.unpriced,
            ...netUSD.unpriced,
            ...refundedUSD.unpriced,
            ...availableUSD.unpriced,
            ...pendingUSD.unpriced,
            ...reservedUSD.unpriced,
        ]),
    ];
    const usd = (value) => parseFloat(value.toFixed(2));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { merchant: { id: merchant.id,
            name: merchant.name,
            slug: merchant.slug,
            email: merchant.email,
            phone: merchant.phone,
            logo: merchant.logo,
            website: merchant.website,
            businessType: merchant.businessType,
            description: merchant.description,
            address: merchant.address,
            city: merchant.city,
            state: merchant.state,
            country: merchant.country,
            postalCode: merchant.postalCode,
            status: merchant.status,
            verificationStatus: merchant.verificationStatus,
            testMode: merchant.testMode,
            webhookSecret: merchant.webhookSecret,
            createdAt: merchant.createdAt,
        },
        balances: balances.map((b) => ({ currency: b.currency,
            walletType: b.walletType,
            available: b.available,
            pending: b.pending,
            reserved: b.reserved,
        })),
        totalAvailableUSD: usd(availableUSD.total),
        totalPendingUSD: usd(pendingUSD.total),
        totalReservedUSD: usd(reservedUSD.total),
        stats: { last30Days: { paymentCount,
                totalAmountUSD: usd(amountUSD.total),
                totalRefundedUSD: usd(refundedUSD.total),
                totalFeesUSD: usd(feesUSD.total),
                totalNetUSD: usd(netUSD.total),
            },
            pendingRefunds: pendingRefundsCount,
        },
        unpricedCurrencies,
        recentPayments: recentPayments.map((p) => ({ id: p.paymentIntentId,
            orderId: p.merchantOrderId,
            amount: p.amount,
            currency: p.currency,
            walletType: p.walletType,
            feeAmount: p.feeAmount,
            description: p.description,
            status: p.status,
            customer: p.customer
                ? { name: `${p.customer.firstName || ""} ${p.customer.lastName || ""}`.trim() || p.customer.email,
                    email: p.customer.email,
                    avatar: p.customer.avatar,
                }
                : null,
            createdAt: p.createdAt,
            completedAt: p.completedAt,
        })),
        mode: mode || "LIVE", };
};
