"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = { summary: "List payments",
    description: "Lists all payments for the current merchant.",
    operationId: "listMerchantPayments",
    tags: ["Gateway", "Merchant", "Payments"],
    parameters: [
        { name: "mode",
            in: "query",
            description: "Filter by mode (LIVE or TEST)",
            schema: { type: "string",
                enum: ["LIVE", "TEST"],
            },
        },
        { name: "status",
            in: "query",
            schema: { type: "string" },
            description: "Filter by status",
        },
        { name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
        },
        { name: "perPage",
            in: "query",
            schema: { type: "integer", default: 10 },
        },
        { name: "sortField",
            in: "query",
            schema: { type: "string", default: "createdAt" },
        },
        { name: "sortOrder",
            in: "query",
            schema: { type: "string", default: "desc" },
        },
    ],
    responses: { 200: { description: "List of payments",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get Payments",
    demoMask: ["items.customerEmail"],
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
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
    const where = { merchantId: merchant.id };
    const mode = query.mode;
    where.testMode = mode === "TEST";
    if (query.status) {
        where.status = query.status;
    }
    const result = await (0, query_1.getFiltered)({ model: db_1.models.gatewayPayment,
        query,
        where,
        sortField: query.sortField || "createdAt",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { items: result.items.map((p) => ({ id: p.paymentIntentId,
            orderId: p.merchantOrderId,
            amount: p.amount,
            currency: p.currency,
            walletType: p.walletType,
            feeAmount: p.feeAmount,
            netAmount: p.netAmount,
            status: p.status,
            customerEmail: p.customerEmail,
            customerName: p.customerName,
            testMode: p.testMode,
            createdAt: p.createdAt,
            completedAt: p.completedAt,
        })),
        pagination: result.pagination, };
};
