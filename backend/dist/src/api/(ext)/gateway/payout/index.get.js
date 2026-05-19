"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = { summary: "List payouts",
    description: "Lists all payouts for the current merchant.",
    operationId: "listMerchantPayouts",
    tags: ["Gateway", "Merchant", "Payouts"],
    parameters: [
        { name: "status",
            in: "query",
            schema: { type: "string" },
        },
        { name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
        },
        { name: "perPage",
            in: "query",
            schema: { type: "integer", default: 10 },
        },
    ],
    responses: { 200: { description: "List of payouts",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get Payouts",
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
    if (query.status) {
        where.status = query.status;
    }
    const result = await (0, query_1.getFiltered)({ model: db_1.models.gatewayPayout,
        query,
        where,
        sortField: "createdAt",
        paranoid: false,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { items: result.items.map((p) => ({ id: p.payoutId,
            amount: p.amount,
            currency: p.currency,
            walletType: p.walletType,
            status: p.status,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
            grossAmount: p.grossAmount,
            feeAmount: p.feeAmount,
            netAmount: p.netAmount,
            paymentCount: p.paymentCount,
            refundCount: p.refundCount,
            createdAt: p.createdAt,
        })),
        pagination: result.pagination, };
};
