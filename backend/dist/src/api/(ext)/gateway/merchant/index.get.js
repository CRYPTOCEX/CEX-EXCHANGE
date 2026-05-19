"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
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
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalAmount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("feeAmount")), "totalFees"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("netAmount")), "totalNet"],
            ],
            raw: true,
        }),
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
                    attributes: ["firstName", "lastName", "email", "avatar"],
                },
            ],
        }),
        db_1.models.gatewayRefund.findAll({ where: { merchantId: merchant.id,
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: thirtyDaysAgo,
                },
            },
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("gatewayRefund.amount")), "totalRefunded"],
            ],
            include: [
                { model: db_1.models.gatewayPayment,
                    as: "payment",
                    where: { testMode: isTestMode },
                    attributes: [],
                },
            ],
            raw: true,
        }),
    ]);
    const pendingRefundsCount = await db_1.models.gatewayRefund.count({ where: { merchantId: merchant.id,
            status: "PENDING",
        },
    });
    const stats = paymentStats[0] || {};
    const refunds = refundStats[0] || {};
    const totalAmount = parseFloat(stats.totalAmount || "0") || 0;
    const totalFees = parseFloat(stats.totalFees || "0") || 0;
    const totalRefunded = parseFloat(refunds.totalRefunded || "0") || 0;
    const totalNet = (parseFloat(stats.totalNet || "0") || 0) - totalRefunded;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { merchant: { id: merchant.id,
            name: merchant.name,
            slug: merchant.slug,
            email: merchant.email,
            phone: merchant.phone,
            logo: merchant.logo,
            website: merchant.website,
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
        stats: { last30Days: { paymentCount: parseInt(stats.count || "0") || 0,
                totalAmount,
                totalRefunded,
                totalFees,
                totalNet,
            },
            pendingRefunds: pendingRefundsCount,
        },
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
